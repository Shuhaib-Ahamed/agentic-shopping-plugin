import { makeLogger } from "./_lib/log.js";
import { callTool } from "./_lib/mcp.js";

const log = makeLogger({ ctx: "order-status" });

export const config = {
  runtime: "nodejs",
  maxDuration: 10,
};

// Polled by the SPA every few seconds while a checkout link is open.
// Maps Kapruka's kapruka_track_order result to a small status response.
async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET" } });
  }
  const url = new URL(req.url, "http://localhost");
  const orderId = url.searchParams.get("orderId");
  if (!orderId || orderId.length > 64) {
    log.warn("order-status.badOrderId");
    return new Response(JSON.stringify({ error: "orderId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  log.info("order-status.request", { orderId });
  const t0 = Date.now();
  try {
    const result = await callTool("kapruka_track_order", { order_number: orderId });
    const data = (result.json ?? {}) as Record<string, unknown>;
    const status = inferStatus(data, result.text);
    const trackingUrl = (data.tracking_url as string | undefined) ?? undefined;
    log.info("order-status.ok", {
      orderId,
      status,
      hasTrackingUrl: Boolean(trackingUrl),
      durationMs: Date.now() - t0,
    });
    return new Response(JSON.stringify({ status, trackingUrl }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    log.error("order-status.error", {
      orderId,
      durationMs: Date.now() - t0,
      error: (err as Error).message,
    });
    return new Response(
      JSON.stringify({ error: "track failed", message: (err as Error).message }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}

export type OrderStatus = "pending" | "paid" | "processing" | "dispatched" | "delivered" | "failed";

/**
 * Map Kapruka's free-form order status onto the SPA's tracking machine:
 * pending → paid → processing → dispatched → delivered, with failed terminal.
 * Falls back to scanning the tool's prose when the JSON lacks a status field,
 * so a text-only MCP reply still advances the timeline.
 */
function inferStatus(data: Record<string, unknown>, text: string): OrderStatus {
  const raw = String(
    data.status ?? data.fulfillment_status ?? data.payment_status ?? "",
  ).toLowerCase();
  const haystack = raw || text.toLowerCase();
  if (/deliver/.test(haystack) && !/out\s+for\s+delivery/.test(haystack)) return "delivered";
  if (/dispatch|shipped|out\s+for\s+delivery|in\s+transit|courier/.test(haystack))
    return "dispatched";
  if (/fail|cancel|reject|expire|refund/.test(haystack)) return "failed";
  if (/process|prepar|packing|confirm/.test(haystack)) return "processing";
  if (/paid|completed|success/.test(haystack)) return "paid";
  return "pending";
}

export const GET = handler;
