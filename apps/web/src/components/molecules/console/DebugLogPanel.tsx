import { useMemo, useState } from "react";
import type { LogEntryRecord } from "@kapruka/protocol";
import { ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/cn";

const LEVEL_COLOR: Record<LogEntryRecord["level"], string> = {
  debug: "var(--color-status-mute)",
  info: "var(--color-cta-deep)",
  warn: "var(--color-status-warn)",
  error: "var(--color-status-err)",
};

const LEVELS: Array<LogEntryRecord["level"]> = ["debug", "info", "warn", "error"];

export function DebugLogPanel({ logs }: { logs: LogEntryRecord[] }) {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [activeLevels, setActiveLevels] = useState<Set<LogEntryRecord["level"]>>(
    () => new Set(LEVELS),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((l) => {
      if (!activeLevels.has(l.level)) return false;
      if (!q) return true;
      if (l.msg.toLowerCase().includes(q)) return true;
      if (l.ctx?.toLowerCase().includes(q)) return true;
      if (l.fields) {
        try {
          if (JSON.stringify(l.fields).toLowerCase().includes(q)) return true;
        } catch {
          // ignore
        }
      }
      return false;
    });
  }, [logs, query, activeLevels]);

  if (logs.length === 0) {
    return (
      <section className="rounded-xl border border-[color:var(--color-border)] p-3 bg-[color:var(--color-console-card)]">
        <h4 className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted">
          Pipeline logs
        </h4>
        <p className="mt-2 text-[12px] text-muted">No structured logs were captured for this turn.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-console-card)] overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[color:var(--color-border)]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-text cursor-pointer"
          aria-expanded={open}
        >
          <ChevronRight
            size={13}
            className={cn("transition-transform duration-150", open && "rotate-90")}
            aria-hidden
          />
          Pipeline logs
          <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[color:var(--color-console-sunken)] text-[11px] text-muted tabular">
            {logs.length}
          </span>
        </button>
        {open ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {LEVELS.map((l) => {
                const active = activeLevels.has(l);
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() =>
                      setActiveLevels((prev) => {
                        const next = new Set(prev);
                        if (next.has(l)) next.delete(l);
                        else next.add(l);
                        return next;
                      })
                    }
                    className={cn(
                      "h-6 px-2 rounded-md text-[10px] font-semibold uppercase tracking-[0.08em] cursor-pointer transition-colors",
                      active
                        ? "bg-[color:var(--color-cta-soft)] text-[color:var(--color-cta-deep)] border border-[color:var(--color-cta)]"
                        : "bg-[color:var(--color-console-sunken)] text-muted border border-[color:var(--color-border)]",
                    )}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
            <label className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md bg-[color:var(--color-console-sunken)] border border-[color:var(--color-border)] focus-within:border-[color:var(--color-cta)] transition-colors">
              <Search size={12} className="text-muted" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter"
                className="bg-transparent outline-none w-[140px] text-[11px] placeholder:text-muted"
              />
            </label>
          </div>
        ) : null}
      </header>
      {open ? (
        <div className="max-h-[420px] overflow-auto scroll-quiet bg-[color:var(--color-console-sunken)]/40">
          <ul className="font-mono text-[12px] leading-[1.6] divide-y divide-[color:var(--color-border)]/60">
            {filtered.map((l, i) => (
              <LogRow key={`${l.at}-${i}`} entry={l} />
            ))}
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-muted text-[12px]">No logs match the filter.</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function LogRow({ entry }: { entry: LogEntryRecord }) {
  const [expanded, setExpanded] = useState(false);
  const tone = LEVEL_COLOR[entry.level];
  const hasFields = entry.fields && Object.keys(entry.fields).length > 0;
  return (
    <li
      className="px-3 py-1.5 hover:bg-[color:var(--color-console-card)]/70 cursor-pointer"
      onClick={() => hasFields && setExpanded((v) => !v)}
    >
      <div className="flex items-baseline gap-2">
        <span className="tabular text-muted text-[11px]">{formatClock(entry.at)}</span>
        <span
          aria-hidden
          className="inline-block w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
          style={{ background: tone }}
        />
        <span className="font-semibold uppercase text-[10px] tracking-[0.08em]" style={{ color: tone }}>
          {entry.level}
        </span>
        {entry.ctx ? (
          <span className="px-1.5 rounded-[4px] bg-[color:var(--color-cta-soft)] text-[color:var(--color-cta-deep)] text-[10px] font-semibold">
            {entry.ctx}
          </span>
        ) : null}
        <span className="text-text font-mono">{entry.msg}</span>
      </div>
      {hasFields ? (
        <div className="ml-[64px] mt-0.5">
          {expanded ? (
            <pre className="m-0 whitespace-pre-wrap break-words text-[11px] text-text bg-[color:var(--color-console-card)] rounded-md border border-[color:var(--color-border)] px-2 py-1.5">
              {safeStringify(entry.fields)}
            </pre>
          ) : (
            <p className="text-[11px] text-muted truncate">{previewFields(entry.fields)}</p>
          )}
        </div>
      ) : null}
    </li>
  );
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = d.getUTCHours().toString().padStart(2, "0");
  const mm = d.getUTCMinutes().toString().padStart(2, "0");
  const ss = d.getUTCSeconds().toString().padStart(2, "0");
  const ms = d.getUTCMilliseconds().toString().padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

function previewFields(fields: Record<string, unknown> | undefined): string {
  if (!fields) return "";
  const entries = Object.entries(fields).filter(([k]) => k !== "ctx" && k !== "ts" && k !== "msg" && k !== "level");
  if (entries.length === 0) return "";
  return entries
    .slice(0, 4)
    .map(([k, v]) => `${k}=${shortValue(v)}`)
    .join("  ");
}

function shortValue(v: unknown): string {
  if (v === null || v === undefined) return String(v);
  if (typeof v === "string") return v.length > 40 ? `"${v.slice(0, 40)}..."` : `"${v}"`;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    const s = JSON.stringify(v);
    return s.length > 40 ? `${s.slice(0, 40)}...` : s;
  } catch {
    return "[unserializable]";
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
