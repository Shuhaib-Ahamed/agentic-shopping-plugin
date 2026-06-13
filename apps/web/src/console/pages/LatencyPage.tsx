import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiCard } from "@/components/atoms/console";
import { ChartCard, FilterBar, LegendChip, MetricGrid } from "@/components/molecules/console";
import { adminApi } from "../api";
import { chartTickStyle, chartTooltipStyle, formatMs, formatNumber } from "../format";
import { useAsync } from "../hooks";

export function LatencyPage() {
  const { data, loading, error, reload } = useAsync(() => adminApi.latency());
  const state = error ? "error" : loading ? "loading" : data ? "ready" : "empty";

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display font-bold text-[28px] tracking-[-0.02em]">Latency</h1>
        <p className="text-[13px] text-muted">Percentiles per step and per tool.</p>
      </header>
      <FilterBar range="Last 24 hours" />
      <MetricGrid>
        <KpiCard label="End to end p50" value={data ? formatMs(data.endToEnd.p50) : "–"} />
        <KpiCard label="End to end p95" value={data ? formatMs(data.endToEnd.p95) : "–"} />
        <KpiCard label="End to end p99" value={data ? formatMs(data.endToEnd.p99) : "–"} />
        <KpiCard label="Tools tracked" value={data ? formatNumber(data.byTool.length) : "–"} />
      </MetricGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="By step"
          unit="Milliseconds"
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
              <BarChart data={data.byStage}>
                <CartesianGrid
                  stroke="var(--color-console-grid)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis dataKey="stage" tick={chartTickStyle} />
                <YAxis tick={chartTickStyle} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(v) => `${Math.round(Number(v ?? 0))} ms`}
                />
                <Bar dataKey="p50" fill="var(--color-series-1)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="p95" fill="var(--color-series-2)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="p99" fill="var(--color-series-3)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="By tool"
          unit="Milliseconds"
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
              <BarChart data={data.byTool} layout="vertical">
                <CartesianGrid
                  stroke="var(--color-console-grid)"
                  strokeDasharray="3 3"
                  horizontal={false}
                />
                <XAxis type="number" tick={chartTickStyle} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ ...chartTickStyle, fontSize: 10 }}
                  width={140}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(v) => `${Math.round(Number(v ?? 0))} ms`}
                />
                <Bar dataKey="p50" fill="var(--color-series-1)" />
                <Bar dataKey="p95" fill="var(--color-series-2)" />
                <Bar dataKey="p99" fill="var(--color-series-3)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
