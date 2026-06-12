// Server-owned cart tools, exposed to the model under the kapruka_* prefix.
//
// The real Kapruka MCP does not own cart state; orders are created from a cart
// payload at checkout. We need an authoritative source of the cart subtotal so
// the LLM never does arithmetic. These tools run inside the gateway, mutate
// session_state, and return the new cart snapshot. From the model's point of
// view they look identical to any other kapruka_* tool.

import { CartLineSchema, type CartLine } from "@kapruka/protocol";
import { z } from "zod";
import { computeCart, type SessionState } from "./sessionState";

export interface LocalCartTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** Synchronously mutate session state and return a JSON-shaped result for the model. */
  execute: (session: SessionState, args: Record<string, unknown>) => unknown;
}

const AddArgs = z.object({
  productId: z.string(),
  title: z.string(),
  qty: z.number().int().positive(),
  variantId: z.string().optional(),
  price: CartLineSchema.shape.price,
  image: z.string().url().optional(),
});

const SetArgs = z.object({
  productId: z.string(),
  qty: z.number().int().min(0),
  variantId: z.string().optional(),
});

const RemoveArgs = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
});

function sameLine(a: CartLine, productId: string, variantId?: string): boolean {
  return a.productId === productId && (a.variantId ?? null) === (variantId ?? null);
}

function applyAndSerialize(session: SessionState, lines: CartLine[]): unknown {
  session.cart = computeCart(lines);
  return {
    ok: true,
    cart: {
      lines: session.cart.lines,
      subtotal: session.cart.subtotal,
    },
  };
}

export const localCartTools: LocalCartTool[] = [
  {
    name: "kapruka_get_cart",
    description:
      "Return the authoritative cart state for this session: lines and the computed subtotal. Always call this before reading or quoting any cart total. Never compute cart totals yourself.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: (session) => ({
      ok: true,
      cart: { lines: session.cart.lines, subtotal: session.cart.subtotal },
    }),
  },
  {
    name: "kapruka_add_to_cart",
    description:
      "Add a product (with optional variant) to the cart. If the same productId+variantId is already in the cart, its quantity is incremented. Pass price exactly as returned by kapruka_get_product or kapruka_search_products; never invent or modify it. Returns the new cart with an authoritative subtotal.",
    inputSchema: {
      type: "object",
      properties: {
        productId: { type: "string" },
        title: { type: "string" },
        qty: { type: "integer", minimum: 1 },
        variantId: { type: "string" },
        price: {
          type: "object",
          properties: {
            amount: { type: "number" },
            currency: { type: "string", enum: ["LKR", "USD"] },
          },
          required: ["amount", "currency"],
        },
        image: { type: "string" },
      },
      required: ["productId", "title", "qty", "price"],
      additionalProperties: false,
    },
    execute: (session, args) => {
      const parsed = AddArgs.safeParse(args);
      if (!parsed.success) return { ok: false, error: parsed.error.flatten() };
      const incoming: CartLine = {
        productId: parsed.data.productId,
        title: parsed.data.title,
        qty: parsed.data.qty,
        variantId: parsed.data.variantId,
        price: parsed.data.price,
        image: parsed.data.image,
      };
      const lines = [...session.cart.lines];
      const idx = lines.findIndex((l) => sameLine(l, incoming.productId, incoming.variantId));
      if (idx === -1) {
        lines.push(incoming);
      } else {
        const existing = lines[idx]!;
        lines[idx] = { ...existing, qty: existing.qty + incoming.qty };
      }
      return applyAndSerialize(session, lines);
    },
  },
  {
    name: "kapruka_set_cart_line",
    description:
      "Set the quantity of an existing cart line. Pass qty 0 to remove it. Use this when the shopper updates a quantity rather than adding more.",
    inputSchema: {
      type: "object",
      properties: {
        productId: { type: "string" },
        qty: { type: "integer", minimum: 0 },
        variantId: { type: "string" },
      },
      required: ["productId", "qty"],
      additionalProperties: false,
    },
    execute: (session, args) => {
      const parsed = SetArgs.safeParse(args);
      if (!parsed.success) return { ok: false, error: parsed.error.flatten() };
      const lines = session.cart.lines
        .map((l) =>
          sameLine(l, parsed.data.productId, parsed.data.variantId)
            ? { ...l, qty: parsed.data.qty }
            : l,
        )
        .filter((l) => l.qty > 0);
      return applyAndSerialize(session, lines);
    },
  },
  {
    name: "kapruka_remove_from_cart",
    description: "Remove a line from the cart by productId (and optional variantId).",
    inputSchema: {
      type: "object",
      properties: {
        productId: { type: "string" },
        variantId: { type: "string" },
      },
      required: ["productId"],
      additionalProperties: false,
    },
    execute: (session, args) => {
      const parsed = RemoveArgs.safeParse(args);
      if (!parsed.success) return { ok: false, error: parsed.error.flatten() };
      const lines = session.cart.lines.filter(
        (l) => !sameLine(l, parsed.data.productId, parsed.data.variantId),
      );
      return applyAndSerialize(session, lines);
    },
  },
  {
    name: "kapruka_clear_cart",
    description: "Empty the cart. Use only when the shopper explicitly asks to start over.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: (session) => applyAndSerialize(session, []),
  },
];

export const localCartToolNames = new Set(localCartTools.map((t) => t.name));

export function findLocalCartTool(name: string): LocalCartTool | undefined {
  return localCartTools.find((t) => t.name === name);
}
