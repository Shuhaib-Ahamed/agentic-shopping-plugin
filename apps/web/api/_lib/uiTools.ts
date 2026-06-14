// UI action tools. Build prompt Section 11. Each tool has a strict JSON schema
// and an emit handler that writes the corresponding SSE event.

import {
  NotifyArgsSchema,
  OrderConfirmedArgsSchema,
  PresentCheckoutArgsSchema,
  PresentDeliveryQuoteArgsSchema,
  PresentOptionsArgsSchema,
  PresentProductDetailArgsSchema,
  PresentProductsArgsSchema,
  RequestInfoArgsSchema,
  UpdateCartArgsSchema,
  UiToolName,
  type SseEvent,
} from "@kapruka/protocol";
import type { SseWriter } from "./sse.js";

export interface ResponsesFunctionTool {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict: boolean;
}

export interface UiToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  /** Validate args, emit the matching SSE event, and return the acknowledgement text fed back to the model. */
  emit: (args: unknown, writer: SseWriter) => string;
}

// JSON schemas for OpenAI Responses API function tools. They mirror the Zod schemas
// in @kapruka/protocol, kept hand-written because Responses API needs strict subset
// JSON Schema. additionalProperties:false, required: every property.
const MoneySchema = {
  type: "object",
  properties: {
    amount: { type: "number" },
    currency: { type: "string", enum: ["LKR", "USD"] },
  },
  required: ["amount", "currency"],
  additionalProperties: false,
};

const ProductSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    price: MoneySchema,
    /* Original (pre-discount) price for strikethrough. */
    compareAtPrice: { anyOf: [MoneySchema, { type: "null" }] },
    image: { type: ["string", "null"] },
    url: { type: ["string", "null"] },
    rating: { type: ["number", "null"] },
    inStock: { type: "boolean" },
    badge: { type: ["string", "null"] },
  },
  required: [
    "id",
    "title",
    "price",
    "compareAtPrice",
    "image",
    "url",
    "rating",
    "inStock",
    "badge",
  ],
  additionalProperties: false,
};

const VariantSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    label: { type: "string" },
    price: { anyOf: [MoneySchema, { type: "null" }] },
    inStock: { type: "boolean" },
  },
  required: ["id", "label", "price", "inStock"],
  additionalProperties: false,
};

const CartLineSchema = {
  type: "object",
  properties: {
    productId: { type: "string" },
    title: { type: "string" },
    qty: { type: "integer", minimum: 1 },
    variantId: { type: ["string", "null"] },
    price: MoneySchema,
    image: { type: ["string", "null"] },
  },
  required: ["productId", "title", "qty", "variantId", "price", "image"],
  additionalProperties: false,
};

const FieldSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    label: { type: "string" },
    type: {
      type: "string",
      enum: ["text", "tel", "email", "date", "select", "city", "textarea"],
    },
    required: { type: "boolean" },
    options: { type: ["array", "null"], items: { type: "string" } },
    placeholder: { type: ["string", "null"] },
    defaultValue: { type: ["string", "null"] },
    helperText: { type: ["string", "null"] },
    maxLength: { type: ["integer", "null"] },
  },
  required: [
    "name",
    "label",
    "type",
    "required",
    "options",
    "placeholder",
    "defaultValue",
    "helperText",
    "maxLength",
  ],
  additionalProperties: false,
};

const RecipientSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    phone: { type: "string" },
    line1: { type: "string" },
    line2: { type: ["string", "null"] },
    city: { type: "string" },
    postalCode: { type: ["string", "null"] },
  },
  required: ["name", "phone", "line1", "line2", "city", "postalCode"],
  additionalProperties: false,
};

const OrderSummarySchema = {
  type: "object",
  properties: {
    lines: { type: "array", items: CartLineSchema },
    delivery: MoneySchema,
    total: MoneySchema,
    recipient: { anyOf: [RecipientSchema, { type: "null" }] },
    giftMessage: { type: ["string", "null"] },
  },
  required: ["lines", "delivery", "total", "recipient", "giftMessage"],
  additionalProperties: false,
};

