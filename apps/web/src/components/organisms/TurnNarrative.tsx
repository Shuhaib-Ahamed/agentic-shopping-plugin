// Narrative view of a single chat turn. Reads top-to-bottom like a story:
//   user input -> router decision -> tool calls (args+result) -> response
//   stages with emitted SSE events -> final assistant message + errors.
// Designed for debugging "is the pipeline doing what I think it is?".
import type {
  EmittedEventRecord,
  LogEntryRecord,
  StepRecord,
  ToolCallRecord,
  TurnRecord,
} from "@kapruka/protocol";
import {
  AlertTriangle,
  Bot,
  ChevronRight,
  CircleDot,
  GitBranch,
  Radio,
  Sparkles,
  User,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CurrencyCell, JsonExpand, ModelPill, StatusDot } from "@/components/atoms/console";
import { cn } from "@/lib/cn";

interface TurnNarrativeProps {
  turn: TurnRecord;
}

interface RouterDecision {
  in_scope?: boolean;
  needs_tools?: boolean;
  route?: string;
  intent_summary?: string;
  missing_info?: string[];
  safety_flag?: string;
  direct_reply_hint?: string | null;
}

function extractRouterDecision(logs: LogEntryRecord[]): RouterDecision | null {
  const log = logs.find((l) => l.msg === "router.decided");
  if (!log?.fields) return null;
  const f = log.fields as Record<string, unknown>;
  return {
    in_scope: typeof f.in_scope === "boolean" ? f.in_scope : undefined,
    needs_tools: typeof f.needs_tools === "boolean" ? f.needs_tools : undefined,
    route: typeof f.route === "string" ? f.route : undefined,
    intent_summary: typeof f.intent_summary === "string" ? f.intent_summary : undefined,
    missing_info: Array.isArray(f.missing_info) ? (f.missing_info as string[]) : undefined,
    safety_flag: typeof f.safety_flag === "string" ? f.safety_flag : undefined,
    direct_reply_hint:
      typeof f.direct_reply_hint === "string" || f.direct_reply_hint === null
        ? (f.direct_reply_hint as string | null)
        : undefined,
  };
}

function stageLabel(
  step: StepRecord,
  index: number,
): { label: string; stage: "router" | "tools" | "response" } {
  // The tracer stamps stage into rawOutputSummary. Fall back to model id.
  const raw = step.rawOutputSummary;
  if (raw === "router") return { label: `Step ${index + 1} - Router (Stage 1)`, stage: "router" };
  if (raw === "tools") return { label: `Step ${index + 1} - Tool loop (Stage 2)`, stage: "tools" };
  if (raw === "response")
    return { label: `Step ${index + 1} - Response (Stage 3)`, stage: "response" };
  // Older traces without rawOutputSummary: infer from tool kinds.
  const hasMcp = step.toolCalls.some((t) => t.kind === "mcp");
  if (hasMcp) return { label: `Step ${index + 1} - Tool loop`, stage: "tools" };
  return { label: `Step ${index + 1} - Response`, stage: "response" };
}

function eventsForStep(
  _step: StepRecord,
  stepIndex: number,
  steps: StepRecord[],
  emitted: EmittedEventRecord[],
  turnStart: string,
): EmittedEventRecord[] {
  // No exact timing of step boundaries in the trace - fall back to a
  // best-effort split: assign each event to the step whose cumulative
  // latency just exceeds the event offset from turn start.
  if (emitted.length === 0) return [];
  const turnStartMs = new Date(turnStart).getTime();
  let cum = 0;
  const boundaries: number[] = [];
  for (const s of steps) {
    cum += s.latency.totalMs;
    boundaries.push(cum);
  }
  const stepEnd = boundaries[stepIndex] ?? Number.POSITIVE_INFINITY;
  const stepStart = stepIndex === 0 ? 0 : (boundaries[stepIndex - 1] ?? 0);
  return emitted.filter((e) => {
    const at = new Date(e.at).getTime() - turnStartMs;
    return at >= stepStart && at < stepEnd;
  });
}

