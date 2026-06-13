// Deterministic in-memory seed used when MONGODB_URI is absent (or for the
// demo). Twelve sessions, ~50 turns, realistic mix of locales, models, and
// outcomes. Numbers chosen so the overview charts look believable at a glance.
//
// Keep this module pure: no Date.now(), no random. Times are anchored to a
// fixed ISO base so screenshots and tests stay stable.

import type {
  SessionRecord,
  StepRecord,
  ToolCallRecord,
  TurnRecord,
  TurnOutcome,
} from "@kapruka/protocol";
import { TOKENS_PER_MILLION } from "./constants";
import { PRICING } from "./pricing";

const BASE_ISO = "2026-06-13T08:00:00.000Z";
const PROMPT_VERSION = "v_3a7c91f";

function isoOffset(minutes: number): string {
  return new Date(new Date(BASE_ISO).getTime() + minutes * 60_000).toISOString();
}

function costFromUsage(
  model: string,
  usage: {
    input: number;
    cachedInput: number;
    output: number;
    reasoning: number;
  },
) {
  const p = PRICING.find((r) => r.model === model) ?? PRICING[0]!;
  const input = (usage.input / TOKENS_PER_MILLION) * p.inputPer1M;
  const cachedInput = (usage.cachedInput / TOKENS_PER_MILLION) * p.cachedInputPer1M;
  const output = (usage.output / TOKENS_PER_MILLION) * p.outputPer1M;
  const reasoning = (usage.reasoning / TOKENS_PER_MILLION) * p.reasoningPer1M;
  const total = input + cachedInput + output + reasoning;
  return { input, cachedInput, output, reasoning, total };
}

type StepSpec = {
  model: string;
  input: number;
  cachedInput: number;
  output: number;
  reasoning: number;
  ttftMs: number;
  totalMs: number;
  finishReason: "stop" | "tool_calls" | "length";
  toolsSent: string[];
  toolCalls: ToolCallRecord[];
  rawOutputSummary?: string;
};

function makeStep(spec: StepSpec, index: number): StepRecord {
  const usage = {
    input: spec.input,
    cachedInput: spec.cachedInput,
    output: spec.output,
    reasoning: spec.reasoning,
    total: spec.input + spec.cachedInput + spec.output + spec.reasoning,
  };
  const cost = costFromUsage(spec.model, spec);
  return {
    index,
    model: spec.model,
    params: { temperature: 0.4, maxOutputTokens: 1024, toolsSent: spec.toolsSent },
    usage,
    cost,
    latency: { ttftMs: spec.ttftMs, totalMs: spec.totalMs },
    finishReason: spec.finishReason,
    toolCalls: spec.toolCalls,
    rawOutputSummary: spec.rawOutputSummary,
  };
}

function tool(partial: Omit<ToolCallRecord, "id"> & { id?: string }, id: string): ToolCallRecord {
  return { ...partial, id: partial.id ?? id };
}

interface TurnSpec {
  index: number;
  inputText: string;
  finalMessage?: string;
  steps: StepSpec[];
  emitted: Array<{ type: string; offsetMs: number; payloadSummary: string }>;
  outcome: TurnOutcome;
  flags?: Partial<TurnRecord["flags"]>;
  durationMs: number;
  errors?: TurnRecord["errors"];
}