export function uiToolDefs(): UiToolDef[] {
  return [
    {
      name: UiToolName.PresentProducts,
      description:
        "Show a small, curated set of products to the shopper as a carousel or grid. Items must come from a kapruka_search_products result; never invent products.",
      parameters: {
        type: "object",
        properties: {
          title: { type: ["string", "null"] },
          layout: { type: "string", enum: ["carousel", "grid"] },
          items: { type: "array", items: ProductSchema, minItems: 1, maxItems: 12 },
        },
        required: ["title", "layout", "items"],
        additionalProperties: false,
      },
      emit: (args, writer) => emitOrError(PresentProductsArgsSchema, args, writer, "products"),
    },
    {
      name: UiToolName.PresentProductDetail,
      description:
        "Open a detail sheet for one product. Values come from kapruka_get_product. Use when the shopper wants a closer look or to pick a variant.",
      parameters: {
        type: "object",
        properties: {
          product: ProductSchema,
          variants: { type: ["array", "null"], items: VariantSchema },
          images: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 12 },
        },
        required: ["product", "variants", "images"],
        additionalProperties: false,
      },
      emit: (args, writer) =>
        emitOrError(PresentProductDetailArgsSchema, args, writer, "product_detail"),
    },
    {
      name: UiToolName.RequestInfo,
      description:
        "Ask the shopper for structured information (delivery details, gift message, custom contact). The fields render as a form.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          intent: { type: "string", enum: ["delivery", "contact", "gift", "custom"] },
          fields: { type: "array", items: FieldSchema, minItems: 1, maxItems: 20 },
          submitLabel: { type: "string" },
        },
        required: ["title", "intent", "fields", "submitLabel"],
        additionalProperties: false,
      },
      emit: (args, writer) => emitOrError(RequestInfoArgsSchema, args, writer, "request_info"),
    },
    {
      name: UiToolName.UpdateCart,
      description: "Refresh the cart panel with the current set of cart lines and a subtotal.",
      parameters: {
        type: "object",
        properties: {
          lines: { type: "array", items: CartLineSchema },
          subtotal: MoneySchema,
        },
        required: ["lines", "subtotal"],
        additionalProperties: false,
      },
      emit: (args, writer) => emitOrError(UpdateCartArgsSchema, args, writer, "cart"),
    },
    {
      name: UiToolName.PresentDeliveryQuote,
      description:
        "Show the delivery quote returned by kapruka_check_delivery. Include the perishable warning verbatim when present.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
          date: { type: "string" },
          rate: MoneySchema,
          perishableWarning: { type: ["string", "null"] },
        },
        required: ["city", "date", "rate", "perishableWarning"],
        additionalProperties: false,
      },
      emit: (args, writer) =>
        emitOrError(PresentDeliveryQuoteArgsSchema, args, writer, "delivery_quote"),
    },
    {
      name: UiToolName.PresentCheckout,
      description:
        "Show the checkout panel with the order summary and the pay link returned by kapruka_create_order. Never fabricate a pay URL or order id.",
      parameters: {
        type: "object",
        properties: {
          summary: OrderSummarySchema,
          payUrl: { type: "string" },
          orderId: { type: "string" },
          expiresAt: { type: "string" },
        },
        required: ["summary", "payUrl", "orderId", "expiresAt"],
        additionalProperties: false,
      },
      emit: (args, writer) => emitOrError(PresentCheckoutArgsSchema, args, writer, "checkout"),
    },
    {
      name: UiToolName.OrderConfirmed,
      description: "Confirm the order is paid and offer the tracking timeline.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string" },
          summary: OrderSummarySchema,
          trackingUrl: { type: ["string", "null"] },
        },
        required: ["orderId", "summary", "trackingUrl"],
        additionalProperties: false,
      },
      emit: (args, writer) =>
        emitOrError(OrderConfirmedArgsSchema, args, writer, "order_confirmed"),
    },
    {
      name: UiToolName.PresentOptions,
      description:
        "Show clickable option chips above the composer for multiple-choice questions, so the shopper picks instead of typing. Use whenever the answer is one of a small known set (categories like men's/women's/kids, occasion, recipient, yes/no, time slot, color, size). Combine with a short text message that asks the question; the options appear as quick-reply chips. Each option's `value` is what gets sent as the shopper's reply when they tap. Provide 2–6 options. Do not use this for open-ended text or numeric inputs.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: ["string", "null"] },
          options: {
            type: "array",
            minItems: 2,
            maxItems: 8,
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                value: { type: "string" },
                icon: { type: ["string", "null"] },
                emoji: { type: ["string", "null"] },
              },
              required: ["label", "value", "icon", "emoji"],
              additionalProperties: false,
            },
          },
          layout: { type: "string", enum: ["chips", "grid"] },
        },
        required: ["prompt", "options", "layout"],
        additionalProperties: false,
      },
      emit: (args, writer) => emitOrError(PresentOptionsArgsSchema, args, writer, "options"),
    },
    {
      name: UiToolName.Notify,
      description:
        "Update the inline status row above the composer (e.g., 'Looking through Kapruka'). Use sparingly.",
      parameters: {
        type: "object",
        properties: {
          state: { type: "string", enum: ["thinking", "working", "idle"] },
          label: { type: ["string", "null"] },
        },
        required: ["state", "label"],
        additionalProperties: false,
      },
      emit: (args, writer) => emitOrError(NotifyArgsSchema, args, writer, "status"),
    },
  ];
}

function emitOrError(
  schema: { safeParse: (x: unknown) => { success: boolean; data?: unknown; error?: unknown } },
  args: unknown,
  writer: SseWriter,
  eventType: SseEvent["type"],
): string {
  const argsObj = preNullToUndefined(args);
  const parsed = schema.safeParse(argsObj);
  if (!parsed.success) {
    return `Validation failed: ${JSON.stringify(parsed.error)}. Please correct and call again.`;
  }
  writer.write({ type: eventType, ...(parsed.data as object) } as SseEvent);
  return `OK. UI event "${eventType}" emitted.`;
}

// JSON schemas above set most "optional" fields to nullable so the model can pass null.
// Strip nulls before Zod validation to match the optional fields.
function preNullToUndefined(value: unknown): unknown {
  if (value === null) return undefined;
  if (Array.isArray(value)) return value.map(preNullToUndefined);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = preNullToUndefined(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }
  return value;
}

export function uiToolsAsResponsesTools(): ResponsesFunctionTool[] {
  return uiToolDefs().map((t) => ({
    type: "function",
    name: t.name,
    description: t.description,
    parameters: t.parameters,
    strict: true,
  }));
}

export function uiToolByName(name: string): UiToolDef | undefined {
  return uiToolDefs().find((t) => t.name === name);
}
