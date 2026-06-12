// Stage 1: Router / Analyzer.
//
// Cheap-model classifier. Output is JSON only, no shopper-facing text, no
// tools. Decides whether the rest of the pipeline needs to fetch data
// (Stage 2) before producing a reply (Stage 3).

import { z } from "zod";
import type { ChatMessage } from "@kapruka/protocol";
import { modelClient, stageModel, type ChatMessageItem } from "../openai";
import { buildRouterSystem } from "../promptSlices";
import { renderStateBlock, type SessionState } from "../sessionState";
import type { Logger } from "../log";

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

export const RoutingDecisionSchema = z.object({
  in_scope: z.boolean(),
  needs_tools: z.boolean(),
  route: RouteSchema,
  intent_summary: z.string(),
  missing_info: z.array(z.string()),
  safety_flag: SafetyFlagSchema,
  direct_reply_hint: z.string().nullable(),
});
export type RoutingDecision = z.infer<typeof RoutingDecisionSchema>;

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
};

interface RouteInput {
  recent: ChatMessage[];
  session: SessionState;
  log: Logger;
}

export async function routeTurn({ recent, session, log }: RouteInput): Promise<RoutingDecision> {
  const system = await buildRouterSystem();
  const stateBlock = renderStateBlock(session);
  const baseMessages: ChatMessageItem[] = [
    { role: "system", content: system },
    { role: "system", content: stateBlock },
    ...recent.map((m) => ({ role: m.role, content: m.content }) as ChatMessageItem),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK union types are wider than our subset
    const response: any = await client.chat.completions.create({
      model,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ChatMessageItem matches SDK subset
      messages: messages as any,
      temperature: 0,
      response_format: { type: "json_object" },
    });
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
    "<ROUTING note=\"Stage 1 classification. Trusted internal context.\">",
    JSON.stringify(d),
    "</ROUTING>",
  ].join("\n");
}