function buildTurn(
  sessionId: string,
  startMinute: number,
  locale: TurnRecord["locale"],
  spec: TurnSpec,
): TurnRecord {
  const steps = spec.steps.map((s, i) => makeStep(s, i));
  const usage = steps.reduce(
    (acc, s) => ({
      input: acc.input + s.usage.input,
      cachedInput: acc.cachedInput + s.usage.cachedInput,
      output: acc.output + s.usage.output,
      reasoning: acc.reasoning + s.usage.reasoning,
      total: acc.total + s.usage.total,
    }),
    { input: 0, cachedInput: 0, output: 0, reasoning: 0, total: 0 },
  );
  const cost = steps.reduce(
    (acc, s) => ({
      input: acc.input + s.cost.input,
      cachedInput: acc.cachedInput + s.cost.cachedInput,
      output: acc.output + s.cost.output,
      reasoning: acc.reasoning + s.cost.reasoning,
      total: acc.total + s.cost.total,
    }),
    { input: 0, cachedInput: 0, output: 0, reasoning: 0, total: 0 },
  );
  const toolCalls = steps.reduce((n, s) => n + s.toolCalls.length, 0);
  const createdAt = isoOffset(startMinute);
  const completedAt = isoOffset(startMinute + spec.durationMs / 60_000);
  return {
    turnId: `trn_${sessionId.slice(4, 12)}_${spec.index}`,
    sessionId,
    index: spec.index,
    createdAt,
    completedAt,
    durationMs: spec.durationMs,
    promptVersion: PROMPT_VERSION,
    model: steps[0]?.model ?? "gpt-5.1-mini",
    locale,
    currency: "LKR",
    input: { kind: "text", text: spec.inputText },
    steps,
    emittedEvents: spec.emitted.map((e) => ({
      type: e.type,
      at: new Date(new Date(createdAt).getTime() + e.offsetMs).toISOString(),
      payloadSummary: e.payloadSummary,
    })),
    finalMessage: spec.finalMessage,
    outcome: spec.outcome,
    totals: { usage, cost, toolCalls },
    errors: spec.errors ?? [],
    flags: {
      hallucinationSuspected: false,
      schemaValidationFailed: false,
      refused: false,
      retried: false,
      ...spec.flags,
    },
  };
}

// -----------------------------------------------------------------------------
// Specific session scripts. Each session is a believable shopper journey.
// -----------------------------------------------------------------------------

