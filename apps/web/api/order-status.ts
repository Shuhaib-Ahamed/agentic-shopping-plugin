import { callTool } from "./_lib/mcp";
import { makeLogger } from "./_lib/log";

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
    const status = inferStatus(data);
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

function inferStatus(data: Record<string, unknown>): "pending" | "paid" | "failed" {
  const raw = String(data.status ?? data.payment_status ?? "pending").toLowerCase();
  if (raw.includes("paid") || raw === "completed" || raw === "success") return "paid";
  if (raw.includes("fail") || raw === "cancelled" || raw === "rejected") return "failed";
  return "pending";
}

export const GET = handler;
