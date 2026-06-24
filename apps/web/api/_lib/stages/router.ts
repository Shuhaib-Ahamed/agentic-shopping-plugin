// Stage 1: Router / Analyzer.
//
// Cheap-model classifier. Output is JSON only, no shopper-facing text, no
// tools. Decides whether the rest of the pipeline needs to fetch data
// (Stage 2) before producing a reply (Stage 3).

import type { ChatMessage } from "@kapruka/protocol";
import { z } from "zod";
import { env } from "../env.js";
import type { Logger } from "../log.js";
import { modelClient, stageModel, type ChatMessageItem } from "../openai.js";
import { buildRouterSystem } from "../promptSlices.js";
import { renderBriefBlock, renderStateBlock, type SessionState } from "../sessionState.js";

export const RouteSchema = z.enum([
  "greeting",
  "smalltalk",
  "clarify",
  "search",
  "product_detail",
  "cart_update",
  "delivery",
  "checkout",
  "track_order",
  "gift_message",
  "out_of_scope",
  "unsafe",
]);
export type Route = z.infer<typeof RouteSchema>;

export const SafetyFlagSchema = z.enum([
  "none",
  "injection_detected",
  "sensitive_request",
  "out_of_scope",
]);

/**
 * Distilled shopper intent extracted by the router each turn. Merged into
 * session.shopperBrief by the orchestrator. Nulls mean "no change" so a quiet
 * turn never wipes an earlier-stated value. Arrays are additive only.
 *
 * Stays inline in the routing JSON to keep the brief on the same LLM call as
 * the route, avoiding a separate summarizer round-trip.
 */
export const ShopperBriefDeltaSchema = z.object({
  recipient: z.string().nullable(),
  occasion: z.string().nullable(),
  budget: z.string().nullable(),
  preferences: z.array(z.string()),
  rejected_skus: z.array(z.string()),
  language: z.string().nullable(),
});
export type ShopperBriefDeltaWire = z.infer<typeof ShopperBriefDeltaSchema>;

export const RoutingDecisionSchema = z.object({
  in_scope: z.boolean(),
  needs_tools: z.boolean(),
  route: RouteSchema,
  intent_summary: z.string(),
  missing_info: z.array(z.string()),
  safety_flag: SafetyFlagSchema,
  direct_reply_hint: z.string().nullable(),
  brief_delta: ShopperBriefDeltaSchema,
});
export type RoutingDecision = z.infer<typeof RoutingDecisionSchema>;

export const EMPTY_BRIEF_DELTA: ShopperBriefDeltaWire = {
  recipient: null,
  occasion: null,
  budget: null,
  preferences: [],
  rejected_skus: [],
  language: null,
};

/**
 * JSON Schema mirroring RoutingDecisionSchema for OpenAI Structured Outputs.
 * Strict mode requires every property in `required` and additionalProperties
 * false on every object; nullable strings use ["string", "null"]. Keeping this
 * in lockstep with the zod schema removes the parse-retry round-trip on
 * provider/model combos that support strict json_schema.
 */
const ROUTING_DECISION_JSON_SCHEMA = {
  name: "RoutingDecision",
  strict: true as const,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      in_scope: { type: "boolean" },
      needs_tools: { type: "boolean" },
      route: {
        type: "string",
        enum: [
          "greeting",
          "smalltalk",
          "clarify",
          "search",
          "product_detail",
          "cart_update",
          "delivery",
          "checkout",
          "track_order",
          "gift_message",
          "out_of_scope",
          "unsafe",
        ],
      },
      intent_summary: { type: "string" },
      missing_info: { type: "array", items: { type: "string" } },
      safety_flag: {
        type: "string",
        enum: ["none", "injection_detected", "sensitive_request", "out_of_scope"],
      },
      direct_reply_hint: { type: ["string", "null"] },
      brief_delta: {
        type: "object",
        additionalProperties: false,
        properties: {
          recipient: { type: ["string", "null"] },
          occasion: { type: ["string", "null"] },
          budget: { type: ["string", "null"] },
          preferences: { type: "array", items: { type: "string" } },
          rejected_skus: { type: "array", items: { type: "string" } },
          language: { type: ["string", "null"] },
        },
        required: ["recipient", "occasion", "budget", "preferences", "rejected_skus", "language"],
      },
    },
    required: [
      "in_scope",
      "needs_tools",
      "route",
      "intent_summary",
      "missing_info",
      "safety_flag",
      "direct_reply_hint",
      "brief_delta",
    ],
  },
} as const;

const NEEDS_TOOLS_ROUTES = new Set<Route>([
  "search",
  "product_detail",
  "cart_update",
  "delivery",
  "checkout",
  "track_order",
  "gift_message",
]);

const FALLBACK: RoutingDecision = {
  in_scope: true,
  needs_tools: true,
  route: "search",
  intent_summary: "router fallback after JSON parse failure",
  missing_info: [],
  safety_flag: "none",
  direct_reply_hint: null,
  brief_delta: EMPTY_BRIEF_DELTA,
};