function birthdayCakeGalleSession(idx: number): {
  session: SessionRecord;
  turns: TurnRecord[];
} {
  const sessionId = `ses_01HV2NA9C3KX${idx.toString().padStart(2, "0")}`;
  const startMin = idx * 90;
  const turns: TurnRecord[] = [
    buildTurn(sessionId, startMin, "en", {
      index: 0,
      inputText: "Need a birthday cake to Galle on Friday",
      finalMessage: "Lovely. Let me check what we have for Friday delivery in Galle.",
      durationMs: 1200,
      steps: [
        {
          model: "gpt-5.1-mini",
          input: 1302,
          cachedInput: 412,
          output: 128,
          reasoning: 0,
          ttftMs: 380,
          totalMs: 720,
          finishReason: "tool_calls",
          toolsSent: ["kapruka.search_products", "present_options"],
          toolCalls: [
            tool(
              {
                kind: "mcp",
                name: "kapruka.search_products",
                argsSummary: 'q="birthday cake", limit=8, locale=en',
                argsRedacted: { q: "birthday cake", limit: 8, locale: "en" },
                resultSummary: "8 results, top 4 shown",
                httpStatus: 200,
                rateLimitRemaining: 98,
                cacheHit: false,
                latencyMs: 320,
              },
              "tc_search_01",
            ),
          ],
        },
        {
          model: "gpt-5.1-mini",
          input: 1480,
          cachedInput: 0,
          output: 96,
          reasoning: 0,
          ttftMs: 220,
          totalMs: 480,
          finishReason: "stop",
          toolsSent: ["present_products"],
          toolCalls: [
            tool(
              {
                kind: "ui",
                name: "present_products",
                argsSummary: "4 cakes, carousel",
                latencyMs: 18,
              },
              "tc_ui_01",
            ),
          ],
        },
      ],
      emitted: [
        { type: "status", offsetMs: 40, payloadSummary: "searching" },
        { type: "products", offsetMs: 920, payloadSummary: "4 cakes (carousel)" },
        { type: "message", offsetMs: 1080, payloadSummary: "53 chars" },
      ],
      outcome: "viewed_product",
    }),
    buildTurn(sessionId, startMin + 1, "en", {
      index: 1,
      inputText: "The second one. Deliver Friday.",
      finalMessage:
        "Quoting delivery to Galle for 12 June. Fragile item, please confirm a contact.",
      durationMs: 1820,
      steps: [
        {
          model: "gpt-5.1-mini",
          input: 1820,
          cachedInput: 980,
          output: 142,
          reasoning: 0,
          ttftMs: 320,
          totalMs: 980,
          finishReason: "tool_calls",
          toolsSent: ["kapruka.quote_delivery", "request_info"],
          toolCalls: [
            tool(
              {
                kind: "mcp",
                name: "kapruka.quote_delivery",
                argsSummary: 'city="Galle", date="2026-06-12", perishable=true',
                resultSummary: "rate LKR 850, perishableWarning shown",
                httpStatus: 200,
                rateLimitRemaining: 97,
                cacheHit: false,
                latencyMs: 540,
              },
              "tc_quote_01",
            ),
          ],
        },
        {
          model: "gpt-5.1-mini",
          input: 1980,
          cachedInput: 0,
          output: 110,
          reasoning: 0,
          ttftMs: 240,
          totalMs: 540,
          finishReason: "stop",
          toolsSent: ["request_info"],
          toolCalls: [
            tool(
              {
                kind: "ui",
                name: "request_info",
                argsSummary: "delivery form, 5 fields",
                latencyMs: 14,
              },
              "tc_ui_02",
            ),
          ],
        },
      ],
      emitted: [
        { type: "status", offsetMs: 60, payloadSummary: "checking" },
        { type: "delivery_quote", offsetMs: 1100, payloadSummary: "Galle, 2026-06-12, LKR 850" },
        { type: "request_info", offsetMs: 1280, payloadSummary: "delivery form" },
      ],
      outcome: "added_to_cart",
    }),
    buildTurn(sessionId, startMin + 4, "en", {
      index: 2,
      inputText:
        "Delivery details: name=Priya; phone=0771234567; city=Galle; line1=12 Lighthouse Rd",
      finalMessage: "Got it. Generating a pay link for LKR 5,850 including delivery.",
      durationMs: 2140,
      steps: [
        {
          model: "gpt-5.1-mini",
          input: 2210,
          cachedInput: 1340,
          output: 168,
          reasoning: 0,
          ttftMs: 280,
          totalMs: 1240,
          finishReason: "tool_calls",
          toolsSent: ["kapruka.create_checkout", "present_checkout"],
          toolCalls: [
            tool(
              {
                kind: "mcp",
                name: "kapruka.create_checkout",
                argsSummary: "lines=1, recipient=Priya, delivery=Galle",
                resultSummary: "orderId KP-209814, payUrl ok, expires 15 min",
                httpStatus: 200,
                rateLimitRemaining: 96,
                cacheHit: false,
                latencyMs: 740,
              },
              "tc_checkout_01",
            ),
          ],
        },
        {
          model: "gpt-5.1-mini",
          input: 2380,
          cachedInput: 0,
          output: 140,
          reasoning: 0,
          ttftMs: 260,
          totalMs: 620,
          finishReason: "stop",
          toolsSent: ["present_checkout"],
          toolCalls: [
            tool(
              {
                kind: "ui",
                name: "present_checkout",
                argsSummary: "checkout panel",
                latencyMs: 22,
              },
              "tc_ui_03",
            ),
          ],
        },
      ],
      emitted: [
        { type: "status", offsetMs: 60, payloadSummary: "creating" },
        { type: "checkout", offsetMs: 1600, payloadSummary: "KP-209814, LKR 5,850" },
      ],
      outcome: "checkout_created",
    }),
    buildTurn(sessionId, startMin + 9, "en", {
      index: 3,
      inputText: "I just paid for order KP-209814.",
      finalMessage: "Payment received. Order KP-209814 is on its way to Galle for Friday.",
      durationMs: 980,
      steps: [
        {
          model: "gpt-5.1-mini",
          input: 2490,
          cachedInput: 1860,
          output: 92,
          reasoning: 0,
          ttftMs: 220,
          totalMs: 720,
          finishReason: "tool_calls",
          toolsSent: ["kapruka.track_order", "order_confirmed"],
          toolCalls: [
            tool(
              {
                kind: "mcp",
                name: "kapruka.track_order",
                argsSummary: "orderId=KP-209814",
                resultSummary: "status=paid",
                httpStatus: 200,
                cacheHit: true,
                latencyMs: 180,
              },
              "tc_track_01",
            ),
            tool(
              {
                kind: "ui",
                name: "order_confirmed",
                argsSummary: "success card",
                latencyMs: 12,
              },
              "tc_ui_04",
            ),
          ],
        },
      ],
      emitted: [
        { type: "status", offsetMs: 40, payloadSummary: "tracking" },
        { type: "order_confirmed", offsetMs: 760, payloadSummary: "KP-209814 paid" },
      ],
      outcome: "paid",
    }),
  ];
  const totals = turns.reduce(
    (acc, t) => ({
      turns: acc.turns + 1,
      tokens: acc.tokens + t.totals.usage.total,
      costUSD: acc.costUSD + t.totals.cost.total,
      toolCalls: acc.toolCalls + t.totals.toolCalls,
      durationMs: acc.durationMs + t.durationMs,
    }),
    { turns: 0, tokens: 0, costUSD: 0, toolCalls: 0, durationMs: 0 },
  );
  const session: SessionRecord = {
    sessionId,
    startedAt: turns[0]!.createdAt,
    lastSeenAt: turns[turns.length - 1]!.completedAt,
    locale: "en",
    currency: "LKR",
    device: idx % 3 === 0 ? "mobile" : "desktop",
    userAgentShort: idx % 3 === 0 ? "iOS Safari" : "macOS Chrome",
    referrer: idx % 2 === 0 ? "https://kapruka.com/" : undefined,
    country: "LK",
    totals,
    funnel: {
      searched: true,
      viewedProduct: true,
      addedToCart: true,
      startedCheckout: true,
      paid: true,
    },
    outcome: "paid",
  };
  return { session, turns };
}

