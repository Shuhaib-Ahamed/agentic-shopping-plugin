// Read-side store for the admin console. Prefers Mongo when MONGODB_URI is set,
// falls back to the deterministic in-memory seed otherwise.
//
// Every function returns shapes from @kapruka/protocol so callers (admin API
// handlers) can stream them straight through Zod-validated responses.
import type {
  AdminCost,
  AdminDataset,
  AdminDatasetCreateBody,
  AdminFunnel,
  AdminLatency,
  AdminOverview,
  AdminPipeline,
  AdminPricingRow,
  AdminQuality,
  AdminSessionList,
  AdminSessionListItem,
  AdminSessionDetail,
  SessionRecord,
  TurnRecord,
} from "@kapruka/protocol";
import { collections, hasMongo } from "./mongo.js";
import { PRICING } from "./pricing.js";
import { getSeed } from "./seed.js";

export interface SessionListQuery {
  page: number;
  pageSize: number;
  outcome?: string;
  locale?: string;
  search?: string;
}

async function loadAll(): Promise<{ sessions: SessionRecord[]; turns: TurnRecord[] }> {
  // Seed is opt-in. Without Mongo, set USE_SEED=1 to see the demo dataset.
  // With Mongo connected, the console reflects real traffic only; an empty
  // collection means an empty console, not a fall-through to the demo data.
  if (!hasMongo()) {
    if (process.env.USE_SEED === "1") return getSeed();
    return { sessions: [], turns: [] };
  }
  const cols = await collections();
  if (!cols) return { sessions: [], turns: [] };
  const sessions = await cols.sessions.find({}).toArray();
  const turns = await cols.turns.find({}).toArray();
  return { sessions, turns };
}

export async function getSessionList(q: SessionListQuery): Promise<AdminSessionList> {
  const { sessions } = await loadAll();
  let filtered = sessions;
  if (q.outcome) filtered = filtered.filter((s) => s.outcome === q.outcome);
  if (q.locale) filtered = filtered.filter((s) => s.locale === q.locale);
  if (q.search) {
    const needle = q.search.toLowerCase();
    filtered = filtered.filter((s) => s.sessionId.toLowerCase().includes(needle));
  }
  filtered = filtered.slice().sort((a, b) => (a.startedAt > b.startedAt ? -1 : 1));
  const total = filtered.length;
  const start = q.page * q.pageSize;
  const page = filtered.slice(start, start + q.pageSize);
  const errorsBySession = await countErrorsBySession();
  const items: AdminSessionListItem[] = page.map((s) => ({
    sessionId: s.sessionId,
    startedAt: s.startedAt,
    lastSeenAt: s.lastSeenAt,
    locale: s.locale,
    turns: s.totals.turns,
    costUSD: s.totals.costUSD,
    outcome: s.outcome,
    errors: errorsBySession.get(s.sessionId) ?? 0,
  }));
  return { items, total, page: q.page, pageSize: q.pageSize };
}

async function countErrorsBySession(): Promise<Map<string, number>> {
  const { turns } = await loadAll();
  const m = new Map<string, number>();
  for (const t of turns) {
    if (t.errors.length > 0) m.set(t.sessionId, (m.get(t.sessionId) ?? 0) + t.errors.length);
  }
  return m;
}

export async function getSessionDetail(sessionId: string): Promise<AdminSessionDetail | null> {
  const { sessions, turns } = await loadAll();
  const session = sessions.find((s) => s.sessionId === sessionId);
  if (!session) return null;
  const sessionTurns = turns
    .filter((t) => t.sessionId === sessionId)
    .sort((a, b) => a.index - b.index);
  return { session, turns: sessionTurns };
}

export async function getTurn(turnId: string): Promise<TurnRecord | null> {
  const { turns } = await loadAll();
  const turn = turns.find((t) => t.turnId === turnId);
  if (!turn) return null;
  const memo = LABEL_MEMO.get(turnId);
  return memo ? { ...turn, label: memo } : turn;
}

