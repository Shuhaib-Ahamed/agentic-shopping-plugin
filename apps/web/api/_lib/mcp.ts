// Kapruka MCP client adapter. Build prompt Section 10.
// Uses @modelcontextprotocol/sdk with the Streamable HTTP transport.
// No auth (the Kapruka MCP endpoint is open). Connect once per cold start, reuse.
//
// Every event (connect, listTools, callTool start/cache/result/error) emits a
// structured log line so the entire MCP interaction is auditable in Vercel logs.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { env } from "./env";
import { makeLogger } from "./log";

const log = makeLogger({ ctx: "mcp" });

export interface McpToolDescriptor {
  name: string;
  description: string;
  inputSchema: unknown;
}

export interface McpCallResult {
  /** Concatenated text content from the tool result. */
  text: string;
  /** Parsed JSON from the first JSON content part, if present. */
  json: unknown;
  /** Raw content array from the MCP SDK for debugging. */
  raw: unknown;
}

let clientPromise: Promise<Client> | null = null;
const sessionCache = new Map<string, McpCallResult>();

async function getClient(): Promise<Client> {
  if (clientPromise) return clientPromise;
  clientPromise = (async () => {
    const { MCP_SERVER_URL } = env();
    log.info("mcp.connect.start", { url: MCP_SERVER_URL });
    const t0 = Date.now();
    const client = new Client({ name: "kapruka-agent", version: "0.1.0" }, { capabilities: {} });
    const transport = new StreamableHTTPClientTransport(new URL(MCP_SERVER_URL));
    try {
      await client.connect(transport);
      log.info("mcp.connect.ok", { url: MCP_SERVER_URL, durationMs: Date.now() - t0 });
      return client;
    } catch (err) {
      log.error("mcp.connect.error", {
        url: MCP_SERVER_URL,
        durationMs: Date.now() - t0,
        error: (err as Error).message,
      });
      // Reset so the next call retries the connection.
      clientPromise = null;
      throw err;
    }
  })();
  return clientPromise;
}

export async function listTools(): Promise<McpToolDescriptor[]> {
  if (env().MCP_MOCK) {
    log.info("mcp.listTools.mock");
    return mockToolDescriptors();
  }
  const t0 = Date.now();
  try {
    const client = await getClient();
    const res = await client.listTools();
    const tools = res.tools.map((t) => ({
      name: t.name,
      description: t.description ?? "",
      inputSchema: t.inputSchema ?? { type: "object", properties: {} },
    }));
    log.info("mcp.listTools.ok", {
      count: tools.length,
      names: tools.map((t) => t.name),
      durationMs: Date.now() - t0,
    });
    return tools;
  } catch (err) {
    log.error("mcp.listTools.error", {
      durationMs: Date.now() - t0,
      error: (err as Error).message,
    });
    throw err;
  }
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<McpCallResult> {
  if (env().MCP_MOCK) {
    log.info("mcp.callTool.mock", { tool: name, args });
    const result = await callMockTool(name, args);
    log.info("mcp.callTool.mock.result", { tool: name, bytes: result.text.length });
    return result;
  }
  // Memoize cacheable reads within a session to stay under the per-IP 60 rpm limit.
  const cacheable =
    name === "kapruka_search_products" ||
    name === "kapruka_get_product" ||
    name === "kapruka_list_categories" ||
    name === "kapruka_list_delivery_cities";
  const key = cacheable ? `${name}::${stableStringify(args)}` : null;
  if (key && sessionCache.has(key)) {
    log.info("mcp.callTool.cacheHit", { tool: name });
    return sessionCache.get(key)!;
  }

  log.info("mcp.callTool.start", { tool: name, args });
  const t0 = Date.now();
  try {
    const client = await getClient();
    const res = await client.callTool({ name, arguments: args });
    const content = (res.content ?? []) as Array<{ type: string; text?: string }>;
    const textParts = content.filter((c) => c.type === "text").map((c) => c.text ?? "");
    const text = textParts.join("\n");
    let json: unknown = null;
    for (const part of textParts) {
      try {
        json = JSON.parse(part);
        break;
      } catch {
        /* not JSON, try next */
      }
    }
    const result: McpCallResult = { text, json, raw: content };
    log.info("mcp.callTool.ok", {
      tool: name,
      durationMs: Date.now() - t0,
      bytes: text.length,
      hasJson: json !== null,
      result: json,
    });
    if (key) sessionCache.set(key, result);
    return result;
  } catch (err) {
    log.error("mcp.callTool.error", {
      tool: name,
      durationMs: Date.now() - t0,
      error: (err as Error).message,
    });
    throw err;
  }
}

function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;
  const entries = Object.entries(obj as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

// -----------------------------------------------------------------------------
// Mock mode for offline development.
// -----------------------------------------------------------------------------

function mockToolDescriptors(): McpToolDescriptor[] {
  return [
    {
      name: "kapruka_search_products",
      description: "Search the Kapruka catalog.",
      inputSchema: { type: "object", properties: { q: { type: "string" } }, required: ["q"] },
    },
    {
      name: "kapruka_get_product",
      description: "Get product detail.",
      inputSchema: {
        type: "object",
        properties: { product_id: { type: "string" } },
        required: ["product_id"],
      },
    },
    {
      name: "kapruka_list_categories",
      description: "List top-level categories.",
      inputSchema: { type: "object", properties: { depth: { type: "number" } } },
    },
    {
      name: "kapruka_list_delivery_cities",
      description: "Search delivery cities by name or alias.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" }, limit: { type: "number" } },
        required: ["query"],
      },
    },
    {
      name: "kapruka_check_delivery",
      description: "Check delivery rate and perishable rules.",
      inputSchema: {
        type: "object",
        properties: {
          city: { type: "string" },
          delivery_date: { type: "string" },
          product_id: { type: "string" },
        },
        required: ["city", "delivery_date"],
      },
    },
    {
      name: "kapruka_create_order",
      description: "Create a guest-checkout order.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "kapruka_track_order",
      description: "Track an order by order number.",
      inputSchema: {
        type: "object",
        properties: { order_number: { type: "string" } },
        required: ["order_number"],
      },
    },
  ];
}

