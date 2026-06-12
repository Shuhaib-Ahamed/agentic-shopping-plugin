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

export const StatusEventSchema = z.object({
  type: z.literal("status"),
  state: z.enum(["thinking", "working", "idle"]),
  label: z.string().optional(),
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
