import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ArrowUp } from "lucide-react";
import { useAppStore } from "@/store";
import { pickStrings } from "@/i18n";
import { cn } from "@/lib/cn";
import { BorderBeam } from "@/components/ui/border-beam";

export interface ComposerProps {
  onSubmit: (text: string) => void;
  isPending?: boolean;
  /** Decorate the input with the Magic UI border-beam. Used on the empty
   *  hero state to draw attention to the composer; turned off in active chat. */
  showBeam?: boolean;
}

// Single-line height for the autosize textarea (line-height 1.55 * 17px font +
// 2 * py-3 padding ≈ 26 + 24 = 50px). Threshold for the "multi-line" layout.
const SINGLE_LINE_PX = 50;
const MAX_HEIGHT_PX = 160;

export function Composer({ onSubmit, isPending, showBeam }: ComposerProps) {
  const locale = useAppStore((s) => s.locale);
  const t = pickStrings(locale);
  const [value, setValue] = useState("");
  const [multiline, setMultiline] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Autosize: reset to single line, then grow to fit content up to max height.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_HEIGHT_PX);
    el.style.height = `${next}px`;
    setMultiline(next > SINGLE_LINE_PX + 4);
  }, [value]);

  // Reset height when the value gets cleared (after submit).
  useEffect(() => {
    if (value === "" && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      setMultiline(false);
    }
  }, [value]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isPending) return;
    onSubmit(trimmed);
    setValue("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const disabled = !value.trim() || isPending;

  return (
    <form
      onSubmit={submit}
      className="relative w-full pt-1 pb-3 md:pb-5 safe-bottom"
    >
      <div
        className={cn(
          "relative flex gap-2 p-1.5 pl-2",
          "rounded-[var(--radius-2xl)]",
          "bg-white",
          "shadow-[var(--shadow-md)]",
          multiline ? "items-end" : "items-center",
        )}
      >
        {/* Border-beam — only on the empty hero state. Two beams running in
            opposite directions for a balanced, continuous chase around the
            input. On-brand: saffron → violet. */}
        {showBeam && (
          <>
            <BorderBeam
              size={120}
              duration={7}
              colorFrom="#F9B233"
              colorTo="#4A2E82"
              borderWidth={1.5}
            />
            <BorderBeam
              size={120}
              duration={7}
              delay={3.5}
              colorFrom="#6B4BA0"
              colorTo="#F9B233"
              borderWidth={1.5}
              reverse
            />
          </>
        )}
        <label htmlFor="composer-input" className="sr-only">
          {t.composer.placeholder}
        </label>
        <textarea
          id="composer-input"
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t.composer.placeholder}
          rows={1}
          autoComplete="off"
          spellCheck
          enterKeyHint="send"
          className={cn(
            "flex-1 resize-none bg-transparent px-4 py-3 max-h-40",
            "text-[var(--text-md)] leading-[var(--leading-body)] text-primary",
            "placeholder:text-muted placeholder:font-medium",
            /* Kill every default border + focus ring on the textarea — focus
               feedback lives on the wrapper. */
            "border-0 outline-none ring-0",
            "focus:outline-none focus:ring-0 focus:border-0",
            "focus-visible:outline-none focus-visible:ring-0",
            /* Hide the scrollbar — content still scrolls when it overflows. */
            "no-scrollbar",
          )}
          style={{
            fontSize: "var(--text-md)",
            border: "none",
            outline: "none",
            boxShadow: "none",
          }}
          lang={locale}
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={disabled}
          aria-label={isPending ? t.composer.sending : t.composer.send}
          className={cn(
            "relative grid place-items-center shrink-0",
            "h-10 w-10 rounded-full cursor-pointer",
            "transition-[transform,background-color,box-shadow] duration-200",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta",
            "active:scale-95",
            "disabled:cursor-not-allowed",
            disabled
              ? "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-dark)]"
              : "bg-[color:var(--color-accent)] text-[color:var(--color-text)] hover:bg-[color:var(--color-accent-dark)] shadow-[var(--shadow-accent)]",
          )}
        >
          {isPending ? (
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              className="animate-spin"
              style={{ animationDuration: "900ms" }}
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" stroke="white" strokeOpacity="0.3" strokeWidth="2.5" fill="none" />
              <path d="M22 12a10 10 0 0 0-10-10" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </svg>
          ) : (
            <ArrowUp size={18} strokeWidth={2.6} />
          )}
        </button>
      </div>
    </form>
  );
}