function flowersBrowsingSession(idx: number): {
  session: SessionRecord;
  turns: TurnRecord[];
} {
  const sessionId = `ses_01HV2NB7K2LM${idx.toString().padStart(2, "0")}`;
  const startMin = 200 + idx * 60;
  const turns: TurnRecord[] = [
    buildTurn(sessionId, startMin, "si", {
      index: 0,
      inputText: "මට මගේ අම්මාට මල් කලඹක් යවන්න ඕන",
      finalMessage: "ලස්සන. කොළඹට යවන්න මේ මල් කලඹවල් තියනවා.",
      durationMs: 1480,
      steps: [
        {
          model: "gpt-5.1-mini",
          input: 1402,
          cachedInput: 380,
          output: 158,
          reasoning: 0,
          ttftMs: 360,
          totalMs: 880,
          finishReason: "tool_calls",
          toolsSent: ["kapruka.search_products"],
          toolCalls: [
            tool(
              {
                kind: "mcp",
                name: "kapruka.search_products",
                argsSummary: 'q="flower bouquet", limit=6, locale=si',
                resultSummary: "6 bouquets, top 3 shown",
                httpStatus: 200,
                cacheHit: false,
                latencyMs: 280,
              },
              "tc_search_02",
            ),
          ],
        },
        {
          model: "gpt-5.1-mini",
          input: 1604,
          cachedInput: 0,
          output: 92,
          reasoning: 0,
          ttftMs: 200,
          totalMs: 460,
          finishReason: "stop",
          toolsSent: ["present_products"],
          toolCalls: [
            tool(
              { kind: "ui", name: "present_products", argsSummary: "3 bouquets", latencyMs: 16 },
              "tc_ui_05",
            ),
          ],
        },
      ],
      emitted: [
        { type: "status", offsetMs: 60, payloadSummary: "searching" },
        { type: "products", offsetMs: 1120, payloadSummary: "3 bouquets" },
        { type: "message", offsetMs: 1280, payloadSummary: "48 chars (si)" },
      ],
      outcome: "viewed_product",
    }),
    buildTurn(sessionId, startMin + 3, "si", {
      index: 1,
      inputText: "මේ අතරෙන් ලාභම මොකක්ද?",
      finalMessage: "Roses Mini bouquet is the cheapest at LKR 2,500 plus delivery.",
      durationMs: 1100,
      steps: [
        {
          model: "gpt-5.1-mini",
          input: 1620,
          cachedInput: 1080,
          output: 88,
          reasoning: 0,
          ttftMs: 280,
          totalMs: 1100,
          finishReason: "stop",
          toolsSent: ["present_options"],
          toolCalls: [
            tool(
              { kind: "ui", name: "present_options", argsSummary: "3 chips", latencyMs: 14 },
              "tc_ui_06",
            ),
          ],
        },
      ],
      emitted: [
        { type: "status", offsetMs: 40, payloadSummary: "composing" },
        { type: "message", offsetMs: 720, payloadSummary: "62 chars" },
        { type: "options", offsetMs: 860, payloadSummary: "3 chips" },
      ],
      outcome: "browsing",
      flags: { hallucinationSuspected: true },
    }),
  ];
  const totals = turns.reduce(
    (acc, t) => ({
      turns: acc.turns + 1,
      tokens: acc.tokens + t.totals.usage.total,
      costUSD: acc.costUSD + t.totals.cost.total,
      toolCalls: acc.toolCalls + t.totals.toolCalls,
      durationMs: acc.durationMs + t.durationMs,
    }),
    { turns: 0, tokens: 0, costUSD: 0, toolCalls: 0, durationMs: 0 },
  );
  return {
    session: {
      sessionId,
      startedAt: turns[0]!.createdAt,
      lastSeenAt: turns[turns.length - 1]!.completedAt,
      locale: "si",
      currency: "LKR",
      device: "mobile",
      userAgentShort: "Android Chrome",
      country: "LK",
      totals,
      funnel: {
        searched: true,
        viewedProduct: true,
        addedToCart: false,
        startedCheckout: false,
        paid: false,
      },
      outcome: "browsing",
    },
    turns,
  };
}

