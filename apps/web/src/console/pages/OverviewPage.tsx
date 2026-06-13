import type { CSSProperties } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DeltaChip, KpiCard } from "@/components/atoms/console";
import { ChartCard, FilterBar, MetricGrid, LegendChip } from "@/components/molecules/console";
import { adminApi } from "../api";
import { useAsync } from "../hooks";
import { formatHour, formatMs, formatNumber, formatPct, formatUSD } from "../format";

const SERIES = ["var(--color-series-1)", "var(--color-series-2)", "var(--color-series-3)", "var(--color-series-4)", "var(--color-series-5)", "var(--color-series-6)"];

export function OverviewPage() {
  const { data, loading, error, reload } = useAsync(() => adminApi.overview());
  const state = error ? "error" : loading ? "loading" : data ? "ready" : "empty";

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[28px] tracking-[-0.02em]">Overview</h1>
          <p className="text-[13px] text-muted">A glance at the agent's behavior, cost, and quality.</p>
        </div>
      </header>

      <FilterBar range="Last 24 hours" />

      <MetricGrid>
        <KpiCard
          label="Sessions"
          value={data ? formatNumber(data.headline.sessions) : "–"}
          delta={data ? <DeltaChip value={data.deltas.sessionsPct} format="pct" /> : null}
        />
        <KpiCard
          label="Turns"
          value={data ? formatNumber(data.headline.turns) : "–"}
          delta={data ? <DeltaChip value={data.deltas.turnsPct} format="pct" /> : null}
        />
        <KpiCard
          label="Tokens"
          value={data ? formatNumber(data.headline.tokens) : "–"}
          delta={data ? <DeltaChip value={data.deltas.tokensPct} format="pct" /> : null}
        />
        <KpiCard
          label="Cost"
          value={data ? formatUSD(data.headline.costUSD) : "–"}
          delta={data ? <DeltaChip value={data.deltas.costPct} format="pct" invert /> : null}
          hint={data ? `Cache saved ${formatUSD(data.headline.cacheSavingsUSD)}` : undefined}
        />
        <KpiCard
          label="Paid orders"
          value={data ? formatNumber(data.headline.paidOrders) : "–"}
          delta={data ? <DeltaChip value={data.deltas.paidOrdersDelta} format="absolute" /> : null}
        />
        <KpiCard
          label="Error rate"
          value={data ? formatPct(data.headline.errorRate) : "–"}
          delta={data ? <DeltaChip value={data.deltas.errorRatePp} format="ppt" invert /> : null}
        />
        <KpiCard
          label="Turn latency p50"
          value={data ? formatMs(data.headline.avgTurnLatencyP50) : "–"}
        />
        <KpiCard
          label="Turn latency p95"
          value={data ? formatMs(data.headline.avgTurnLatencyP95) : "–"}
        />
      </MetricGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Turns and cost over time"
          unit="Hourly"
          state={state}
          onRetry={reload}
          legend={
            <>
              <LegendChip color="var(--color-series-1)" label="Turns" />
              <LegendChip color="var(--color-series-2)" label="Cost (USD)" pattern="dashed" />
            </>
          }
        >
          {data && (
            <ResponsiveContainer>
              <LineChart data={data.series.turnsOverTime}>
                <CartesianGrid stroke="var(--color-console-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tickFormatter={formatHour} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={formatHour} />
                <Line yAxisId="left" dataKey="turns" stroke="var(--color-series-1)" strokeWidth={2} dot={false} />
                <Line yAxisId="right" dataKey="costUSD" stroke="var(--color-series-2)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Token mix"
          unit="Hourly tokens"
          state={state}
          onRetry={reload}
          legend={
            <>
              <LegendChip color="var(--color-token-input)" label="Input" />
              <LegendChip color="var(--color-token-cached)" label="Cached" />
              <LegendChip color="var(--color-token-output)" label="Output" />
              <LegendChip color="var(--color-token-reason)" label="Reasoning" />
            </>
          }
        >
          {data && (
            <ResponsiveContainer>
              <AreaChart data={data.series.tokenMix}>
                <CartesianGrid stroke="var(--color-console-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tickFormatter={formatHour} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={formatHour} />
                <Area dataKey="input" stackId="t" stroke="var(--color-token-input)" fill="var(--color-token-input)" fillOpacity={0.75} />
                <Area dataKey="cached" stackId="t" stroke="var(--color-token-cached)" fill="var(--color-token-cached)" fillOpacity={0.75} />
                <Area dataKey="output" stackId="t" stroke="var(--color-token-output)" fill="var(--color-token-output)" fillOpacity={0.75} />
                <Area dataKey="reasoning" stackId="t" stroke="var(--color-token-reason)" fill="var(--color-token-reason)" fillOpacity={0.75} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Latency percentiles"
          unit="Hourly milliseconds"
          state={state}
          onRetry={reload}
          legend={
            <>
              <LegendChip color="var(--color-series-1)" label="p50" />
              <LegendChip color="var(--color-series-2)" label="p95" />
              <LegendChip color="var(--color-series-3)" label="p99" />
            </>
          }
        >
          {data && (
            <ResponsiveContainer>
              <LineChart data={data.series.latencyPercentiles}>
                <CartesianGrid stroke="var(--color-console-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tickFormatter={formatHour} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={formatHour} />
                <Line dataKey="p50" stroke="var(--color-series-1)" strokeWidth={2} dot={false} />
                <Line dataKey="p95" stroke="var(--color-series-2)" strokeWidth={2} dot={false} />
                <Line dataKey="p99" stroke="var(--color-series-3)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Model split"
          unit="Calls"
          state={state}
          onRetry={reload}
        >
          {data && (
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.series.modelSplit} dataKey="calls" nameKey="model" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {data.series.modelSplit.map((_, i) => (
                    <Cell key={i} fill={SERIES[i % SERIES.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Language mix"
          unit="Hourly turns"
          state={state}
          onRetry={reload}
          legend={
            <>
              <LegendChip color="var(--color-series-1)" label="EN" />
              <LegendChip color="var(--color-series-2)" label="SI" />
              <LegendChip color="var(--color-series-3)" label="TA" />
              <LegendChip color="var(--color-series-4)" label="TG" />
            </>
          }
        >
          {data && (
            <ResponsiveContainer>
              <BarChart data={data.series.languageMix}>
                <CartesianGrid stroke="var(--color-console-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tickFormatter={formatHour} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={formatHour} />
                <Bar dataKey="en" stackId="l" fill="var(--color-series-1)" />
                <Bar dataKey="si" stackId="l" fill="var(--color-series-2)" />
                <Bar dataKey="ta" stackId="l" fill="var(--color-series-3)" />
                <Bar dataKey="tg" stackId="l" fill="var(--color-series-4)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Conversion funnel"
          unit="Sessions per stage"
          state={state}
          onRetry={reload}
        >
          {data && (
            <ResponsiveContainer>
              <BarChart
                data={[
                  { stage: "Opened", count: data.series.funnel.opened },
                  { stage: "Searched", count: data.series.funnel.searched },
                  { stage: "Viewed", count: data.series.funnel.viewed },
                  { stage: "Added", count: data.series.funnel.added },
                  { stage: "Checkout", count: data.series.funnel.checkout },
                  { stage: "Paid", count: data.series.funnel.paid },
                ]}
                layout="vertical"
              >
                <CartesianGrid stroke="var(--color-console-grid)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--color-series-1)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <section className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] p-5">
        <header className="mb-3">
          <h3 className="font-display font-semibold text-[15px] tracking-[-0.01em]">Top queries</h3>
          <p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted">First message per session</p>
        </header>
        {data && data.series.topQueries.length === 0 ? (
          <p className="text-[12px] text-muted">No queries yet.</p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)]">
            {data?.series.topQueries.map((q) => (
              <li key={q.q} className="flex items-center justify-between py-2 text-[13px]">
                <span className="truncate">{q.q}</span>
                <span className="tabular text-muted">{q.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const tooltipStyle: CSSProperties = {
  background: "var(--color-console-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--color-text)",
};
