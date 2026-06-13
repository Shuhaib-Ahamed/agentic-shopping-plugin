// Frozen contract between the SPA and the gateway.
// Build prompt Section 8: SSE event types, supporting domain types, and the chat request.
// Changes go through the orchestrator. Both apps/web (client) and apps/web/api (gateway)
// import from this package.

import { z } from "zod";

// -----------------------------------------------------------------------------
// Supporting domain types
// -----------------------------------------------------------------------------

export const MoneySchema = z.object({
  amount: z.number(),
  currency: z.enum(["LKR", "USD"]),
});
export type Money = z.infer<typeof MoneySchema>;

export const ProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: MoneySchema,
  /** Original "compare-at" price for strikethrough display when discounted. */
  compareAtPrice: MoneySchema.optional(),
  image: z.string().url().optional(),
  url: z.string().url().optional(),
  rating: z.number().min(0).max(5).optional(),
  inStock: z.boolean(),
  badge: z.string().optional(),
});
export type Product = z.infer<typeof ProductSchema>;

export const VariantSchema = z.object({
  id: z.string(),
  label: z.string(),
  price: MoneySchema.optional(),
  inStock: z.boolean(),
});
export type Variant = z.infer<typeof VariantSchema>;

export const CartLineSchema = z.object({
  productId: z.string(),
  title: z.string(),
  qty: z.number().int().positive(),
  variantId: z.string().optional(),
  price: MoneySchema,
  image: z.string().url().optional(),
});
export type CartLine = z.infer<typeof CartLineSchema>;

export const FieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(["text", "tel", "email", "date", "select", "city", "textarea"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  defaultValue: z.string().optional(),
  helperText: z.string().optional(),
  maxLength: z.number().int().positive().optional(),
});
export type Field = z.infer<typeof FieldSchema>;

export const RecipientSchema = z.object({
  name: z.string(),
  phone: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  postalCode: z.string().optional(),
});
export type Recipient = z.infer<typeof RecipientSchema>;

export const OrderSummarySchema = z.object({
  lines: z.array(CartLineSchema),
  delivery: MoneySchema,
  total: MoneySchema,
  recipient: RecipientSchema.optional(),
  giftMessage: z.string().optional(),
});
export type OrderSummary = z.infer<typeof OrderSummarySchema>;

// -----------------------------------------------------------------------------
// Request body for POST /api/chat
// -----------------------------------------------------------------------------

export const LocaleSchema = z.enum(["en", "si", "ta"]);
export type Locale = z.infer<typeof LocaleSchema>;

export const CurrencySchema = z.enum(["LKR", "USD"]);
export type Currency = z.infer<typeof CurrencySchema>;

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  sessionId: z.string().min(1).max(128),
  messages: z.array(ChatMessageSchema).min(1).max(100),
  context: z
    .object({
      locale: LocaleSchema.optional(),
      currency: CurrencySchema.optional(),
      cart: z.array(CartLineSchema).optional(),
    })
    .optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// -----------------------------------------------------------------------------
// SSE events
// Each emitted event has shape `event: <type>\ndata: <json>\n\n`.
// The discriminated union below makes client reducers exhaustive.
// -----------------------------------------------------------------------------

/**
 * Streaming status states. The UI shows a "Juno is..." bubble keyed to these.
 * Order is roughly the pipeline flow so the front end can render lineage.
 */
export const StatusStateSchema = z.enum([
  "idle",
  "thinking", // generic catch-all
  "routing", // Stage 1: router classifying intent
  "searching", // Stage 2: kapruka_search_products
  "fetching", // Stage 2: kapruka_get_product / list_categories
  "checking", // Stage 2: kapruka_check_delivery / list_delivery_cities
  "creating", // Stage 2: kapruka_create_order
  "tracking", // Stage 2: kapruka_track_order
  "composing", // Stage 3: writing the reply
  "working", // generic Stage 2 fallback
]);
export type StatusState = z.infer<typeof StatusStateSchema>;

