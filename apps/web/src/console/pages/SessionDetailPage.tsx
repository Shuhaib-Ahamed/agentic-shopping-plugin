import type { TurnRecord } from "@kapruka/protocol";
import { ChevronDown, ChevronRight, Loader, User, Bot } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CurrencyCell,
  JsonExpand,
  LangPill,
  ModelPill,
  StatusDot,
  TokenChip,
} from "@/components/atoms/console";
import {
  DebugLogPanel,
  EventTimeline,
  ToolCallRow,
  TraceStepRow,
} from "@/components/molecules/console";
import { cn } from "@/lib/cn";
import { adminApi } from "../api";
import { formatDateTime, formatMs, formatNumber } from "../format";
import { useAsync } from "../hooks";

export function SessionDetailPage() {
  const { id = "" } = useParams();
  const { data, loading, error } = useAsync(() => adminApi.sessionDetail(id), [id]);

  if (loading) {
    return (
      <div className="grid place-items-center min-h-[60vh] text-muted">
        <Loader size={18} className="animate-spin" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] p-6">
        <p className="text-[14px] text-text">Could not load this session.</p>
        <Link
          to="/admin/sessions"
          className="text-[13px] text-[color:var(--color-cta-deep)] hover:underline"
        >
          Back to sessions
        </Link>
      </div>
    );
  }

  const { session, turns } = data;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link to="/admin/sessions" className="text-[12px] text-muted hover:text-text">
            ← Sessions
          </Link>
          <h1 className="mt-1 font-display font-bold text-[24px] tracking-[-0.02em] flex items-center gap-2">
            Session
            <TokenChip value={session.sessionId} truncate={18} />
          </h1>
          <p className="text-[12px] text-muted">
            Started {formatDateTime(session.startedAt)} · {session.device} ·{" "}
            {session.country ?? "–"}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-muted">
          <LangPill code={(session.locale as "en" | "si" | "ta") ?? "en"} />
          <span>
            Outcome: <strong className="text-text">{session.outcome}</strong>
          </span>
          <span>
            Turns: <strong className="text-text tabular">{session.totals.turns}</strong>
          </span>
          <span>
            Cost: <CurrencyCell usd={session.totals.costUSD} />
          </span>
        </div>
      </header>

      <div className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] p-5">
        <h2 className="font-display font-semibold text-[15px] tracking-[-0.01em] mb-3">Replay</h2>
        <ol className="space-y-3">
          {turns.map((t) => (
            <TurnReplayCard key={t.turnId} turn={t} />
          ))}
        </ol>
      </div>
    </div>
  );
}

function TurnReplayCard({ turn }: { turn: TurnRecord }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-console-card)]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border-b border-[color:var(--color-border)]/60">
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <User size={14} className="mt-0.5 text-muted" aria-hidden />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted">
                Shopper
              </p>
              <p className="text-[14px] text-text break-words">
                {turn.input.kind === "text"
                  ? turn.input.text
                  : `[ui_action] ${turn.input.uiAction.type}: ${turn.input.uiAction.payloadSummary}`}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <Bot size={14} className="mt-0.5 text-[color:var(--color-cta-deep)]" aria-hidden />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted">
                Juno
              </p>
              <p className="text-[14px] text-text break-words">
                {turn.finalMessage ?? (
                  <span className="text-muted italic">No assistant message</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-[12px] text-muted hover:bg-[color:var(--color-console-sunken)]/70 cursor-pointer rounded-b-xl transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className={cn("transition-transform duration-150", open && "rotate-90")}>
            <ChevronRight size={13} aria-hidden />
          </span>
          {summary(turn)}
        </span>
        <span className="flex items-center gap-3 tabular">
          <ModelPill model={turn.model} />
          <span>{formatMs(turn.durationMs)}</span>
          <CurrencyCell usd={turn.totals.cost.total} />
          <Link
            to={`/admin/turns/${encodeURIComponent(turn.turnId)}`}
            className="inline-flex items-center gap-1 text-[12px] text-[color:var(--color-cta-deep)] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Trace <ChevronDown size={12} className="rotate-[-90deg]" aria-hidden />
          </Link>
        </span>
      </button>
      {open ? <TurnDetails turn={turn} /> : null}
    </li>
  );
}

function summary(turn: TurnRecord): string {
  const tools = turn.steps.flatMap((s) => s.toolCalls.map((tc) => tc.name));
  if (tools.length === 0) return `Composed reply (${formatNumber(turn.totals.usage.total)} tokens)`;
  return `${tools.slice(0, 3).join(" · ")}${tools.length > 3 ? ` +${tools.length - 3}` : ""}`;
}

function TurnDetails({ turn }: { turn: TurnRecord }) {
  const scale = Math.max(...turn.steps.map((s) => s.latency.totalMs), 1);
  return (
    <div className="px-4 pb-4 space-y-3 border-t border-[color:var(--color-border)]">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3 text-[12px]">
        <Fact label="Total latency" value={formatMs(turn.durationMs)} />
        <Fact label="Tokens" value={formatNumber(turn.totals.usage.total)} />
        <Fact label="Cost" value={<CurrencyCell usd={turn.totals.cost.total} />} />
        <Fact label="Tool calls" value={String(turn.totals.toolCalls)} />
      </div>
      <div className="space-y-2">
        {turn.steps.map((step) => (
          <TraceStepRow key={step.index} step={step} scaleMs={scale}>
            <div className="space-y-2.5">
              {step.toolCalls.length === 0 ? (
                <p className="text-[12px] text-muted">No tool calls. Direct response.</p>
              ) : (
                <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-console-card)] px-3 py-2">
                  {step.toolCalls.map((tc) => (
                    <ToolCallRow key={tc.id} tc={tc} />
                  ))}
                </div>
              )}
              <JsonExpand value={step} label="Step payload (redacted)" />
            </div>
          </TraceStepRow>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <section className="rounded-xl border border-[color:var(--color-border)] p-3 bg-[color:var(--color-console-card)]">
          <h4 className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted mb-2">
            SSE events
          </h4>
          <EventTimeline events={turn.emittedEvents} />
        </section>
        <section className="rounded-xl border border-[color:var(--color-border)] p-3 bg-[color:var(--color-console-card)] space-y-2">
          <h4 className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted">
            Flags & errors
          </h4>
          <ul className="text-[12px] space-y-1">
            <FlagRow on={turn.flags.hallucinationSuspected} label="Hallucination suspected" />
            <FlagRow on={turn.flags.schemaValidationFailed} label="Schema validation failed" />
            <FlagRow on={turn.flags.refused} label="Refused" />
            <FlagRow on={turn.flags.retried} label="Retried" />
          </ul>
          {turn.errors.length > 0 ? (
            <div className="rounded-lg bg-[color:var(--color-error-bg)]/70 p-2">
              {turn.errors.map((e, i) => (
                <p key={i} className="text-[12px] text-[color:var(--color-status-err)]">
                  <strong>{e.code}</strong> – {e.message}
                </p>
              ))}
            </div>
          ) : null}
        </section>
      </div>
      <DebugLogPanel logs={turn.logs ?? []} />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[color:var(--color-console-sunken)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted">{label}</p>
      <div className="mt-0.5 font-display font-semibold text-text tabular">{value}</div>
    </div>
  );
}

function FlagRow({ on, label }: { on: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <StatusDot tone={on ? "warn" : "mute"} />
      <span className={on ? "text-text" : "text-muted"}>{label}</span>
    </li>
  );
}
