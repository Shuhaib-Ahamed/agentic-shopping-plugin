import type { EmittedEventRecord } from "@kapruka/protocol";
import { Radio } from "lucide-react";

export function EventTimeline({ events }: { events: EmittedEventRecord[] }) {
  if (events.length === 0) {
    return <p className="text-[12px] text-muted">No events emitted.</p>;
  }
  return (
    <ol className="relative pl-6">
      <span
        aria-hidden
        className="absolute left-2 top-1.5 bottom-1.5 w-px bg-[color:var(--color-border)]"
      />
      {events.map((e, i) => (
        <li key={`${e.type}-${i}`} className="relative pb-2.5 last:pb-0">
          <span className="absolute left-[3px] top-1.5 grid place-items-center w-3.5 h-3.5 rounded-full bg-[color:var(--color-console-card)] border border-[color:var(--color-border)]">
            <Radio size={8} className="text-[color:var(--color-cta)]" aria-hidden />
          </span>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-[11px] text-text font-semibold">{e.type}</span>
            <span className="text-[11px] text-muted tabular">{formatTime(e.at)}</span>
          </div>
          <p className="text-[12px] text-muted truncate">{e.payloadSummary}</p>
        </li>
      ))}
    </ol>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}:${d.getUTCSeconds().toString().padStart(2, "0")}`;
}
