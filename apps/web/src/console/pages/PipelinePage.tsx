import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { KpiCard, ModelPill } from "@/components/atoms/console";
import { FilterBar, MetricGrid } from "@/components/molecules/console";
import { adminApi } from "../api";
import { formatMs, formatNumber, formatPct, formatUSD } from "../format";
import { useAsync } from "../hooks";

const KIND_COLORS: Record<string, string> = {
  input: "var(--color-series-5)",
  stage: "var(--color-series-1)",
  mcp: "var(--color-series-3)",
  ui: "var(--color-series-2)",
  output: "var(--color-series-4)",
};

export function PipelinePage() {
  const { data } = useAsync(() => adminApi.pipeline());
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display font-bold text-[28px] tracking-[-0.02em]">Pipeline</h1>
        <p className="text-[13px] text-muted">
          Aggregated topology over the range. Where the agent spends its time and money.
        </p>
      </header>
      <FilterBar range="Last 24 hours" />

      <MetricGrid>
        <KpiCard label="Nodes" value={data ? formatNumber(data.nodes.length) : "–"} />
        <KpiCard label="Edges" value={data ? formatNumber(data.edges.length) : "–"} />
        <KpiCard
          label="Total cost"
          value={data ? formatUSD(data.nodes.reduce((a, n) => a + n.costShareUSD, 0)) : "–"}
        />
        <KpiCard
          label="Avg edge count"
          value={
            data && data.edges.length > 0
              ? (data.edges.reduce((a, e) => a + e.count, 0) / data.edges.length).toFixed(1)
              : "–"
          }
        />
      </MetricGrid>

      <section className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] p-5">
        <header className="flex items-baseline justify-between mb-3">
          <h3 className="font-display font-semibold text-[15px] tracking-[-0.01em]">Nodes</h3>
          <span className="text-[11px] text-muted">
            Click a recent turn to jump into its narrative
          </span>
        </header>
        {!data ? null : (
          <table className="w-full text-[13px]">
            <thead className="text-muted text-[11px] uppercase tracking-[0.06em]">
              <tr>
                <th className="text-left py-1.5">Node</th>
                <th className="text-left py-1.5">Kind</th>
                <th className="text-right py-1.5">Calls</th>
                <th className="text-right py-1.5">Avg latency</th>
                <th className="text-right py-1.5">Error rate</th>
                <th className="text-right py-1.5">Cost share</th>
                <th className="text-left py-1.5 pl-3">Recent turns</th>
              </tr>
            </thead>
            <tbody>
              {data.nodes.map((n) => (
                <tr key={n.id} className="border-t border-[color:var(--color-border)]">
                  <td className="py-2 pr-2">
                    {n.kind === "stage" ? (
                      <ModelPill model={n.label} />
                    ) : (
                      <span className="font-mono">{n.label}</span>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    <span
                      className="inline-flex items-center gap-1.5 text-[12px]"
                      style={{ color: KIND_COLORS[n.kind] ?? "var(--color-text)" }}
                    >
                      <span
                        aria-hidden
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: KIND_COLORS[n.kind] }}
                      />
                      {n.kind}
                    </span>
                  </td>
                  <td className="py-2 text-right tabular">{formatNumber(n.calls)}</td>
                  <td className="py-2 text-right tabular">{formatMs(n.avgLatencyMs)}</td>
                  <td className="py-2 text-right tabular">
                    <span
                      className={
                        n.errorRate > 0.05 ? "text-[color:var(--color-status-err)]" : "text-muted"
                      }
                    >
                      {formatPct(n.errorRate)}
                    </span>
                  </td>
                  <td className="py-2 text-right tabular">{formatUSD(n.costShareUSD)}</td>
                  <td className="py-2 pl-3">
                    <RecentTurnLinks ids={n.recentTurnIds ?? []} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] p-5">
        <h3 className="font-display font-semibold text-[15px] tracking-[-0.01em] mb-3">
          Top edges
        </h3>
        <p className="sr-only">Edges showing how the agent flows between pipeline nodes.</p>
        {!data ? null : (
          <ul className="divide-y divide-[color:var(--color-border)]">
            {data.edges
              .slice()
              .sort((a, b) => b.count - a.count)
              .slice(0, 20)
              .map((e) => (
                <li
                  key={`${e.from}-${e.to}`}
                  className="flex items-center justify-between py-2 text-[13px]"
                >
                  <span className="font-mono text-muted">
                    {e.from} <span className="text-text">→</span> {e.to}
                  </span>
                  <span className="tabular">{formatNumber(e.count)}</span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RecentTurnLinks({ ids }: { ids: string[] }) {
  if (ids.length === 0) {
    return <span className="text-[11px] text-muted">-</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {ids.slice(0, 5).map((id, i) => (
        <Link
          key={id}
          to={`/admin/turns/${encodeURIComponent(id)}`}
          title={id}
          className="inline-flex items-center gap-0.5 px-1.5 h-5 rounded-md font-mono text-[10px] bg-[color:var(--color-console-sunken)] hover:bg-[color:var(--color-cta-soft)] hover:text-[color:var(--color-cta-deep)] border border-[color:var(--color-border)] cursor-pointer transition-colors"
        >
          {`#${i + 1}`}
          <ArrowUpRight size={9} aria-hidden />
        </Link>
      ))}
    </div>
  );
}