export const StatusEventSchema = z.object({
  type: z.literal("status"),
  state: StatusStateSchema,
  label: z.string().optional(),
  /** Optional one-token detail (e.g. a city or product title) to enrich the label. */
  detail: z.string().optional(),
});
export type StatusEvent = z.infer<typeof StatusEventSchema>;

export const MessageEventSchema = z.object({
  type: z.literal("message"),
  id: z.string(),
  role: z.literal("assistant"),
  text: z.string(),
});
export type MessageEvent = z.infer<typeof MessageEventSchema>;

export const TokenEventSchema = z.object({
  type: z.literal("token"),
  id: z.string(),
  delta: z.string(),
});
export type TokenEvent = z.infer<typeof TokenEventSchema>;

export const ProductsEventSchema = z.object({
  type: z.literal("products"),
  title: z.string().optional(),
  layout: z.enum(["carousel", "grid"]),
  items: z.array(ProductSchema).min(1).max(24),
});
export type ProductsEvent = z.infer<typeof ProductsEventSchema>;

export const ProductDetailEventSchema = z.object({
  type: z.literal("product_detail"),
  product: ProductSchema,
  variants: z.array(VariantSchema).optional(),
  images: z.array(z.string().url()).min(1).max(12),
});
export type ProductDetailEvent = z.infer<typeof ProductDetailEventSchema>;

export const RequestInfoEventSchema = z.object({
  type: z.literal("request_info"),
  title: z.string(),
  intent: z.enum(["delivery", "contact", "gift", "custom"]),
  fields: z.array(FieldSchema).min(1).max(20),
  submitLabel: z.string(),
});
export type RequestInfoEvent = z.infer<typeof RequestInfoEventSchema>;

export const CartEventSchema = z.object({
  type: z.literal("cart"),
  lines: z.array(CartLineSchema),
  subtotal: MoneySchema,
});
export type CartEvent = z.infer<typeof CartEventSchema>;

export const DeliveryQuoteEventSchema = z.object({
  type: z.literal("delivery_quote"),
  city: z.string(),
  date: z.string(),
  rate: MoneySchema,
  perishableWarning: z.string().optional(),
});
export type DeliveryQuoteEvent = z.infer<typeof DeliveryQuoteEventSchema>;

export const CheckoutEventSchema = z.object({
  type: z.literal("checkout"),
  summary: OrderSummarySchema,
  payUrl: z.string().url(),
  orderId: z.string(),
  expiresAt: z.string(),
});
export type CheckoutEvent = z.infer<typeof CheckoutEventSchema>;

export const OrderConfirmedEventSchema = z.object({
  type: z.literal("order_confirmed"),
  orderId: z.string(),
  summary: OrderSummarySchema,
  trackingUrl: z.string().url().optional(),
});
export type OrderConfirmedEvent = z.infer<typeof OrderConfirmedEventSchema>;

export const OptionItemSchema = z.object({
  /** The visible label shown on the chip. */
  label: z.string().min(1).max(60),
  /** The text inserted as the user's next reply when the chip is tapped. */
  value: z.string().min(1).max(120),
  /** Optional lucide icon name (e.g. "Cake", "Gift", "Heart"). */
  icon: z.string().optional(),
  /** Optional accent emoji shown in place of the icon. */
  emoji: z.string().optional(),
});
export type OptionItem = z.infer<typeof OptionItemSchema>;

export const OptionsEventSchema = z.object({
  type: z.literal("options"),
  /** Optional one-line prefacing question shown above the chips. */
  prompt: z.string().max(140).optional(),
  options: z.array(OptionItemSchema).min(2).max(8),
  /** "chips" is a horizontal row, "grid" is a 2-column grid for longer labels. */
  layout: z.enum(["chips", "grid"]).default("chips"),
});
export type OptionsEvent = z.infer<typeof OptionsEventSchema>;

