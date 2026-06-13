import { cn } from "@/lib/cn";

export type LangCode = "en" | "si" | "ta" | "tg";

const COLOR: Record<LangCode, string> = {
  en: "var(--color-series-1)",
  si: "var(--color-series-2)",
  ta: "var(--color-series-3)",
  tg: "var(--color-series-4)",
};

const LABEL: Record<LangCode, string> = {
  en: "EN",
  si: "SI",
  ta: "TA",
  tg: "TG",
};

export function LangPill({ code, className }: { code: LangCode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 h-5 text-[11px] font-semibold",
        "bg-[color:var(--color-console-sunken)] text-text border border-[color:var(--color-border)]",
        className,
      )}
    >
      <span
        aria-hidden
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: COLOR[code] }}
      />
      {LABEL[code]}
    </span>
  );
}
