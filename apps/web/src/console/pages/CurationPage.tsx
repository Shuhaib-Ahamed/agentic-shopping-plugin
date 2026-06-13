import type { TurnRecord } from "@kapruka/protocol";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CurrencyCell, LangPill, ModelPill, StatusDot } from "@/components/atoms/console";
import { FilterBar, FilterButton } from "@/components/molecules/console";
import { ConsoleApiError, adminApi } from "../api";
import { formatDateTime } from "../format";

type Rating = "good" | "bad" | "unrated" | "any";

export function CurationPage() {
  const [rating, setRating] = useState<Rating>("any");
  const [turns, setTurns] = useState<TurnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        // Pull all sessions, then their turns. For the demo dataset this is
        // bounded; for prod a dedicated /api/admin/turns?filter= would replace.
        const list = await adminApi.sessions({ page: 0, pageSize: 200 });
        const details = await Promise.all(
          list.items.map((s) => adminApi.sessionDetail(s.sessionId)),
        );
        const all: TurnRecord[] = details.flatMap((d) => d.turns);
        if (cancelled) return;
        setTurns(all);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof ConsoleApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "load_failed";
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = turns.filter((t) => {
    if (rating === "any") return true;
    return (t.label?.rating ?? "unrated") === rating;
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display font-bold text-[28px] tracking-[-0.02em]">Curation</h1>
        <p className="text-[13px] text-muted">Label turns to feed datasets and evaluation.</p>
      </header>
      <FilterBar range="Last 24 hours">
        {(["any", "unrated", "good", "bad"] as const).map((r) => (
          <FilterButton key={r} active={rating === r} onClick={() => setRating(r)}>
            {r === "any" ? "All ratings" : r}
          </FilterButton>
        ))}
      </FilterBar>

      {loading ? (
        <p className="text-muted text-[13px]">Loading turns...</p>
      ) : error ? (
        <p className="text-[color:var(--color-status-err)] text-[13px]">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted text-[13px]">No turns match this filter.</p>
      ) : (
        <section className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[color:var(--color-console-sunken)] text-muted">
              <tr className="text-left">
                <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.06em] text-[11px]">
                  When
                </th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.06em] text-[11px]">
                  Locale
                </th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.06em] text-[11px]">
                  Model
                </th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.06em] text-[11px]">
                  Outcome
                </th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.06em] text-[11px]">
                  Input
                </th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.06em] text-[11px]">
                  Rating
                </th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.06em] text-[11px] text-right">
                  Cost
                </th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.turnId}
                  className="border-t border-[color:var(--color-border)] hover:bg-[color:var(--color-console-sunken)]/50"
                >
                  <td className="px-4 py-3 tabular text-muted whitespace-nowrap">
                    {formatDateTime(t.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <LangPill code={(t.locale as "en" | "si" | "ta") ?? "en"} />
                  </td>
                  <td className="px-4 py-3">
                    <ModelPill model={t.model} />
                  </td>
                  <td className="px-4 py-3 text-[12px]">{t.outcome}</td>
                  <td className="px-4 py-3 truncate max-w-[320px]">
                    {t.input.kind === "text" ? t.input.text : t.input.uiAction.type}
                  </td>
                  <td className="px-4 py-3">
                    <RatingPill rating={t.label?.rating ?? "unrated"} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <CurrencyCell usd={t.totals.cost.total} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/turns/${encodeURIComponent(t.turnId)}`}
                      className="text-[12px] text-[color:var(--color-cta-deep)] hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function RatingPill({ rating }: { rating: "good" | "bad" | "unrated" }) {
  const tone = rating === "good" ? "ok" : rating === "bad" ? "err" : "mute";
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px]">
      <StatusDot tone={tone} />
      {rating}
    </span>
  );
}