export const ErrorEventSchema = z.object({
  type: z.literal("error"),
  code: z.string(),
  message: z.string(),
  recoverable: z.boolean(),
});
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;

export const DoneEventSchema = z.object({
  type: z.literal("done"),
});
export type DoneEvent = z.infer<typeof DoneEventSchema>;

export const SseEventSchema = z.discriminatedUnion("type", [
  StatusEventSchema,
  MessageEventSchema,
  TokenEventSchema,
  ProductsEventSchema,
  ProductDetailEventSchema,
  RequestInfoEventSchema,
  CartEventSchema,
  DeliveryQuoteEventSchema,
  CheckoutEventSchema,
  OrderConfirmedEventSchema,
  OptionsEventSchema,
  ErrorEventSchema,
  DoneEventSchema,
]);
export type SseEvent = z.infer<typeof SseEventSchema>;

// String literal union of event names so callers can type-narrow without the full event object.
export type SseEventName = SseEvent["type"];

// -----------------------------------------------------------------------------
// UI tool argument schemas (one to one with SSE events, minus `type`).
// The gateway uses these to validate model tool calls before emitting.
// -----------------------------------------------------------------------------

export const PresentProductsArgsSchema = ProductsEventSchema.omit({ type: true });
export const PresentProductDetailArgsSchema = ProductDetailEventSchema.omit({ type: true });
export const RequestInfoArgsSchema = RequestInfoEventSchema.omit({ type: true });
export const UpdateCartArgsSchema = CartEventSchema.omit({ type: true });
export const PresentDeliveryQuoteArgsSchema = DeliveryQuoteEventSchema.omit({ type: true });
export const PresentCheckoutArgsSchema = CheckoutEventSchema.omit({ type: true });
export const OrderConfirmedArgsSchema = OrderConfirmedEventSchema.omit({ type: true });
export const PresentOptionsArgsSchema = OptionsEventSchema.omit({ type: true });
export const NotifyArgsSchema = StatusEventSchema.omit({ type: true });

export const UiToolName = {
  PresentProducts: "present_products",
  PresentProductDetail: "present_product_detail",
  RequestInfo: "request_info",
  UpdateCart: "update_cart",
  PresentDeliveryQuote: "present_delivery_quote",
  PresentCheckout: "present_checkout",
  OrderConfirmed: "order_confirmed",
  PresentOptions: "present_options",
  Notify: "notify",
} as const;
export type UiToolName = (typeof UiToolName)[keyof typeof UiToolName];

// -----------------------------------------------------------------------------
// Order status polling (GET /api/order-status?orderId=)
// -----------------------------------------------------------------------------

