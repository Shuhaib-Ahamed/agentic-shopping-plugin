export function formatUSD(usd: number, opts: { decimals?: number } = {}): string {
  const decimals = opts.decimals ?? (usd < 1 ? 3 : 2);
  return `$${usd.toFixed(decimals)}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatPct(p: number, decimals = 1): string {
  return `${(p * 100).toFixed(decimals)}%`;
}

export function formatHour(iso: unknown): string {
  if (typeof iso !== "string") return String(iso ?? "");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCHours().toString().padStart(2, "0")}:00`;
}

export function formatUSDLoose(v: unknown): string {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? 0));
  return formatUSD(Number.isFinite(n) ? n : 0);
}

export function formatMsLoose(v: unknown): string {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? 0));
  return `${Math.round(Number.isFinite(n) ? n : 0)} ms`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 16).replace("T", " ");
}

import type { CSSProperties } from "react";
export const chartTooltipStyle: CSSProperties = {
  background: "var(--color-console-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--color-text)",
};

export const chartTickStyle = { fontSize: 11, fill: "var(--color-text-muted)" };