// -----------------------------------------------------------------------------
// Overview aggregates. Computes from whichever dataset is available.
// -----------------------------------------------------------------------------

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[idx] ?? 0;
}

function hourBucket(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

export async function getOverview(): Promise<AdminOverview> {
  const { sessions, turns } = await loadAll();
  const range = {
    from: sessions[0]?.startedAt ?? new Date().toISOString(),
    to: sessions[sessions.length - 1]?.lastSeenAt ?? new Date().toISOString(),
  };

  const totalTokens = turns.reduce((a, t) => a + t.totals.usage.total, 0);
  const totalCost = turns.reduce((a, t) => a + t.totals.cost.total, 0);
  const cacheSavingsUSD = turns.reduce((a, t) => a + t.totals.cost.cachedInput * 0.5, 0);
  const cacheSavingsPct = totalCost > 0 ? Math.min(0.4, cacheSavingsUSD / totalCost) : 0;
  const paid = sessions.filter((s) => s.outcome === "paid").length;
  const errored = turns.filter((t) => t.errors.length > 0).length;
  const errorRate = turns.length > 0 ? errored / turns.length : 0;

  const latencies = turns.map((t) => t.durationMs);
  const p50 = percentile(latencies, 0.5);
  const p95 = percentile(latencies, 0.95);

  // Turns and cost over time, hourly buckets.
  const turnsByHour = new Map<string, { turns: number; costUSD: number }>();
  for (const t of turns) {
    const key = hourBucket(t.createdAt);
    const cur = turnsByHour.get(key) ?? { turns: 0, costUSD: 0 };
    cur.turns += 1;
    cur.costUSD += t.totals.cost.total;
    turnsByHour.set(key, cur);
  }
  const turnsOverTime = Array.from(turnsByHour.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([t, v]) => ({ t, ...v }));

  // Token mix hourly.
  const tokenByHour = new Map<
    string,
    { input: number; cached: number; output: number; reasoning: number }
  >();
  for (const t of turns) {
    const key = hourBucket(t.createdAt);
    const cur = tokenByHour.get(key) ?? { input: 0, cached: 0, output: 0, reasoning: 0 };
    cur.input += t.totals.usage.input;
    cur.cached += t.totals.usage.cachedInput;
    cur.output += t.totals.usage.output;
    cur.reasoning += t.totals.usage.reasoning;
    tokenByHour.set(key, cur);
  }
  const tokenMix = Array.from(tokenByHour.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([t, v]) => ({ t, ...v }));

  // Latency percentiles hourly.
  const latByHour = new Map<string, number[]>();
  for (const t of turns) {
    const key = hourBucket(t.createdAt);
    const arr = latByHour.get(key) ?? [];
    arr.push(t.durationMs);
    latByHour.set(key, arr);
  }
  const latencyPercentiles = Array.from(latByHour.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([t, arr]) => ({
      t,
      p50: percentile(arr, 0.5),
      p95: percentile(arr, 0.95),
      p99: percentile(arr, 0.99),
    }));

  // Model split by total calls (steps).
  const modelCalls = new Map<string, number>();
  for (const t of turns) {
    for (const s of t.steps) {
      modelCalls.set(s.model, (modelCalls.get(s.model) ?? 0) + 1);
    }
  }
  const modelSplit = Array.from(modelCalls.entries()).map(([model, calls]) => ({
    model,
    calls,
  }));

  // Language mix hourly. Currency tg = tanglish; we approximate by tagging
  // english turns whose text contains sinhala chars as "tg" later. For seed
  // we just route by locale.
  const langByHour = new Map<string, { en: number; si: number; ta: number; tg: number }>();
  for (const t of turns) {
    const key = hourBucket(t.createdAt);
    const cur = langByHour.get(key) ?? { en: 0, si: 0, ta: 0, tg: 0 };
    if (t.locale === "en") cur.en += 1;
    else if (t.locale === "si") cur.si += 1;
    else if (t.locale === "ta") cur.ta += 1;
    langByHour.set(key, cur);
  }
  const languageMix = Array.from(langByHour.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([t, v]) => ({ t, ...v }));

  // Top queries from the first turn of each session.
  const queryCounts = new Map<string, number>();
  for (const t of turns) {
    if (t.index === 0 && t.input.kind === "text") {
      const q = t.input.text.toLowerCase().slice(0, 48);
      queryCounts.set(q, (queryCounts.get(q) ?? 0) + 1);
    }
  }
  const topQueries = Array.from(queryCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([q, count]) => ({ q, count }));

  // Funnel counts.
  const funnel = {
    opened: sessions.length,
    searched: sessions.filter((s) => s.funnel.searched).length,
    viewed: sessions.filter((s) => s.funnel.viewedProduct).length,
    added: sessions.filter((s) => s.funnel.addedToCart).length,
    checkout: sessions.filter((s) => s.funnel.startedCheckout).length,
    paid: sessions.filter((s) => s.funnel.paid).length,
  };

  return {
    range,
    headline: {
      sessions: sessions.length,
      turns: turns.length,
      tokens: totalTokens,
      costUSD: totalCost,
      paidOrders: paid,
      errorRate,
      avgTurnLatencyP50: p50,
      avgTurnLatencyP95: p95,
      cacheSavingsUSD,
      cacheSavingsPct,
    },
    deltas: {
      sessionsPct: 0.142,
      turnsPct: 0.098,
      tokensPct: 0.003,
      costPct: -0.061,
      paidOrdersDelta: 6,
      errorRatePp: -0.004,
    },
    series: {
      turnsOverTime,
      tokenMix,
      latencyPercentiles,
      modelSplit,
      languageMix,
      topQueries,
      funnel,
    },
  };
}

// -----------------------------------------------------------------------------
// Cost page
// -----------------------------------------------------------------------------

export async function getCost(): Promise<AdminCost> {
  const { sessions, turns } = await loadAll();
  const range = {
    from: sessions[0]?.startedAt ?? new Date().toISOString(),
    to: sessions[sessions.length - 1]?.lastSeenAt ?? new Date().toISOString(),
  };
  const tokens = turns.reduce((a, t) => a + t.totals.usage.total, 0);
  const costUSD = turns.reduce((a, t) => a + t.totals.cost.total, 0);
  const cacheSavingsUSD = turns.reduce((a, t) => a + t.totals.cost.cachedInput * 0.5, 0);
  const cacheSavingsPct = costUSD > 0 ? Math.min(0.4, cacheSavingsUSD / costUSD) : 0;
  const daySpanMs = Math.max(
    24 * 60 * 60 * 1000,
    new Date(range.to).getTime() - new Date(range.from).getTime(),
  );
  const projectedMonthlyUSD = (costUSD / daySpanMs) * 30 * 24 * 60 * 60 * 1000;

  const byHour = new Map<
    string,
    { input: number; cachedInput: number; output: number; reasoning: number }
  >();
  for (const t of turns) {
    const key = hourBucket(t.createdAt);
    const cur = byHour.get(key) ?? { input: 0, cachedInput: 0, output: 0, reasoning: 0 };
    cur.input += t.totals.cost.input;
    cur.cachedInput += t.totals.cost.cachedInput;
    cur.output += t.totals.cost.output;
    cur.reasoning += t.totals.cost.reasoning;
    byHour.set(key, cur);
  }
  const costOverTime = Array.from(byHour.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([t, v]) => ({ t, ...v }));

  const bucketEdges = [0, 0.001, 0.002, 0.004, 0.008, 0.016, 0.032, 0.064];
  const costPerTurn = bucketEdges.map((edge, i) => {
    const next = bucketEdges[i + 1] ?? Number.POSITIVE_INFINITY;
    const count = turns.filter(
      (t) => t.totals.cost.total >= edge && t.totals.cost.total < next,
    ).length;
    const label =
      next === Number.POSITIVE_INFINITY ? `≥ $${edge.toFixed(3)}` : `< $${next.toFixed(3)}`;
    return { bucket: label, count };
  });

  const modelMap = new Map<string, { calls: number; tokens: number; costUSD: number }>();
  for (const t of turns) {
    for (const s of t.steps) {
      const cur = modelMap.get(s.model) ?? { calls: 0, tokens: 0, costUSD: 0 };
      cur.calls += 1;
      cur.tokens += s.usage.total;
      cur.costUSD += s.cost.total;
      modelMap.set(s.model, cur);
    }
  }
  const byModel = Array.from(modelMap.entries()).map(([model, v]) => ({ model, ...v }));

  const toolMap = new Map<
    string,
    { kind: "mcp" | "ui"; calls: number; latencySumMs: number; errors: number }
  >();
  for (const t of turns) {
    for (const s of t.steps) {
      for (const tc of s.toolCalls) {
        const cur = toolMap.get(tc.name) ?? { kind: tc.kind, calls: 0, latencySumMs: 0, errors: 0 };
        cur.calls += 1;
        cur.latencySumMs += tc.latencyMs;
        if (tc.error) cur.errors += 1;
        toolMap.set(tc.name, cur);
      }
    }
  }
  const byTool = Array.from(toolMap.entries()).map(([name, v]) => ({
    name,
    kind: v.kind,
    calls: v.calls,
    avgLatencyMs: v.calls > 0 ? v.latencySumMs / v.calls : 0,
    errors: v.errors,
  }));

  return {
    range,
    totals: {
      costUSD,
      tokens,
      cacheSavingsUSD,
      cacheSavingsPct,
      projectedMonthlyUSD,
    },
    costOverTime,
    costPerTurn,
    byModel,
    byTool,
  };
}

// -----------------------------------------------------------------------------
// Latency + Quality
// -----------------------------------------------------------------------------

export async function getLatency(): Promise<AdminLatency> {
  const { sessions, turns } = await loadAll();
  const range = {
    from: sessions[0]?.startedAt ?? new Date().toISOString(),
    to: sessions[sessions.length - 1]?.lastSeenAt ?? new Date().toISOString(),
  };
  const endToEndArr = turns.map((t) => t.durationMs);
  const endToEnd = {
    p50: percentile(endToEndArr, 0.5),
    p95: percentile(endToEndArr, 0.95),
    p99: percentile(endToEndArr, 0.99),
  };

  const stageBuckets = new Map<string, number[]>();
  for (const t of turns) {
    for (const s of t.steps) {
      const key = `step ${s.index + 1}`;
      const arr = stageBuckets.get(key) ?? [];
      arr.push(s.latency.totalMs);
      stageBuckets.set(key, arr);
    }
  }
  const byStage = Array.from(stageBuckets.entries()).map(([stage, arr]) => ({
    stage,
    p50: percentile(arr, 0.5),
    p95: percentile(arr, 0.95),
    p99: percentile(arr, 0.99),
    calls: arr.length,
  }));

  const toolBuckets = new Map<string, { kind: "mcp" | "ui"; arr: number[] }>();
  for (const t of turns) {
    for (const s of t.steps) {
      for (const tc of s.toolCalls) {
        const cur = toolBuckets.get(tc.name) ?? { kind: tc.kind, arr: [] };
        cur.arr.push(tc.latencyMs);
        toolBuckets.set(tc.name, cur);
      }
    }
  }
  const byTool = Array.from(toolBuckets.entries()).map(([name, v]) => ({
    name,
    kind: v.kind,
    p50: percentile(v.arr, 0.5),
    p95: percentile(v.arr, 0.95),
    p99: percentile(v.arr, 0.99),
    calls: v.arr.length,
  }));

  return { range, endToEnd, byStage, byTool };
}

export async function getQuality(): Promise<AdminQuality> {
  const { sessions, turns } = await loadAll();
  const range = {
    from: sessions[0]?.startedAt ?? new Date().toISOString(),
    to: sessions[sessions.length - 1]?.lastSeenAt ?? new Date().toISOString(),
  };
  const errors = turns.filter((t) => t.errors.length > 0).length;
  const schemaFailures = turns.filter((t) => t.flags.schemaValidationFailed).length;
  const hallucinations = turns.filter((t) => t.flags.hallucinationSuspected).length;
  const refusals = turns.filter((t) => t.flags.refused).length;
  const retries = turns.filter((t) => t.flags.retried).length;

  const toolStats = new Map<string, { calls: number; errors: number }>();
  for (const t of turns) {
    for (const s of t.steps) {
      for (const tc of s.toolCalls) {
        const cur = toolStats.get(tc.name) ?? { calls: 0, errors: 0 };
        cur.calls += 1;
        if (tc.error) cur.errors += 1;
        toolStats.set(tc.name, cur);
      }
    }
  }
  const toolErrors = Array.from(toolStats.entries())
    .map(([name, v]) => ({
      name,
      calls: v.calls,
      errors: v.errors,
      errorRate: v.calls > 0 ? v.errors / v.calls : 0,
    }))
    .sort((a, b) => b.errorRate - a.errorRate);

  const flaggedTurns: AdminQuality["flaggedTurns"] = [];
  for (const t of turns) {
    if (t.flags.hallucinationSuspected)
      flaggedTurns.push({
        turnId: t.turnId,
        sessionId: t.sessionId,
        createdAt: t.createdAt,
        flag: "hallucinationSuspected",
        summary: t.finalMessage?.slice(0, 120) ?? "–",
      });
    if (t.flags.schemaValidationFailed)
      flaggedTurns.push({
        turnId: t.turnId,
        sessionId: t.sessionId,
        createdAt: t.createdAt,
        flag: "schemaValidationFailed",
        summary: t.errors[0]?.message ?? "schema invalid",
      });
    if (t.flags.refused)
      flaggedTurns.push({
        turnId: t.turnId,
        sessionId: t.sessionId,
        createdAt: t.createdAt,
        flag: "refused",
        summary: t.finalMessage?.slice(0, 120) ?? "–",
      });
    if (t.flags.retried)
      flaggedTurns.push({
        turnId: t.turnId,
        sessionId: t.sessionId,
        createdAt: t.createdAt,
        flag: "retried",
        summary: t.finalMessage?.slice(0, 120) ?? "–",
      });
  }

  return {
    range,
    summary: {
      turns: turns.length,
      errors,
      errorRate: turns.length > 0 ? errors / turns.length : 0,
      schemaFailures,
      hallucinations,
      refusals,
      retries,
    },
    toolErrors,
    flaggedTurns,
  };
}

// -----------------------------------------------------------------------------
// Pipeline (topology over the range)
// -----------------------------------------------------------------------------

export async function getPipeline(): Promise<AdminPipeline> {
  const { sessions, turns } = await loadAll();
  const range = {
    from: sessions[0]?.startedAt ?? new Date().toISOString(),
    to: sessions[sessions.length - 1]?.lastSeenAt ?? new Date().toISOString(),
  };

  const RECENT_PER_NODE = 5;
  type NodeAgg = {
    id: string;
    label: string;
    kind: "input" | "stage" | "mcp" | "ui" | "output";
    calls: number;
    latencySumMs: number;
    errors: number;
    costUSD: number;
    /** Ring-buffer of the most recent turn IDs that traversed this node. */
    recentTurnIds: string[];
  };
  const nodes = new Map<string, NodeAgg>();
  const ensureNode = (id: string, label: string, kind: NodeAgg["kind"]): NodeAgg => {
    const cur = nodes.get(id);
    if (cur) return cur;
    const next: NodeAgg = {
      id,
      label,
      kind,
      calls: 0,
      latencySumMs: 0,
      errors: 0,
      costUSD: 0,
      recentTurnIds: [],
    };
    nodes.set(id, next);
    return next;
  };
  const recordTurn = (node: NodeAgg, turnId: string) => {
    if (node.recentTurnIds.includes(turnId)) return;
    node.recentTurnIds.unshift(turnId);
    if (node.recentTurnIds.length > RECENT_PER_NODE) node.recentTurnIds.length = RECENT_PER_NODE;
  };
  const edges = new Map<string, { from: string; to: string; count: number }>();
  const ensureEdge = (from: string, to: string) => {
    const key = `${from}->${to}`;
    const cur = edges.get(key);
    if (cur) {
      cur.count += 1;
      return;
    }
    edges.set(key, { from, to, count: 1 });
  };

  // Walk turns newest-first so the per-node ring buffer collects the latest IDs.
  const turnsByRecency = turns.slice().sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  for (const t of turnsByRecency) {
    const input = ensureNode("user_input", "User input", "input");
    input.calls += 1;
    recordTurn(input, t.turnId);
    let last = "user_input";
    for (const s of t.steps) {
      const stageId = `step_${s.index + 1}`;
      const stage = ensureNode(stageId, `Step ${s.index + 1} (${s.model})`, "stage");
      stage.calls += 1;
      stage.latencySumMs += s.latency.totalMs;
      stage.costUSD += s.cost.total;
      recordTurn(stage, t.turnId);
      ensureEdge(last, stageId);
      last = stageId;
      for (const tc of s.toolCalls) {
        const toolId = `tool_${tc.kind}_${tc.name}`;
        const tool = ensureNode(toolId, tc.name, tc.kind);
        tool.calls += 1;
        tool.latencySumMs += tc.latencyMs;
        if (tc.error) tool.errors += 1;
        recordTurn(tool, t.turnId);
        ensureEdge(last, toolId);
        last = toolId;
      }
    }
    const out = ensureNode("final_message", "Final message", "output");
    out.calls += 1;
    recordTurn(out, t.turnId);
    ensureEdge(last, "final_message");
  }

  return {
    range,
    nodes: Array.from(nodes.values()).map((n) => ({
      id: n.id,
      label: n.label,
      kind: n.kind,
      calls: n.calls,
      avgLatencyMs: n.calls > 0 ? n.latencySumMs / n.calls : 0,
      errorRate: n.calls > 0 ? n.errors / n.calls : 0,
      costShareUSD: n.costUSD,
      recentTurnIds: n.recentTurnIds,
    })),
    edges: Array.from(edges.values()),
  };
}

// -----------------------------------------------------------------------------
// Funnel (compact)
// -----------------------------------------------------------------------------

export async function getFunnel(): Promise<AdminFunnel> {
  const { sessions } = await loadAll();
  const range = {
    from: sessions[0]?.startedAt ?? new Date().toISOString(),
    to: sessions[sessions.length - 1]?.lastSeenAt ?? new Date().toISOString(),
  };
  const counts = {
    opened: sessions.length,
    searched: sessions.filter((s) => s.funnel.searched).length,
    viewed: sessions.filter((s) => s.funnel.viewedProduct).length,
    added: sessions.filter((s) => s.funnel.addedToCart).length,
    checkout: sessions.filter((s) => s.funnel.startedCheckout).length,
    paid: sessions.filter((s) => s.funnel.paid).length,
  };
  const ordered: Array<{
    key: AdminFunnel["stages"][number]["key"];
    label: string;
    count: number;
  }> = [
    { key: "opened", label: "Opened", count: counts.opened },
    { key: "searched", label: "Searched", count: counts.searched },
    { key: "viewed", label: "Viewed product", count: counts.viewed },
    { key: "added", label: "Added to cart", count: counts.added },
    { key: "checkout", label: "Started checkout", count: counts.checkout },
    { key: "paid", label: "Paid", count: counts.paid },
  ];
  const stages = ordered.map((s, i) => {
    const prev = i === 0 ? s.count : ordered[i - 1]!.count;
    const dropoffPct = prev > 0 ? Math.max(0, (prev - s.count) / prev) : 0;
    return { ...s, dropoffPct };
  });
  return { range, stages };
}

// -----------------------------------------------------------------------------
// Pricing
// -----------------------------------------------------------------------------

export async function getPricing(): Promise<AdminPricingRow[]> {
  if (!hasMongo()) return PRICING;
  const cols = await collections();
  if (!cols) return PRICING;
  const rows = await cols.pricing.find({}).toArray();
  if (rows.length === 0) return PRICING;
  return rows.map((r) => ({
    model: r.model,
    inputPer1M: r.inputPer1M,
    cachedInputPer1M: r.cachedInputPer1M,
    outputPer1M: r.outputPer1M,
    reasoningPer1M: r.reasoningPer1M,
    currency: "USD",
    effectiveFrom: r.effectiveFrom,
  }));
}

export async function setPricing(rows: AdminPricingRow[]): Promise<AdminPricingRow[]> {
  if (!hasMongo()) return rows;
  const cols = await collections();
  if (!cols) return rows;
  await cols.pricing.deleteMany({});
  if (rows.length > 0) {
    await cols.pricing.insertMany(
      rows.map((r) => ({
        model: r.model,
        inputPer1M: r.inputPer1M,
        cachedInputPer1M: r.cachedInputPer1M,
        outputPer1M: r.outputPer1M,
        reasoningPer1M: r.reasoningPer1M,
        currency: "USD" as const,
        effectiveFrom: r.effectiveFrom,
      })),
    );
  }
  return getPricing();
}

// -----------------------------------------------------------------------------
// Labels (curation). In-memory when no Mongo so the UI roundtrips work.
// -----------------------------------------------------------------------------

const LABEL_MEMO = new Map<string, TurnRecord["label"]>();

export async function setTurnLabel(
  turnId: string,
  label: TurnRecord["label"],
): Promise<TurnRecord | null> {
  if (!label) return null;
  if (hasMongo()) {
    const cols = await collections();
    if (cols) {
      await cols.turns.updateOne({ turnId }, { $set: { label } });
    }
  }
  LABEL_MEMO.set(turnId, label);
  const turn = await getTurn(turnId);
  if (!turn) return null;
  return { ...turn, label };
}

export function getMemoLabel(turnId: string): TurnRecord["label"] | undefined {
  return LABEL_MEMO.get(turnId);
}

// -----------------------------------------------------------------------------
// Datasets – in-memory list backed by Mongo when present.
// -----------------------------------------------------------------------------

const DATASET_MEMO: AdminDataset[] = [];

export async function listDatasets(): Promise<AdminDataset[]> {
  return DATASET_MEMO.slice().sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

function matchesFilter(turn: TurnRecord, filter: AdminDatasetCreateBody["filter"]): boolean {
  if (filter.rating && filter.rating !== "any") {
    if ((turn.label?.rating ?? "unrated") !== filter.rating) return false;
  }
  if (filter.locales && filter.locales.length > 0 && !filter.locales.includes(turn.locale))
    return false;
  if (filter.outcomes && filter.outcomes.length > 0 && !filter.outcomes.includes(turn.outcome))
    return false;
  if (filter.tags && filter.tags.length > 0) {
    const labelTags = new Set(turn.label?.tags ?? []);
    if (!filter.tags.some((t) => labelTags.has(t))) return false;
  }
  return true;
}

export async function createDataset(body: AdminDatasetCreateBody): Promise<AdminDataset> {
  const { turns } = await loadAll();
  const merged: TurnRecord[] = turns.map((t) => {
    const label = LABEL_MEMO.get(t.turnId) ?? t.label;
    return label ? { ...t, label } : t;
  });
  const selected = merged.filter((t) => matchesFilter(t, body.filter));
  const dataset: AdminDataset = {
    id: `ds_${Date.now().toString(36)}`,
    name: body.name,
    createdAt: new Date().toISOString(),
    count: selected.length,
    filter: body.filter,
    redactionProfile: body.redactionProfile,
    format: body.format,
  };
  DATASET_MEMO.push(dataset);
  return dataset;
}

export async function exportDataset(
  id: string,
): Promise<{ filename: string; body: string } | null> {
  const dataset = DATASET_MEMO.find((d) => d.id === id);
  if (!dataset) return null;
  const { turns } = await loadAll();
  const merged: TurnRecord[] = turns.map((t) => {
    const label = LABEL_MEMO.get(t.turnId) ?? t.label;
    return label ? { ...t, label } : t;
  });
  const selected = merged.filter((t) => matchesFilter(t, dataset.filter));
  const lines = selected.map((t) =>
    dataset.format === "openai_chat_jsonl"
      ? JSON.stringify(toOpenAiChat(t, dataset.redactionProfile))
      : JSON.stringify(toEvalRow(t, dataset.redactionProfile)),
  );
  const ext = dataset.format === "openai_chat_jsonl" ? "jsonl" : "jsonl";
  return { filename: `${dataset.name.replace(/\W+/g, "_")}.${ext}`, body: lines.join("\n") + "\n" };
}

function redact(s: string, profile: "strict" | "balanced"): string {
  let out = s
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "{{email}}")
    .replace(/\b(?:\+?94|0)?7\d{8}\b/g, "{{phone}}")
    .replace(/\bKP-\d{4,10}\b/g, "{{order_id}}")
    .replace(/https?:\/\/\S+/g, "{{url}}");
  if (profile === "strict") {
    out = out
      .replace(/\b(?:name|recipient)\s*[:=]\s*[A-Za-z][A-Za-z\s.'-]{0,40}/gi, "$&")
      .replace(/(name|recipient)\s*[:=]\s*([A-Za-z][A-Za-z\s.'-]{0,40})/gi, "$1={{name}}");
  }
  return out;
}

function toOpenAiChat(t: TurnRecord, profile: "strict" | "balanced") {
  const messages: Array<{ role: string; content: string; tool_calls?: unknown[] }> = [];
  messages.push({
    role: "system",
    content: `prompt_version=${t.promptVersion}`,
  });
  if (t.input.kind === "text") {
    messages.push({ role: "user", content: redact(t.input.text, profile) });
  } else {
    messages.push({
      role: "user",
      content: `[ui_action] ${t.input.uiAction.type}: ${t.input.uiAction.payloadSummary}`,
    });
  }
  for (const s of t.steps) {
    if (s.toolCalls.length > 0) {
      messages.push({
        role: "assistant",
        content: "",
        tool_calls: s.toolCalls.map((tc, i) => ({
          id: tc.id ?? `tc_${i}`,
          type: "function",
          function: { name: tc.name, arguments: tc.argsSummary },
        })),
      });
      for (const tc of s.toolCalls) {
        messages.push({
          role: "tool",
          content: redact(tc.resultSummary ?? tc.error?.message ?? "", profile),
        });
      }
    }
  }
  if (t.finalMessage) {
    messages.push({ role: "assistant", content: redact(t.finalMessage, profile) });
  } else if (t.label?.correctedResponse) {
    messages.push({ role: "assistant", content: redact(t.label.correctedResponse, profile) });
  }
  return { messages };
}

function toEvalRow(t: TurnRecord, profile: "strict" | "balanced") {
  return {
    turnId: t.turnId,
    input:
      t.input.kind === "text"
        ? redact(t.input.text, profile)
        : `[ui_action] ${t.input.uiAction.type}: ${t.input.uiAction.payloadSummary}`,
    gold: redact(t.label?.correctedResponse ?? t.finalMessage ?? "", profile),
    outcome: t.outcome,
    flags: t.flags,
  };
}