export const OrderStatusResponseSchema = z.object({
  status: z.enum(["pending", "paid", "failed"]),
  trackingUrl: z.string().url().optional(),
});
export type OrderStatusResponse = z.infer<typeof OrderStatusResponseSchema>;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Serialize one SSE event as the bytes the gateway writes to the stream. */
export function encodeSseEvent(event: SseEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

// -----------------------------------------------------------------------------
// Telemetry contract (Console / Fine-tuning console).
// Same package so the gateway tracer, the client telemetry channel, and the
// admin console all agree on the shape.
// -----------------------------------------------------------------------------

export const TokenUsageSchema = z.object({
  input: z.number().int().nonnegative(),
  cachedInput: z.number().int().nonnegative(),
  output: z.number().int().nonnegative(),
  reasoning: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});
export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export const CostBreakdownSchema = z.object({
  input: z.number().nonnegative(),
  cachedInput: z.number().nonnegative(),
  output: z.number().nonnegative(),
  reasoning: z.number().nonnegative(),
  total: z.number().nonnegative(),
});
export type CostBreakdown = z.infer<typeof CostBreakdownSchema>;

export const ToolCallRecordSchema = z.object({
  id: z.string(),
  kind: z.enum(["mcp", "ui"]),
  name: z.string(),
  argsSummary: z.string(),
  argsRedacted: z.unknown().optional(),
  resultSummary: z.string().optional(),
  resultRedacted: z.unknown().optional(),
  httpStatus: z.number().int().optional(),
  rateLimitRemaining: z.number().int().optional(),
  cacheHit: z.boolean().optional(),
  latencyMs: z.number().nonnegative(),
  error: z.object({ code: z.string(), message: z.string(), recoverable: z.boolean() }).optional(),
});
export type ToolCallRecord = z.infer<typeof ToolCallRecordSchema>;

export const StepRecordSchema = z.object({
  index: z.number().int().nonnegative(),
  model: z.string(),
  params: z.object({
    temperature: z.number().optional(),
    maxOutputTokens: z.number().int().optional(),
    toolsSent: z.array(z.string()),
  }),
  usage: TokenUsageSchema,
  cost: CostBreakdownSchema,
  latency: z.object({
    ttftMs: z.number().nonnegative().optional(),
    totalMs: z.number().nonnegative(),
  }),
  finishReason: z.string(),
  toolCalls: z.array(ToolCallRecordSchema),
  rawOutputSummary: z.string().optional(),
});
export type StepRecord = z.infer<typeof StepRecordSchema>;

export const EmittedEventRecordSchema = z.object({
  type: z.string(),
  at: z.string(),
  payloadSummary: z.string(),
});
export type EmittedEventRecord = z.infer<typeof EmittedEventRecordSchema>;

export const LogEntryRecordSchema = z.object({
  at: z.string(),
  level: z.enum(["debug", "info", "warn", "error"]),
  ctx: z.string().optional(),
  msg: z.string(),
  fields: z.record(z.unknown()).optional(),
});
export type LogEntryRecord = z.infer<typeof LogEntryRecordSchema>;

export const TurnInputSchema = z.union([
  z.object({ kind: z.literal("text"), text: z.string() }),
  z.object({
    kind: z.literal("ui_action"),
    uiAction: z.object({
      type: z.string(),
      payloadSummary: z.string(),
    }),
  }),
]);
export type TurnInput = z.infer<typeof TurnInputSchema>;

export const TurnOutcomeSchema = z.enum([
  "in_progress",
  "browsing",
  "viewed_product",
  "added_to_cart",
  "checkout_created",
  "paid",
  "errored",
]);
export type TurnOutcome = z.infer<typeof TurnOutcomeSchema>;

export const TurnFlagsSchema = z.object({
  hallucinationSuspected: z.boolean(),
  schemaValidationFailed: z.boolean(),
  refused: z.boolean(),
  retried: z.boolean(),
});
export type TurnFlags = z.infer<typeof TurnFlagsSchema>;

export const TurnLabelSchema = z.object({
  rating: z.enum(["good", "bad", "unrated"]),
  tags: z.array(z.string()),
  reason: z.string().optional(),
  correctedResponse: z.string().optional(),
  correctedToolPlan: z.unknown().optional(),
  by: z.string(),
  at: z.string(),
});
export type TurnLabel = z.infer<typeof TurnLabelSchema>;

export const TurnRecordSchema = z.object({
  turnId: z.string(),
  sessionId: z.string(),
  index: z.number().int().nonnegative(),
  createdAt: z.string(),
  completedAt: z.string(),
  durationMs: z.number().nonnegative(),
  promptVersion: z.string(),
  model: z.string(),
  locale: LocaleSchema,
  currency: CurrencySchema,
  input: TurnInputSchema,
  steps: z.array(StepRecordSchema),
  emittedEvents: z.array(EmittedEventRecordSchema),
  logs: z.array(LogEntryRecordSchema).optional(),
  finalMessage: z.string().optional(),
  outcome: TurnOutcomeSchema,
  totals: z.object({
    usage: TokenUsageSchema,
    cost: CostBreakdownSchema,
    toolCalls: z.number().int().nonnegative(),
  }),
  errors: z.array(z.object({ code: z.string(), message: z.string(), recoverable: z.boolean() })),
  flags: TurnFlagsSchema,
  label: TurnLabelSchema.optional(),
});
export type TurnRecord = z.infer<typeof TurnRecordSchema>;

export const SessionFunnelSchema = z.object({
  searched: z.boolean(),
  viewedProduct: z.boolean(),
  addedToCart: z.boolean(),
  startedCheckout: z.boolean(),
  paid: z.boolean(),
});
export type SessionFunnel = z.infer<typeof SessionFunnelSchema>;

export const SessionOutcomeSchema = z.enum(["browsing", "carted", "checkout", "paid", "errored"]);
export type SessionOutcome = z.infer<typeof SessionOutcomeSchema>;

export const SessionRecordSchema = z.object({
  sessionId: z.string(),
  startedAt: z.string(),
  lastSeenAt: z.string(),
  locale: LocaleSchema,
  currency: CurrencySchema,
  device: z.enum(["desktop", "mobile", "tablet"]),
  userAgentShort: z.string(),
  referrer: z.string().optional(),
  country: z.string().optional(),
  totals: z.object({
    turns: z.number().int().nonnegative(),
    tokens: z.number().int().nonnegative(),
    costUSD: z.number().nonnegative(),
    toolCalls: z.number().int().nonnegative(),
    durationMs: z.number().nonnegative(),
  }),
  funnel: SessionFunnelSchema,
  outcome: SessionOutcomeSchema,
});
export type SessionRecord = z.infer<typeof SessionRecordSchema>;

// Client telemetry events from the SPA (UI inputs, render acks, client errors).
export const ClientTelemetryEventSchema = z.object({
  eventId: z.string(),
  sessionId: z.string(),
  turnId: z.string().optional(),
  at: z.string(),
  kind: z.enum(["ui_input", "render_ack", "client_error", "client_timing"]),
  payload: z.record(z.unknown()),
});
export type ClientTelemetryEvent = z.infer<typeof ClientTelemetryEventSchema>;

export const TelemetryBatchSchema = z.object({
  events: z.array(ClientTelemetryEventSchema).max(64),
});
export type TelemetryBatch = z.infer<typeof TelemetryBatchSchema>;

// Admin overview aggregates.
export const AdminOverviewSchema = z.object({
  range: z.object({ from: z.string(), to: z.string() }),
  headline: z.object({
    sessions: z.number().int().nonnegative(),
    turns: z.number().int().nonnegative(),
    tokens: z.number().int().nonnegative(),
    costUSD: z.number().nonnegative(),
    paidOrders: z.number().int().nonnegative(),
    errorRate: z.number().min(0).max(1),
    avgTurnLatencyP50: z.number().nonnegative(),
    avgTurnLatencyP95: z.number().nonnegative(),
    cacheSavingsUSD: z.number().nonnegative(),
    cacheSavingsPct: z.number().min(0).max(1),
  }),
  deltas: z.object({
    sessionsPct: z.number(),
    turnsPct: z.number(),
    tokensPct: z.number(),
    costPct: z.number(),
    paidOrdersDelta: z.number(),
    errorRatePp: z.number(),
  }),
  series: z.object({
    turnsOverTime: z.array(z.object({ t: z.string(), turns: z.number(), costUSD: z.number() })),
    tokenMix: z.array(
      z.object({
        t: z.string(),
        input: z.number(),
        cached: z.number(),
        output: z.number(),
        reasoning: z.number(),
      }),
    ),
    latencyPercentiles: z.array(
      z.object({ t: z.string(), p50: z.number(), p95: z.number(), p99: z.number() }),
    ),
    modelSplit: z.array(z.object({ model: z.string(), calls: z.number() })),
    languageMix: z.array(
      z.object({ t: z.string(), en: z.number(), si: z.number(), ta: z.number(), tg: z.number() }),
    ),
    topQueries: z.array(z.object({ q: z.string(), count: z.number().int() })),
    funnel: z.object({
      opened: z.number().int(),
      searched: z.number().int(),
      viewed: z.number().int(),
      added: z.number().int(),
      checkout: z.number().int(),
      paid: z.number().int(),
    }),
  }),
});
export type AdminOverview = z.infer<typeof AdminOverviewSchema>;

export const AdminSessionListItemSchema = z.object({
  sessionId: z.string(),
  startedAt: z.string(),
  lastSeenAt: z.string(),
  locale: LocaleSchema,
  turns: z.number().int(),
  costUSD: z.number(),
  outcome: SessionOutcomeSchema,
  errors: z.number().int(),
});
export type AdminSessionListItem = z.infer<typeof AdminSessionListItemSchema>;

export const AdminSessionListSchema = z.object({
  items: z.array(AdminSessionListItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type AdminSessionList = z.infer<typeof AdminSessionListSchema>;

export const AdminSessionDetailSchema = z.object({
  session: SessionRecordSchema,
  turns: z.array(TurnRecordSchema),
});
export type AdminSessionDetail = z.infer<typeof AdminSessionDetailSchema>;

// Cost page. Cost over time, per turn distribution, by model, by tool, cache.
export const AdminCostSchema = z.object({
  range: z.object({ from: z.string(), to: z.string() }),
  totals: z.object({
    costUSD: z.number().nonnegative(),
    tokens: z.number().int().nonnegative(),
    cacheSavingsUSD: z.number().nonnegative(),
    cacheSavingsPct: z.number().min(0).max(1),
    projectedMonthlyUSD: z.number().nonnegative(),
  }),
  costOverTime: z.array(
    z.object({
      t: z.string(),
      input: z.number(),
      cachedInput: z.number(),
      output: z.number(),
      reasoning: z.number(),
    }),
  ),
  costPerTurn: z.array(z.object({ bucket: z.string(), count: z.number().int() })),
  byModel: z.array(
    z.object({
      model: z.string(),
      calls: z.number().int(),
      tokens: z.number().int(),
      costUSD: z.number(),
    }),
  ),
  byTool: z.array(
    z.object({
      name: z.string(),
      kind: z.enum(["mcp", "ui"]),
      calls: z.number().int(),
      avgLatencyMs: z.number(),
      errors: z.number().int(),
    }),
  ),
});
export type AdminCost = z.infer<typeof AdminCostSchema>;

// Latency + Quality.
export const AdminLatencySchema = z.object({
  range: z.object({ from: z.string(), to: z.string() }),
  endToEnd: z.object({ p50: z.number(), p95: z.number(), p99: z.number() }),
  byStage: z.array(
    z.object({
      stage: z.string(),
      p50: z.number(),
      p95: z.number(),
      p99: z.number(),
      calls: z.number().int(),
    }),
  ),
  byTool: z.array(
    z.object({
      name: z.string(),
      kind: z.enum(["mcp", "ui"]),
      p50: z.number(),
      p95: z.number(),
      p99: z.number(),
      calls: z.number().int(),
    }),
  ),
});
export type AdminLatency = z.infer<typeof AdminLatencySchema>;

export const AdminQualitySchema = z.object({
  range: z.object({ from: z.string(), to: z.string() }),
  summary: z.object({
    turns: z.number().int(),
    errors: z.number().int(),
    errorRate: z.number().min(0).max(1),
    schemaFailures: z.number().int(),
    hallucinations: z.number().int(),
    refusals: z.number().int(),
    retries: z.number().int(),
  }),
  toolErrors: z.array(
    z.object({
      name: z.string(),
      calls: z.number().int(),
      errors: z.number().int(),
      errorRate: z.number().min(0).max(1),
    }),
  ),
  flaggedTurns: z.array(
    z.object({
      turnId: z.string(),
      sessionId: z.string(),
      createdAt: z.string(),
      flag: z.enum(["hallucinationSuspected", "schemaValidationFailed", "refused", "retried"]),
      summary: z.string(),
    }),
  ),
});
export type AdminQuality = z.infer<typeof AdminQualitySchema>;

// Pipeline topology.
export const AdminPipelineNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(["input", "stage", "mcp", "ui", "output"]),
  calls: z.number().int(),
  avgLatencyMs: z.number(),
  errorRate: z.number().min(0).max(1),
  costShareUSD: z.number().nonnegative(),
});
export type AdminPipelineNode = z.infer<typeof AdminPipelineNodeSchema>;

export const AdminPipelineEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  count: z.number().int(),
});
export type AdminPipelineEdge = z.infer<typeof AdminPipelineEdgeSchema>;

