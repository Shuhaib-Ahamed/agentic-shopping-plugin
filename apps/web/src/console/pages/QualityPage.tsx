import { Link } from "react-router-dom";
import { KpiCard, StatusDot } from "@/components/atoms/console";
import { FilterBar, MetricGrid } from "@/components/molecules/console";
import { adminApi } from "../api";
import { useAsync } from "../hooks";
import { formatDateTime, formatNumber, formatPct } from "../format";

const FLAG_LABEL: Record<string, string> = {
  hallucinationSuspected: "Hallucination",
  schemaValidationFailed: "Schema invalid",
  refused: "Refused",
  retried: "Retried",
};

export function QualityPage() {
  const { data } = useAsync(() => adminApi.quality());
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display font-bold text-[28px] tracking-[-0.02em]">Quality</h1>
        <p className="text-[13px] text-muted">Tool errors, schema failures, suspected hallucinations.</p>
      </header>
      <FilterBar range="Last 24 hours" />
      <MetricGrid>
        <KpiCard label="Turns" value={data ? formatNumber(data.summary.turns) : "–"} />
        <KpiCard label="Error rate" value={data ? formatPct(data.summary.errorRate) : "–"} />
        <KpiCard label="Schema failures" value={data ? formatNumber(data.summary.schemaFailures) : "–"} />
        <KpiCard label="Hallucinations" value={data ? formatNumber(data.summary.hallucinations) : "–"} />
      </MetricGrid>

      <section className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] p-5">
        <h3 className="font-display font-semibold text-[15px] tracking-[-0.01em] mb-3">Tool error rates</h3>
        {!data ? null : data.toolErrors.length === 0 ? (
          <p className="text-[12px] text-muted">No tool errors in this range.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="text-muted text-[11px] uppercase tracking-[0.06em]">
              <tr>
                <th className="text-left py-1.5">Tool</th>
                <th className="text-right py-1.5">Calls</th>
                <th className="text-right py-1.5">Errors</th>
                <th className="text-right py-1.5">Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.toolErrors.map((t) => (
                <tr key={t.name} className="border-t border-[color:var(--color-border)]">
                  <td className="py-2 font-mono">{t.name}</td>
                  <td className="py-2 text-right tabular">{formatNumber(t.calls)}</td>
                  <td className="py-2 text-right tabular">{formatNumber(t.errors)}</td>
                  <td className="py-2 text-right tabular">
                    <span className={t.errorRate > 0.05 ? "text-[color:var(--color-status-err)]" : "text-muted"}>
                      {formatPct(t.errorRate)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] p-5">
        <h3 className="font-display font-semibold text-[15px] tracking-[-0.01em] mb-3">Flagged turns</h3>
        {!data ? null : data.flaggedTurns.length === 0 ? (
          <p className="text-[12px] text-muted">No flagged turns.</p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)]">
            {data.flaggedTurns.map((t) => (
              <li key={`${t.turnId}-${t.flag}`} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] text-muted flex items-center gap-2">
                    <StatusDot tone="warn" />
                    {FLAG_LABEL[t.flag] ?? t.flag} · {formatDateTime(t.createdAt)}
                  </p>
                  <p className="text-[13px] text-text truncate">{t.summary}</p>
                </div>
                <Link
                  to={`/admin/turns/${encodeURIComponent(t.turnId)}`}
                  className="text-[12px] text-[color:var(--color-cta-deep)] hover:underline whitespace-nowrap"
                >
                  Open trace
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