function erroredCheckoutSession(idx: number): {
  session: SessionRecord;
  turns: TurnRecord[];
} {
  const sessionId = `ses_01HV2NC8P9QR${idx.toString().padStart(2, "0")}`;
  const startMin = 380 + idx * 75;
  const turns: TurnRecord[] = [
    buildTurn(sessionId, startMin, "ta", {
      index: 0,
      inputText: "எனக்கு ஒரு பிறந்தநாள் கேக் கொழும்புக்கு வேண்டும்",
      finalMessage: "Sure. Here are four birthday cakes available for Colombo delivery.",
      durationMs: 1340,
      steps: [
        {
          model: "gpt-4.1-nano",
          input: 1180,
          cachedInput: 220,
          output: 120,
          reasoning: 0,
          ttftMs: 290,
          totalMs: 820,
          finishReason: "tool_calls",
          toolsSent: ["kapruka.search_products"],
          toolCalls: [
            tool(
              {
                kind: "mcp",
                name: "kapruka.search_products",
                argsSummary: 'q="birthday cake", locale=ta, city=Colombo',
                resultSummary: "12 results, top 4 shown",
                httpStatus: 200,
                cacheHit: true,
                latencyMs: 110,
              },
              "tc_search_03",
            ),
          ],
        },
        {
          model: "gpt-4.1-nano",
          input: 1420,
          cachedInput: 0,
          output: 88,
          reasoning: 0,
          ttftMs: 240,
          totalMs: 520,
          finishReason: "stop",
          toolsSent: ["present_products"],
          toolCalls: [
            tool(
              { kind: "ui", name: "present_products", argsSummary: "4 cakes", latencyMs: 18 },
              "tc_ui_07",
            ),
          ],
        },
      ],
      emitted: [{ type: "products", offsetMs: 1020, payloadSummary: "4 cakes" }],
      outcome: "viewed_product",
    }),
    buildTurn(sessionId, startMin + 4, "ta", {
      index: 1,
      inputText: "first one, please. tomorrow delivery.",
      durationMs: 2880,
      steps: [
        {
          model: "gpt-4.1-nano",
          input: 1610,
          cachedInput: 920,
          output: 138,
          reasoning: 0,
          ttftMs: 320,
          totalMs: 1280,
          finishReason: "tool_calls",
          toolsSent: ["kapruka.create_checkout"],
          toolCalls: [
            tool(
              {
                kind: "mcp",
                name: "kapruka.create_checkout",
                argsSummary: "lines=1, recipient=missing",
                resultSummary: "schema validation failed",
                httpStatus: 422,
                cacheHit: false,
                latencyMs: 920,
                error: {
                  code: "schema_invalid",
                  message: "recipient.phone is required",
                  recoverable: true,
                },
              },
              "tc_checkout_02",
            ),
          ],
        },
        {
          model: "gpt-4.1-nano",
          input: 1740,
          cachedInput: 0,
          output: 104,
          reasoning: 0,
          ttftMs: 260,
          totalMs: 1600,
          finishReason: "stop",
          toolsSent: ["request_info"],
          toolCalls: [
            tool(
              {
                kind: "ui",
                name: "request_info",
                argsSummary: "delivery form, 5 fields",
                latencyMs: 16,
              },
              "tc_ui_08",
            ),
          ],
        },
      ],
      emitted: [
        { type: "error", offsetMs: 1320, payloadSummary: "schema_invalid, recoverable" },
        { type: "request_info", offsetMs: 1480, payloadSummary: "delivery form" },
      ],
      outcome: "errored",
      flags: { schemaValidationFailed: true, retried: true },
      errors: [
        { code: "schema_invalid", message: "recipient.phone is required", recoverable: true },
      ],
    }),
  ];
  const totals = turns.reduce(
    (acc, t) => ({
      turns: acc.turns + 1,
      tokens: acc.tokens + t.totals.usage.total,
      costUSD: acc.costUSD + t.totals.cost.total,
      toolCalls: acc.toolCalls + t.totals.toolCalls,
      durationMs: acc.durationMs + t.durationMs,
    }),
    { turns: 0, tokens: 0, costUSD: 0, toolCalls: 0, durationMs: 0 },
  );
  return {
    session: {
      sessionId,
      startedAt: turns[0]!.createdAt,
      lastSeenAt: turns[turns.length - 1]!.completedAt,
      locale: "ta",
      currency: "LKR",
      device: "desktop",
      userAgentShort: "Windows Edge",
      country: "LK",
      totals,
      funnel: {
        searched: true,
        viewedProduct: true,
        addedToCart: false,
        startedCheckout: false,
        paid: false,
      },
      outcome: "errored",
    },
    turns,
  };
}