export const AdminPipelineSchema = z.object({
  range: z.object({ from: z.string(), to: z.string() }),
  nodes: z.array(AdminPipelineNodeSchema),
  edges: z.array(AdminPipelineEdgeSchema),
});
export type AdminPipeline = z.infer<typeof AdminPipelineSchema>;

// Funnel page - same totals as in overview but with drop-off pairs.
export const AdminFunnelSchema = z.object({
  range: z.object({ from: z.string(), to: z.string() }),
  stages: z.array(
    z.object({
      key: z.enum(["opened", "searched", "viewed", "added", "checkout", "paid"]),
      label: z.string(),
      count: z.number().int().nonnegative(),
      dropoffPct: z.number().min(0).max(1),
    }),
  ),
});
export type AdminFunnel = z.infer<typeof AdminFunnelSchema>;

// Pricing edit table.
export const AdminPricingRowSchema = z.object({
  model: z.string(),
  inputPer1M: z.number().nonnegative(),
  cachedInputPer1M: z.number().nonnegative(),
  outputPer1M: z.number().nonnegative(),
  reasoningPer1M: z.number().nonnegative(),
  currency: z.literal("USD"),
  effectiveFrom: z.string(),
});
export type AdminPricingRow = z.infer<typeof AdminPricingRowSchema>;

