import type { TurnRecord } from "@kapruka/protocol";
import { Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/atoms/Button";
import {
  CurrencyCell,
  JsonExpand,
  LangPill,
  ModelPill,
  StatusDot,
  TokenChip,
} from "@/components/atoms/console";
import { Input, Textarea } from "@/components/atoms/Input";
import {
  DebugLogPanel,
  EventTimeline,
  ToolCallRow,
  TraceStepRow,
} from "@/components/molecules/console";
import { adminApi } from "../api";
import { formatDateTime, formatMs, formatNumber } from "../format";
import { useAsync } from "../hooks";

export function TraceDetailPage() {
  const { id = "" } = useParams();
  const { data, loading, error, reload } = useAsync(() => adminApi.turn(id), [id]);

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
        <p className="text-[14px] text-text">Could not load this turn.</p>
      </div>
    );
  }

  const scale = Math.max(...data.steps.map((s) => s.latency.totalMs), 1);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link
            to={`/admin/sessions/${encodeURIComponent(data.sessionId)}`}
            className="text-[12px] text-muted hover:text-text"
          >
            ← Back to session
          </Link>
          <h1 className="mt-1 font-display font-bold text-[24px] tracking-[-0.02em] flex items-center gap-2">
            Turn <TokenChip value={data.turnId} truncate={18} />
          </h1>
          <p className="text-[12px] text-muted">
            {formatDateTime(data.createdAt)} · prompt {data.promptVersion}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-muted">
          <LangPill code={(data.locale as "en" | "si" | "ta") ?? "en"} />
          <ModelPill model={data.model} />
          <span>
            Outcome: <strong className="text-text">{data.outcome}</strong>
          </span>
          <span>{formatMs(data.durationMs)}</span>
          <CurrencyCell usd={data.totals.cost.total} />
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Fact label="Tokens" value={formatNumber(data.totals.usage.total)} />
        <Fact label="Steps" value={String(data.steps.length)} />
        <Fact label="Tool calls" value={String(data.totals.toolCalls)} />
        <Fact label="Errors" value={String(data.errors.length)} />
      </div>

      <section className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] p-5">
        <h2 className="font-display font-semibold text-[15px] tracking-[-0.01em] mb-3">
          Step waterfall
        </h2>
        <div className="space-y-2">
          {data.steps.map((step) => (
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 text-[12px]">
                  <Fact label="Input tokens" value={formatNumber(step.usage.input)} />
                  <Fact label="Cached" value={formatNumber(step.usage.cachedInput)} />
                  <Fact label="Output" value={formatNumber(step.usage.output)} />
                </div>
                <JsonExpand value={step} label="Step payload (redacted)" />
              </div>
            </TraceStepRow>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] p-5">
          <h3 className="font-display font-semibold text-[15px] tracking-[-0.01em] mb-3">
            Emitted events
          </h3>
          <EventTimeline events={data.emittedEvents} />
        </section>
        <section className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] p-5 space-y-3">
          <h3 className="font-display font-semibold text-[15px] tracking-[-0.01em]">Flags</h3>
          <ul className="text-[12px] space-y-1">
            <FlagRow on={data.flags.hallucinationSuspected} label="Hallucination suspected" />
            <FlagRow on={data.flags.schemaValidationFailed} label="Schema validation failed" />
            <FlagRow on={data.flags.refused} label="Refused" />
            <FlagRow on={data.flags.retried} label="Retried" />
          </ul>
          <JsonExpand value={data.finalMessage ?? ""} label="Final message" />
          <JsonExpand value={data.input} label="Input" />
        </section>
      </div>

      <DebugLogPanel logs={data.logs ?? []} />

      <CurationCard turn={data} onSaved={reload} />
    </div>
  );
}

function CurationCard({ turn, onSaved }: { turn: TurnRecord; onSaved: () => void }) {
  const [rating, setRating] = useState<"good" | "bad" | "unrated">(turn.label?.rating ?? "unrated");
  const [tagsInput, setTagsInput] = useState((turn.label?.tags ?? []).join(", "));
  const [reason, setReason] = useState(turn.label?.reason ?? "");
  const [correctedResponse, setCorrectedResponse] = useState(turn.label?.correctedResponse ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setRating(turn.label?.rating ?? "unrated");
    setTagsInput((turn.label?.tags ?? []).join(", "));
    setReason(turn.label?.reason ?? "");
    setCorrectedResponse(turn.label?.correctedResponse ?? "");
    setSavedAt(turn.label?.at ?? null);
    // Reset is keyed on the label timestamp + turn identity so an external
    // change refreshes the form; reading every label sub-field would refetch
    // mid-edit and stomp local input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn.label?.at, turn.turnId]);

  const onSave = async () => {
    setSaving(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 20);
      await adminApi.labelTurn(turn.turnId, {
        rating,
        tags,
        reason: reason || undefined,
        correctedResponse: correctedResponse || undefined,
      });
      onSaved();
      setSavedAt(new Date().toISOString());
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] p-5 space-y-3">
      <h3 className="font-display font-semibold text-[15px] tracking-[-0.01em]">Curate</h3>
      <p className="text-[12px] text-muted">
        Tag, rate, or write an ideal response. Saved labels feed datasets and eval.
      </p>
      <div className="flex gap-2">
        {(["good", "bad", "unrated"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRating(r)}
            className={
              "h-9 px-4 rounded-full text-[13px] font-semibold transition-colors cursor-pointer " +
              (rating === r
                ? "bg-[color:var(--color-cta-soft)] text-[color:var(--color-cta-deep)] border border-[color:var(--color-cta)]"
                : "bg-[color:var(--color-console-sunken)] text-muted border border-[color:var(--color-border)]")
            }
          >
            {r === "good" ? "Good" : r === "bad" ? "Bad" : "Unrated"}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="text-[12px] font-semibold text-muted">Tags (comma separated)</span>
        <Input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          className="mt-1 w-full"
          placeholder="wrong_tool, great_recommendation, perfect_sinhala"
        />
      </label>
      <label className="block">
        <span className="text-[12px] font-semibold text-muted">Reason</span>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 w-full"
          placeholder="What was right or wrong about this turn?"
        />
      </label>
      <label className="block">
        <span className="text-[12px] font-semibold text-muted">Corrected response (optional)</span>
        <Textarea
          value={correctedResponse}
          onChange={(e) => setCorrectedResponse(e.target.value)}
          className="mt-1 w-full"
          placeholder="What should Juno have said?"
        />
      </label>
      <div className="flex items-center justify-between">
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save label"}
        </Button>
        {savedAt ? <p className="text-[11px] text-muted">Saved {formatDateTime(savedAt)}</p> : null}
      </div>
    </section>
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
