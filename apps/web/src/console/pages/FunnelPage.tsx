import { FilterBar } from "@/components/molecules/console";
import { adminApi } from "../api";
import { useAsync } from "../hooks";
import { formatNumber, formatPct } from "../format";

export function FunnelPage() {
  const { data } = useAsync(() => adminApi.funnel());
  const max = data ? Math.max(...data.stages.map((s) => s.count), 1) : 1;
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display font-bold text-[28px] tracking-[-0.02em]">Funnel</h1>
        <p className="text-[13px] text-muted">Drop-off between every stage of the journey.</p>
      </header>
      <FilterBar range="Last 24 hours" />
      <section className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] p-6">
        {!data ? (
          <p className="text-[12px] text-muted">Loading funnel...</p>
        ) : (
          <ul className="space-y-3">
            {data.stages.map((s, i) => (
              <li key={s.key} className="flex items-center gap-4">
                <div className="w-40 shrink-0 text-[13px]">
                  <p className="font-semibold text-text">{s.label}</p>
                  <p className="text-[11px] text-muted">{formatNumber(s.count)} sessions</p>
                </div>
                <div className="flex-1 relative h-9 rounded-lg overflow-hidden bg-[color:var(--color-console-sunken)]">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[color:var(--color-cta)] to-[color:var(--color-cta-hover)]"
                    style={{ width: `${(s.count / max) * 100}%` }}
                  />
                  <span className="absolute inset-0 grid place-items-end pr-3 text-[11px] text-text tabular">
                    {formatNumber(s.count)}
                  </span>
                </div>
                <div className="w-24 text-right text-[12px] tabular">
                  {i === 0 ? (
                    <span className="text-muted">–</span>
                  ) : (
                    <span className={s.dropoffPct > 0.5 ? "text-[color:var(--color-status-err)]" : "text-muted"}>
                      -{formatPct(s.dropoffPct, 1)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