export function TurnNarrative({ turn }: TurnNarrativeProps) {
  const router = useMemo(() => extractRouterDecision(turn.logs ?? []), [turn.logs]);
  return (
    <section className="rounded-2xl bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] p-6">
      <header className="mb-6 flex items-center gap-2">
        <Sparkles size={16} className="text-[color:var(--color-cta-deep)]" aria-hidden />
        <h2 className="font-display font-semibold text-[16px] tracking-[-0.01em]">Narrative</h2>
        <span className="text-[11px] text-muted">- read the pipeline top to bottom</span>
      </header>

      <ol className="relative pl-7">
        {/* Vertical rail */}
        <span
          aria-hidden
          className="absolute left-[11px] top-2 bottom-2 w-px bg-[color:var(--color-border)]"
        />

        {/* User input */}
        <NarrativeNode
          icon={<User size={13} />}
          tone="user"
          title="Shopper asked"
          subtitle={
            turn.input.kind === "text" ? "Text message" : `UI action - ${turn.input.uiAction.type}`
          }
        >
          <p className="text-[14px] text-text break-words leading-snug">
            {turn.input.kind === "text" ? (
              <span className="quote">{turn.input.text}</span>
            ) : (
              <span className="font-mono text-[12px] text-muted">
                {turn.input.uiAction.type}: {turn.input.uiAction.payloadSummary}
              </span>
            )}
          </p>
        </NarrativeNode>

        {/* Router decision */}
        {router ? (
          <NarrativeNode
            icon={<GitBranch size={13} />}
            tone="router"
            title="Router decided"
            subtitle={`Route: ${router.route ?? "unknown"} - safety: ${router.safety_flag ?? "none"}`}
          >
            <div className="space-y-2 text-[13px]">
              {router.intent_summary ? (
                <p className="text-text">
                  <span className="text-muted">Intent: </span>
                  {router.intent_summary}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 text-[11px]">
                <Tag color="cta">{router.route ?? "unknown"}</Tag>
                <Tag color={router.needs_tools ? "warn" : "muted"}>
                  needs_tools: {String(router.needs_tools ?? false)}
                </Tag>
                <Tag color={router.in_scope === false ? "err" : "ok"}>
                  in_scope: {String(router.in_scope ?? true)}
                </Tag>
                {router.safety_flag && router.safety_flag !== "none" ? (
                  <Tag color="err">safety: {router.safety_flag}</Tag>
                ) : null}
                {router.missing_info && router.missing_info.length > 0 ? (
                  <Tag color="warn">missing: {router.missing_info.join(", ")}</Tag>
                ) : null}
              </div>
              {router.direct_reply_hint ? (
                <p className="text-[12px] text-muted italic">
                  Direct hint: "{router.direct_reply_hint}"
                </p>
              ) : null}
            </div>
          </NarrativeNode>
        ) : null}

        {/* Steps - each with its tool calls + emitted events */}
        {turn.steps.map((step, i) => {
          const { label, stage } = stageLabel(step, i);
          const events = eventsForStep(step, i, turn.steps, turn.emittedEvents, turn.createdAt);
          return (
            <NarrativeStep
              key={step.index}
              step={step}
              label={label}
              stage={stage}
              events={events}
            />
          );
        })}

        {/* Errors */}
        {turn.errors.length > 0 ? (
          <NarrativeNode icon={<AlertTriangle size={13} />} tone="error" title="Errors encountered">
            <ul className="space-y-1.5">
              {turn.errors.map((e, i) => (
                <li key={i} className="text-[13px]">
                  <span className="font-mono text-[12px] text-[color:var(--color-status-err)] font-semibold">
                    {e.code}
                  </span>
                  <span className="ml-2 text-text">{e.message}</span>
                  <span className="ml-2 text-[11px] text-muted">
                    ({e.recoverable ? "recoverable" : "fatal"})
                  </span>
                </li>
              ))}
            </ul>
          </NarrativeNode>
        ) : null}

        {/* Final assistant message */}
        <NarrativeNode
          icon={<Bot size={13} />}
          tone="assistant"
          title="Juno replied"
          subtitle={`Outcome: ${turn.outcome}`}
          last
        >
          {turn.finalMessage ? (
            <p className="text-[14px] text-text break-words leading-relaxed whitespace-pre-wrap">
              {turn.finalMessage}
            </p>
          ) : (
            <p className="text-[13px] text-muted italic">
              No assistant message emitted for this turn.
            </p>
          )}
        </NarrativeNode>
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Step node - LLM call + its tool calls + the SSE events emitted while it ran.
// ---------------------------------------------------------------------------
function NarrativeStep({
  step,
  label,
  stage,
  events,
}: {
  step: StepRecord;
  label: string;
  stage: "router" | "tools" | "response";
  events: EmittedEventRecord[];
}) {
  const tone: NodeTone = stage === "router" ? "router" : stage === "tools" ? "tools" : "response";
  return (
    <NarrativeNode
      icon={
        stage === "router" ? (
          <GitBranch size={13} />
        ) : stage === "tools" ? (
          <Wrench size={13} />
        ) : (
          <Sparkles size={13} />
        )
      }
      tone={tone}
      title={label}
      subtitle={
        <span className="flex flex-wrap items-center gap-2 text-[11px]">
          <ModelPill model={step.model} />
          <span className="text-muted tabular">{step.latency.totalMs.toFixed(0)} ms</span>
          <CurrencyCell usd={step.cost.total} />
          <span className="text-muted tabular">{step.usage.total.toLocaleString()} tok</span>
          <span className="text-muted">finish: {step.finishReason}</span>
        </span>
      }
    >
      <div className="space-y-3">
        {/* Tool calls inline */}
        {step.toolCalls.length > 0 ? (
          <ul className="space-y-2">
            {step.toolCalls.map((tc) => (
              <li key={tc.id}>
                <ToolCallCard call={tc} />
              </li>
            ))}
          </ul>
        ) : null}

        {/* SSE events emitted during this step */}
        {events.length > 0 ? (
          <details className="rounded-lg bg-[color:var(--color-console-sunken)]/60 border border-[color:var(--color-border)] px-3 py-2">
            <summary className="cursor-pointer text-[11px] uppercase tracking-[0.08em] font-semibold text-muted flex items-center gap-2">
              <Radio size={11} className="text-[color:var(--color-cta-deep)]" aria-hidden />
              {events.length} event{events.length === 1 ? "" : "s"} sent to client
            </summary>
            <ul className="mt-2 space-y-1 font-mono text-[11px]">
              {events.map((e, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  <span className="text-muted tabular">{formatRelativeMs(e.at)}</span>
                  <span className="text-text font-semibold">{e.type}</span>
                  <span className="text-muted truncate">{e.payloadSummary}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {step.toolCalls.length === 0 && events.length === 0 ? (
          <p className="text-[12px] text-muted italic">No tool calls. No SSE events emitted.</p>
        ) : null}
      </div>
    </NarrativeNode>
  );
}

// ---------------------------------------------------------------------------
// Tool call card - shows name, args, result preview, latency, errors.
// Click to expand the full redacted args + result JSON.
// ---------------------------------------------------------------------------
function ToolCallCard({ call }: { call: ToolCallRecord }) {
  const [open, setOpen] = useState(false);
  const ok = !call.error;
  const Icon = call.kind === "ui" ? Radio : Wrench;
  return (
    <div
      className={cn(
        "rounded-lg border bg-[color:var(--color-console-card)] overflow-hidden",
        ok ? "border-[color:var(--color-border)]" : "border-[color:var(--color-status-err)]/40",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-[color:var(--color-console-sunken)]/40 transition-colors"
      >
        <ChevronRight
          size={13}
          className={cn(
            "text-muted mt-1 transition-transform duration-150 shrink-0",
            open && "rotate-90",
          )}
          aria-hidden
        />
        <Icon
          size={13}
          className={cn(
            "mt-1 shrink-0",
            call.kind === "ui"
              ? "text-[color:var(--color-span-ui)]"
              : "text-[color:var(--color-span-mcp)]",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-[12px] font-semibold text-text">{call.name}</span>
            <Tag color={call.kind === "ui" ? "accent" : "teal"}>{call.kind}</Tag>
            <span className="text-[11px] text-muted tabular">{call.latencyMs.toFixed(0)} ms</span>
            <span className="text-[11px] flex items-center gap-1.5">
              <StatusDot tone={ok ? "ok" : "err"} />
              <span className={ok ? "text-muted" : "text-[color:var(--color-status-err)]"}>
                {ok ? (call.cacheHit ? "cache hit" : "ok") : "error"}
              </span>
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-muted truncate">
            <span className="font-mono">args:</span> {call.argsSummary}
          </p>
          <p className="text-[12px] text-text truncate">
            <span className="font-mono text-muted">→ </span>
            {call.error
              ? `${call.error.code} - ${call.error.message}`
              : (call.resultSummary ?? "ok")}
          </p>
        </div>
      </button>
      {open ? (
        <div className="border-t border-[color:var(--color-border)] p-3 bg-[color:var(--color-console-sunken)]/40 space-y-2">
          {call.argsRedacted !== undefined ? (
            <JsonExpand value={call.argsRedacted} label="Arguments (redacted)" defaultOpen />
          ) : (
            <p className="text-[11px] text-muted">
              Args summary: <span className="font-mono">{call.argsSummary}</span>
            </p>
          )}
          {call.resultRedacted !== undefined ? (
            <JsonExpand value={call.resultRedacted} label="Result (redacted)" defaultOpen />
          ) : call.resultSummary ? (
            <p className="text-[11px] text-muted">
              Result summary: <span className="font-mono">{call.resultSummary}</span>
            </p>
          ) : null}
          {call.error ? (
            <div className="rounded-md bg-[color:var(--color-error-bg)]/70 p-2 text-[12px] text-[color:var(--color-status-err)]">
              <p className="font-semibold font-mono">{call.error.code}</p>
              <p>{call.error.message}</p>
              <p className="text-[11px] text-muted">
                {call.error.recoverable ? "Recoverable" : "Fatal"}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic narrative node (timeline rail + icon + card)
// ---------------------------------------------------------------------------
type NodeTone = "user" | "router" | "tools" | "response" | "assistant" | "error";

const TONE_COLOR: Record<NodeTone, { ring: string; bg: string; ink: string }> = {
  user: {
    ring: "border-[color:var(--color-cta)]",
    bg: "bg-[color:var(--color-cta-soft)]",
    ink: "text-[color:var(--color-cta-deep)]",
  },
  router: {
    ring: "border-[color:var(--color-series-5)]",
    bg: "bg-[color:var(--color-console-sunken)]",
    ink: "text-text",
  },
  tools: {
    ring: "border-[color:var(--color-span-mcp)]",
    bg: "bg-[color:var(--color-span-mcp)]/10",
    ink: "text-[color:var(--color-span-mcp)]",
  },
  response: {
    ring: "border-[color:var(--color-span-model)]",
    bg: "bg-[color:var(--color-span-model)]/8",
    ink: "text-[color:var(--color-span-model)]",
  },
  assistant: {
    ring: "border-[color:var(--color-status-ok)]",
    bg: "bg-[color:var(--color-success-bg)]/70",
    ink: "text-[color:var(--color-status-ok)]",
  },
  error: {
    ring: "border-[color:var(--color-status-err)]",
    bg: "bg-[color:var(--color-error-bg)]/70",
    ink: "text-[color:var(--color-status-err)]",
  },
};

function NarrativeNode({
  icon,
  tone,
  title,
  subtitle,
  children,
  last,
}: {
  icon: React.ReactNode;
  tone: NodeTone;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  last?: boolean;
}) {
  const t = TONE_COLOR[tone];
  return (
    <li className={cn("relative", last ? "pb-0" : "pb-5")}>
      {/* Dot on the rail */}
      <span
        aria-hidden
        className={cn(
          "absolute -left-7 top-1 grid place-items-center w-6 h-6 rounded-full",
          "bg-[color:var(--color-console-card)] border-2 shadow-sm",
          t.ring,
          t.ink,
        )}
      >
        {icon ?? <CircleDot size={12} />}
      </span>

      {/* Card */}
      <div
        className={cn(
          "rounded-xl border border-[color:var(--color-border)] overflow-hidden",
          "bg-[color:var(--color-console-card)]",
        )}
      >
        <header className={cn("px-4 py-2.5 border-b border-[color:var(--color-border)]/60", t.bg)}>
          <p className={cn("text-[10px] uppercase tracking-[0.1em] font-bold", t.ink)}>{title}</p>
          {subtitle ? (
            typeof subtitle === "string" ? (
              <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>
            ) : (
              <div className="mt-1">{subtitle}</div>
            )
          ) : null}
        </header>
        <div className="px-4 py-3">{children}</div>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Small tag chip
// ---------------------------------------------------------------------------
type TagColor = "cta" | "ok" | "warn" | "err" | "muted" | "accent" | "teal";

const TAG_COLOR: Record<TagColor, string> = {
  cta: "bg-[color:var(--color-cta-soft)] text-[color:var(--color-cta-deep)]",
  ok: "bg-[color:var(--color-success-bg)] text-[color:var(--color-status-ok)]",
  warn: "bg-[color:var(--color-warn-bg)] text-[color:var(--color-warn)]",
  err: "bg-[color:var(--color-error-bg)] text-[color:var(--color-status-err)]",
  muted: "bg-[color:var(--color-console-sunken)] text-muted",
  accent: "bg-[color:var(--color-accent-soft)] text-[color:var(--color-warn)]",
  teal: "bg-[color:var(--color-span-mcp)]/15 text-[color:var(--color-span-mcp)]",
};

function Tag({ color, children }: { color: TagColor; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-md font-mono font-semibold tabular",
        TAG_COLOR[color],
      )}
    >
      {children}
    </span>
  );
}

function formatRelativeMs(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}:${d.getUTCSeconds().toString().padStart(2, "0")}.${d.getUTCMilliseconds().toString().padStart(3, "0")}`;
}

// CSS helper class for the user's quoted text.
declare global {
  interface CSSStyleDeclaration {
    quote?: never;
  }
}