interface RouteInput {
  recent: ChatMessage[];
  session: SessionState;
  log: Logger;
}

export async function routeTurn({ recent, session, log }: RouteInput): Promise<RoutingDecision> {
  const system = await buildRouterSystem();
  const stateBlock = renderStateBlock(session);
  const briefBlock = renderBriefBlock(session);
  // Static system first, then recent messages, then dynamic blocks last. Keeps
  // the static prefix byte-identical turn to turn so the provider prompt cache
  // can hit (OpenAI's automatic cache needs ~1024 stable prefix tokens; this
  // ordering means even older recent turns extend the cacheable prefix).
  const baseMessages: ChatMessageItem[] = [
    { role: "system", content: system },
    ...recent.map((m) => ({ role: m.role, content: m.content }) as ChatMessageItem),
    { role: "system", content: stateBlock },
    ...(briefBlock ? [{ role: "system" as const, content: briefBlock }] : []),
  ];

  const model = stageModel("router");
  const client = modelClient();
  const t0 = Date.now();

  // First attempt.
  let parsed = await attempt(client, model, baseMessages, log, "router.first");
  if (parsed) {
    parsed = normalize(parsed);
    log.info("router.decided", { durationMs: Date.now() - t0, ...parsed });
    return parsed;
  }

  // One retry with a stricter prompt.
  const stricter: ChatMessageItem[] = [
    ...baseMessages,
    {
      role: "system",
      content:
        "Your previous response was not valid JSON. Reply with ONLY a single JSON object, no markdown, no commentary, no fences.",
    },
  ];
  parsed = await attempt(client, model, stricter, log, "router.retry");
  if (parsed) {
    parsed = normalize(parsed);
    log.info("router.decided", { durationMs: Date.now() - t0, retried: true, ...parsed });
    return parsed;
  }

  log.warn("router.fallback", { durationMs: Date.now() - t0 });
  return FALLBACK;
}

async function attempt(
  client: ReturnType<typeof modelClient>,
  model: string,
  messages: ChatMessageItem[],
  log: Logger,
  label: string,
): Promise<RoutingDecision | null> {
  try {
    // OpenAI gpt-5 family supports strict Structured Outputs which guarantees
    // schema-valid JSON and removes the parse-retry round-trip. Gemini's
    // OpenAI-compatible endpoint does not reliably accept strict json_schema,
    // so we fall back to json_object there. RoutingDecisionSchema still
    // validates the parsed payload as a defense-in-depth check.
    const useStrict = env().MODEL_PROVIDER === "openai";
    const responseFormat = useStrict
      ? ({ type: "json_schema", json_schema: ROUTING_DECISION_JSON_SCHEMA } as const)
      : ({ type: "json_object" } as const);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK union types are wider than our subset
    const response: any = await client.chat.completions.create({
      model,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ChatMessageItem matches SDK subset
      messages: messages as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK union narrows by literal
      response_format: responseFormat as any,
      // gpt-5 reasoning models default to high reasoning effort which adds tens of seconds per call;
      // routing is a cheap JSON classification, so cap it at minimal.
      reasoning_effort: "minimal",
      // The routing JSON is small. Capping the completion budget cuts the
      // tail end of generation when the model gets verbose.
      max_completion_tokens: 256,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reasoning_effort is a gpt-5 runtime param not in SDK typings yet
    } as any);
    const text: string = response.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      log.warn(`${label}.empty`);
      return null;
    }
    const json = safeParse(text);
    if (json === null) {
      log.warn(`${label}.badJson`, { preview: text.slice(0, 200) });
      return null;
    }
    const parsed = RoutingDecisionSchema.safeParse(json);
    if (!parsed.success) {
      log.warn(`${label}.schemaMismatch`, {
        issues: parsed.error.issues.slice(0, 3),
        raw: text.slice(0, 200),
      });
      return null;
    }
    return parsed.data;
  } catch (err) {
    log.error(`${label}.error`, { error: (err as Error).message });
    return null;
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Strip markdown fences if the model wrapped JSON in ```json ... ```.
    const stripped = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    try {
      return JSON.parse(stripped);
    } catch {
      return null;
    }
  }
}

/**
 * Enforce the contract: routes that need real data flip needs_tools=true,
 * routes that cannot need data flip it to false, regardless of what the
 * model decided. Stops cheap-router drift from breaking the pipeline.
 */
function normalize(d: RoutingDecision): RoutingDecision {
  if (d.safety_flag === "out_of_scope") d.in_scope = false;
  if (NEEDS_TOOLS_ROUTES.has(d.route)) d.needs_tools = true;
  if (d.route === "greeting" || d.route === "smalltalk" || d.route === "clarify") {
    d.needs_tools = false;
  }
  if (d.route === "out_of_scope" || d.route === "unsafe") {
    d.needs_tools = false;
    d.in_scope = false;
  }
  return d;
}

export function renderRoutingBlock(d: RoutingDecision): string {
  return [
    '<ROUTING note="Stage 1 classification. Trusted internal context.">',
    JSON.stringify(d),
    "</ROUTING>",
  ].join("\n");
}