function quickBrowseSession(idx: number): {
  session: SessionRecord;
  turns: TurnRecord[];
} {
  const sessionId = `ses_01HV2ND5X4YZ${idx.toString().padStart(2, "0")}`;
  const startMin = 540 + idx * 50;
  const turns: TurnRecord[] = [
    buildTurn(sessionId, startMin, "en", {
      index: 0,
      inputText: "show me anniversary gifts under 5000",
      finalMessage: "Here are six anniversary gifts under LKR 5,000.",
      durationMs: 980,
      steps: [
        {
          model: "gpt-5.1-mini",
          input: 1320,
          cachedInput: 320,
          output: 96,
          reasoning: 0,
          ttftMs: 240,
          totalMs: 680,
          finishReason: "tool_calls",
          toolsSent: ["kapruka.search_products"],
          toolCalls: [
            tool(
              {
                kind: "mcp",
                name: "kapruka.search_products",
                argsSummary: 'q="anniversary", maxPrice=5000',
                resultSummary: "6 results",
                cacheHit: true,
                httpStatus: 200,
                latencyMs: 140,
              },
              "tc_search_04",
            ),
          ],
        },
        {
          model: "gpt-5.1-mini",
          input: 1416,
          cachedInput: 0,
          output: 64,
          reasoning: 0,
          ttftMs: 180,
          totalMs: 300,
          finishReason: "stop",
          toolsSent: ["present_products"],
          toolCalls: [
            tool(
              { kind: "ui", name: "present_products", argsSummary: "6 items", latencyMs: 16 },
              "tc_ui_09",
            ),
          ],
        },
      ],
      emitted: [{ type: "products", offsetMs: 780, payloadSummary: "6 items" }],
      outcome: "viewed_product",
    }),
  ];
  const totals = {
    turns: 1,
    tokens: turns[0]!.totals.usage.total,
    costUSD: turns[0]!.totals.cost.total,
    toolCalls: turns[0]!.totals.toolCalls,
    durationMs: turns[0]!.durationMs,
  };
  return {
    session: {
      sessionId,
      startedAt: turns[0]!.createdAt,
      lastSeenAt: turns[0]!.completedAt,
      locale: "en",
      currency: "LKR",
      device: "desktop",
      userAgentShort: "macOS Chrome",
      country: "LK",
      totals,
      funnel: {
        searched: true,
        viewedProduct: true,
        addedToCart: false,
        startedCheckout: false,
        paid: false,
      },
      outcome: "browsing",
    },
    turns,
  };
}

export interface SeedDataset {
  sessions: SessionRecord[];
  turns: TurnRecord[];
}

let cached: SeedDataset | null = null;

export function getSeed(): SeedDataset {
  if (cached) return cached;
  const sessions: SessionRecord[] = [];
  const turns: TurnRecord[] = [];
  for (let i = 0; i < 4; i++) {
    const built = birthdayCakeGalleSession(i);
    sessions.push(built.session);
    turns.push(...built.turns);
  }
  for (let i = 0; i < 3; i++) {
    const built = flowersBrowsingSession(i);
    sessions.push(built.session);
    turns.push(...built.turns);
  }
  for (let i = 0; i < 2; i++) {
    const built = erroredCheckoutSession(i);
    sessions.push(built.session);
    turns.push(...built.turns);
  }
  for (let i = 0; i < 3; i++) {
    const built = quickBrowseSession(i);
    sessions.push(built.session);
    turns.push(...built.turns);
  }
  cached = { sessions, turns };
  return cached;
}
