import type { SessionOutcome } from "@kapruka/protocol";
import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LangPill, StatusDot, type StatusTone } from "@/components/atoms/console";
import { FilterBar, FilterButton } from "@/components/molecules/console";
import { adminApi } from "../api";
import { formatDateTime, formatUSD } from "../format";
import { useAsync } from "../hooks";

const OUTCOMES: Array<{ value: SessionOutcome | "all"; label: string }> = [
  { value: "all", label: "All outcomes" },
  { value: "browsing", label: "Browsing" },
  { value: "carted", label: "Carted" },
  { value: "checkout", label: "Checkout" },
  { value: "paid", label: "Paid" },
  { value: "errored", label: "Errored" },
];

const LOCALES: Array<{ value: string; label: string }> = [
  { value: "all", label: "All locales" },
  { value: "en", label: "English" },
  { value: "si", label: "Sinhala" },
  { value: "ta", label: "Tamil" },
];

const TONE: Record<SessionOutcome, StatusTone> = {
  browsing: "mute",
  carted: "warn",
  checkout: "warn",
  paid: "ok",
  errored: "err",
};

export function SessionsPage() {
  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState<SessionOutcome | "all">("all");
  const [locale, setLocale] = useState<string>("all");
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);

  const params = useMemo(
    () => ({
      page: 0,
      pageSize: 50,
      search: search || undefined,
      outcome: outcome === "all" ? undefined : outcome,
      locale: locale === "all" ? undefined : locale,
    }),
    [search, outcome, locale],
  );
  const { data, loading } = useAsync(() => adminApi.sessions(params), [params]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[28px] tracking-[-0.02em]">Sessions</h1>
          <p className="text-[13px] text-muted">Every conversation, replayable end-to-end.</p>
        </div>
      </header>

      <FilterBar
        range="Last 24 hours"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search session id"
      >
        <div className="relative">
          <FilterButton
            active={outcome !== "all"}
            onClick={() => {
              setOutcomeOpen((v) => !v);
              setLocaleOpen(false);
            }}
          >
            {OUTCOMES.find((o) => o.value === outcome)?.label ?? "Outcome"}
          </FilterButton>
          {outcomeOpen ? (
            <Dropdown onClose={() => setOutcomeOpen(false)}>
              {OUTCOMES.map((o) => (
                <DropdownItem
                  key={o.value}
                  selected={outcome === o.value}
                  onClick={() => {
                    setOutcome(o.value);
                    setOutcomeOpen(false);
                  }}
                >
                  {o.label}
                </DropdownItem>
              ))}
            </Dropdown>
          ) : null}
        </div>
        <div className="relative">
          <FilterButton
            active={locale !== "all"}
            onClick={() => {
              setLocaleOpen((v) => !v);
              setOutcomeOpen(false);
            }}
          >
            {LOCALES.find((l) => l.value === locale)?.label ?? "Locale"}
          </FilterButton>
          {localeOpen ? (
            <Dropdown onClose={() => setLocaleOpen(false)}>
              {LOCALES.map((l) => (
                <DropdownItem
                  key={l.value}
                  selected={locale === l.value}
                  onClick={() => {
                    setLocale(l.value);
                    setLocaleOpen(false);
                  }}
                >
                  {l.label}
                </DropdownItem>
              ))}
            </Dropdown>
          ) : null}
        </div>
      </FilterBar>

      <section className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[color:var(--color-console-sunken)] text-muted">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.06em] text-[11px]">
                Session
              </th>
              <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.06em] text-[11px]">
                Started
              </th>
              <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.06em] text-[11px]">
                Locale
              </th>
              <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.06em] text-[11px] text-right">
                Turns
              </th>
              <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.06em] text-[11px] text-right">
                Cost
              </th>
              <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.06em] text-[11px]">
                Outcome
              </th>
              <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.06em] text-[11px] text-right">
                Errors
              </th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted">
                  Loading sessions...
                </td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted">
                  No sessions match these filters.
                </td>
              </tr>
            ) : (
              data.items.map((s) => (
                <tr
                  key={s.sessionId}
                  className="border-t border-[color:var(--color-border)] hover:bg-[color:var(--color-console-sunken)]/50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-[12px] truncate max-w-[220px]">
                    <Link
                      to={`/admin/sessions/${encodeURIComponent(s.sessionId)}`}
                      className="text-[color:var(--color-cta-deep)] hover:underline"
                    >
                      {s.sessionId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular text-muted">{formatDateTime(s.startedAt)}</td>
                  <td className="px-4 py-3">
                    <LangPill code={(s.locale as "en" | "si" | "ta") ?? "en"} />
                  </td>
                  <td className="px-4 py-3 tabular text-right">{s.turns}</td>
                  <td className="px-4 py-3 tabular text-right">{formatUSD(s.costUSD)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[12px]">
                      <StatusDot tone={TONE[s.outcome]} />
                      {s.outcome}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular text-right">{s.errors}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/sessions/${encodeURIComponent(s.sessionId)}`}
                      className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-text"
                    >
                      Open
                      <ChevronRight size={13} aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Dropdown({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-[var(--z-overlay)]" onClick={onClose} aria-hidden />
      <div className="absolute z-[var(--z-overlay)] mt-1 right-0 min-w-[180px] rounded-xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] shadow-md p-1">
        {children}
      </div>
    </>
  );
}

function DropdownItem({
  children,
  onClick,
  selected,
}: {
  children: React.ReactNode;
  onClick: () => void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "w-full text-left px-3 py-1.5 rounded-lg text-[13px] cursor-pointer " +
        (selected
          ? "bg-[color:var(--color-cta-soft)] text-[color:var(--color-cta-deep)] font-semibold"
          : "hover:bg-[color:var(--color-console-sunken)]")
      }
    >
      {children}
    </button>
  );
}