async function callMockTool(name: string, args: Record<string, unknown>): Promise<McpCallResult> {
  await new Promise((r) => setTimeout(r, 120));
  switch (name) {
    case "kapruka_search_products": {
      const items = [
        {
          id: "mock-1",
          title: "Chocolate Birthday Cake",
          price: { amount: 4500, currency: "LKR" },
          image: "https://placehold.co/600x450?text=Cake",
          inStock: true,
          rating: 4.7,
        },
        {
          id: "mock-2",
          title: "Surprise Flower Box",
          price: { amount: 3800, currency: "LKR" },
          image: "https://placehold.co/600x450?text=Flowers",
          inStock: true,
        },
        {
          id: "mock-3",
          title: "Premium Gift Hamper",
          price: { amount: 9200, currency: "LKR" },
          image: "https://placehold.co/600x450?text=Hamper",
          inStock: true,
        },
      ];
      return { text: JSON.stringify({ items }), json: { items }, raw: items };
    }
    case "kapruka_list_categories": {
      const categories = [
        { name: "Cakes", url: "https://kapruka.com/cakes" },
        { name: "Flowers", url: "https://kapruka.com/flowers" },
        { name: "Gifts", url: "https://kapruka.com/gifts" },
        { name: "Groceries", url: "https://kapruka.com/groceries" },
      ];
      return { text: JSON.stringify({ categories }), json: { categories }, raw: categories };
    }
    case "kapruka_list_delivery_cities": {
      const items = [
        { canonical: "Colombo", aliases: ["කොළඹ", "கொழும்பு"] },
        { canonical: "Kandy", aliases: ["මහනුවර", "கண்டி"] },
        { canonical: "Galle", aliases: ["ගාල්ල", "காலி"] },
      ].filter((c) =>
        (c.canonical + " " + c.aliases.join(" "))
          .toLowerCase()
          .includes(((args.query as string) ?? "").toLowerCase()),
      );
      return { text: JSON.stringify({ items }), json: { items }, raw: items };
    }
    case "kapruka_check_delivery": {
      const out = {
        city: args.city,
        delivery_date: args.delivery_date,
        rate: { amount: 350, currency: "LKR" },
        perishable_warning: "This is a cake. Confirm the date so it arrives fresh.",
      };
      return { text: JSON.stringify(out), json: out, raw: out };
    }
    case "kapruka_create_order": {
      const out = {
        order_id: `MOCK-${Date.now().toString(36).toUpperCase()}`,
        pay_url: "https://kapruka.com/pay/mock",
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };
      return { text: JSON.stringify(out), json: out, raw: out };
    }
    case "kapruka_track_order": {
      const out = {
        status: "pending",
        order_number: args.order_number,
        steps: [{ label: "Order received", at: new Date().toISOString() }],
      };
      return { text: JSON.stringify(out), json: out, raw: out };
    }
    case "kapruka_get_product": {
      const product = {
        id: args.product_id,
        title: "Chocolate Birthday Cake",
        price: { amount: 4500, currency: "LKR" },
        images: [
          "https://placehold.co/800x600?text=Cake+1",
          "https://placehold.co/800x600?text=Cake+2",
        ],
        in_stock: true,
        variants: [
          { id: "small", label: "1 lb", in_stock: true },
          { id: "large", label: "2 lb", in_stock: true },
        ],
        url: "https://kapruka.com/product/mock",
      };
      return { text: JSON.stringify(product), json: product, raw: product };
    }
    default:
      return { text: JSON.stringify({ ok: true }), json: { ok: true }, raw: null };
  }
}