export const AdminPricingSchema = z.object({
  rows: z.array(AdminPricingRowSchema),
});
export type AdminPricing = z.infer<typeof AdminPricingSchema>;

// Label POST body.
export const AdminLabelBodySchema = z.object({
  rating: z.enum(["good", "bad", "unrated"]),
  tags: z.array(z.string().max(40)).max(20).default([]),
  reason: z.string().max(2000).optional(),
  correctedResponse: z.string().max(8000).optional(),
});
export type AdminLabelBody = z.infer<typeof AdminLabelBodySchema>;

// Datasets.
export const AdminDatasetSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  count: z.number().int().nonnegative(),
  filter: z.object({
    rating: z.enum(["good", "bad", "unrated", "any"]).default("any"),
    locales: z.array(LocaleSchema).optional(),
    outcomes: z.array(TurnOutcomeSchema).optional(),
    tags: z.array(z.string()).optional(),
  }),
  redactionProfile: z.enum(["strict", "balanced"]),
  format: z.enum(["openai_chat_jsonl", "eval_jsonl"]),
});
export type AdminDataset = z.infer<typeof AdminDatasetSchema>;

export const AdminDatasetsListSchema = z.object({
  items: z.array(AdminDatasetSchema),
});
export type AdminDatasetsList = z.infer<typeof AdminDatasetsListSchema>;

export const AdminDatasetCreateBodySchema = z.object({
  name: z.string().min(2).max(80),
  filter: z.object({
    rating: z.enum(["good", "bad", "unrated", "any"]).default("any"),
    locales: z.array(LocaleSchema).optional(),
    outcomes: z.array(TurnOutcomeSchema).optional(),
    tags: z.array(z.string()).optional(),
  }),
  redactionProfile: z.enum(["strict", "balanced"]).default("strict"),
  format: z.enum(["openai_chat_jsonl", "eval_jsonl"]).default("openai_chat_jsonl"),
});
export type AdminDatasetCreateBody = z.infer<typeof AdminDatasetCreateBodySchema>;
