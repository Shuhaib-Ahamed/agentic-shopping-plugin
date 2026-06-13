import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard, ModelPill } from "@/components/atoms/console";
import { ChartCard, FilterBar, LegendChip, MetricGrid } from "@/components/molecules/console";
import { adminApi } from "../api";
import { useAsync } from "../hooks";
import {
  chartTickStyle,
  chartTooltipStyle,
  formatHour,
  formatNumber,
  formatPct,
  formatUSD,
} from "../format";

const SERIES = [
  "var(--color-series-1)",
  "var(--color-series-2)",
  "var(--color-series-3)",
  "var(--color-series-4)",
  "var(--color-series-5)",
  "var(--color-series-6)",
];

export function CostPage() {
  const { data, loading, error, reload } = useAsync(() => adminApi.cost());
  const state = error ? "error" : loading ? "loading" : data ? "ready" : "empty";

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[28px] tracking-[-0.02em]">Cost</h1>
          <p className="text-[13px] text-muted">Token spend, cache savings, and where the budget goes.</p>
        </div>
      </header>
      <FilterBar range="Last 24 hours" />

      <MetricGrid>
        <KpiCard label="Total cost" value={data ? formatUSD(data.totals.costUSD) : "–"} />
        <KpiCard label="Tokens" value={data ? formatNumber(data.totals.tokens) : "–"} />
        <KpiCard
          label="Cache savings"
          value={data ? formatUSD(data.totals.cacheSavingsUSD) : "–"}
          hint={data ? formatPct(data.totals.cacheSavingsPct) + " of spend" : undefined}
        />
        <KpiCard label="Projected monthly" value={data ? formatUSD(data.totals.projectedMonthlyUSD) : "–"} />
      </MetricGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Cost over time"
          unit="Hourly USD"
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
              <AreaChart data={data.costOverTime}>
                <CartesianGrid stroke="var(--color-console-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tickFormatter={formatHour} tick={chartTickStyle} />
                <YAxis tick={chartTickStyle} tickFormatter={(v) => `$${Number(v).toFixed(3)}`} />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={formatHour} formatter={(v) => `$${Number(v ?? 0).toFixed(4)}`} />
                <Area dataKey="input" stackId="c" stroke="var(--color-token-input)" fill="var(--color-token-input)" fillOpacity={0.75} />
                <Area dataKey="cachedInput" stackId="c" stroke="var(--color-token-cached)" fill="var(--color-token-cached)" fillOpacity={0.75} />
                <Area dataKey="output" stackId="c" stroke="var(--color-token-output)" fill="var(--color-token-output)" fillOpacity={0.75} />
                <Area dataKey="reasoning" stackId="c" stroke="var(--color-token-reason)" fill="var(--color-token-reason)" fillOpacity={0.75} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Cost per turn"
          unit="Distribution"
          state={state}
          onRetry={reload}
        >
          {data && (
            <ResponsiveContainer>
              <BarChart data={data.costPerTurn}>
                <CartesianGrid stroke="var(--color-console-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bucket" tick={chartTickStyle} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={chartTickStyle} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill="var(--color-series-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Cost by model" unit="USD" state={state} onRetry={reload}>
          {data && (
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.byModel} dataKey="costUSD" nameKey="model" innerRadius={50} outerRadius={88} paddingAngle={2}>
                  {data.byModel.map((_, i) => (
                    <Cell key={i} fill={SERIES[i % SERIES.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => formatUSD(Number(v ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Cost by tool" unit="Calls and errors" state={state} onRetry={reload}>
          {data && (
            <div className="overflow-auto h-full scroll-quiet">
              <table className="w-full text-[12px]">
                <thead className="text-muted">
                  <tr>
                    <th className="text-left py-1.5">Tool</th>
                    <th className="text-right py-1.5">Calls</th>
                    <th className="text-right py-1.5">Avg latency</th>
                    <th className="text-right py-1.5">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byTool.map((t) => (
                    <tr key={t.name} className="border-t border-[color:var(--color-border)]">
                      <td className="py-1.5 font-mono">{t.name}</td>
                      <td className="py-1.5 text-right tabular">{formatNumber(t.calls)}</td>
                      <td className="py-1.5 text-right tabular">{Math.round(t.avgLatencyMs)} ms</td>
                      <td className="py-1.5 text-right tabular">{t.errors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </div>

      {data && data.byModel.length > 0 ? (
        <section className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] p-5">
          <h3 className="font-display font-semibold text-[15px] tracking-[-0.01em] mb-3">By model</h3>
          <ul className="divide-y divide-[color:var(--color-border)]">
            {data.byModel.map((m) => (
              <li key={m.model} className="flex items-center justify-between py-2 text-[13px]">
                <ModelPill model={m.model} />
                <div className="flex items-center gap-6 tabular">
                  <span className="text-muted">{formatNumber(m.calls)} calls</span>
                  <span className="text-muted">{formatNumber(m.tokens)} tokens</span>
                  <span className="text-text">{formatUSD(m.costUSD)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
