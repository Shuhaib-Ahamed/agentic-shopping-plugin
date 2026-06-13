import { Check, MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Input, Spinner } from "@/components/atoms";
import { cn } from "@/lib/cn";

export interface CityOption {
  /** Canonical city name to store. */
  canonical: string;
  /** What the shopper sees in the listbox. May include alias hints. */
  label: string;
}

export interface CityAutocompleteFieldProps {
  id?: string;
  label: string;
  placeholder?: string;
  value: string;
  /** Canonical value written into form state. */
  onValueChange: (canonical: string) => void;
  /** Debounced lookup. The molecule does not own how the lookup happens
   *  (the gateway tool is kapruka_list_delivery_cities); the surface layer wires it in.
   */
  onQuery: (query: string) => Promise<CityOption[]>;
  required?: boolean;
  helperText?: string;
  /** Inline error string, if any. */
  error?: string;
  debounceMs?: number;
}

// Implements the WAI-ARIA combobox pattern: input with role=combobox,
// aria-controls pointing to a listbox, aria-activedescendant on the focused option.
export function CityAutocompleteField({
  id,
  label,
  placeholder,
  value,
  onValueChange,
  onQuery,
  required,
  helperText,
  error,
  debounceMs = 250,
}: CityAutocompleteFieldProps) {
  const baseId = useId();
  const inputId = id ?? `${baseId}-city`;
  const listId = `${baseId}-list`;
  const [text, setText] = useState(value);
  const [options, setOptions] = useState<CityOption[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!text || text.length < 2) {
      setOptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = window.setTimeout(async () => {
      try {
        const next = await onQuery(text);
        setOptions(next);
        setActiveIdx(next.length > 0 ? 0 : -1);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [text, onQuery, debounceMs]);

  const commit = (opt: CityOption) => {
    setText(opt.canonical);
    onValueChange(opt.canonical);
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-[var(--text-sm)] font-medium text-[var(--color-text)]"
      >
        {label}
        {required && <span className="text-[var(--color-error)] ml-0.5">*</span>}
      </label>
      <div className="relative">
        <Input
          id={inputId}
          type="text"
          autoComplete="address-level2"
          inputMode="text"
          placeholder={placeholder}
          value={text}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          aria-activedescendant={activeIdx >= 0 ? `${listId}-${activeIdx}` : undefined}
          role="combobox"
          invalid={Boolean(error)}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            onValueChange(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay close so click on a listbox option still registers.
            window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => Math.min(options.length - 1, i + 1));
              setOpen(true);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              if (open && activeIdx >= 0 && options[activeIdx]) {
                e.preventDefault();
                commit(options[activeIdx]!);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="pl-10"
        />
        <MapPin
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner size={16} />
          </span>
        )}
        {open && options.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className={cn(
              "absolute z-30 top-full left-0 right-0 mt-1 max-h-72 overflow-auto",
              "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px]",
              "shadow-[var(--shadow-md)]",
            )}
          >
            {options.map((opt, idx) => {
              const active = idx === activeIdx;
              return (
                <li
                  key={opt.canonical}
                  id={`${listId}-${idx}`}
                  role="option"
                  aria-selected={active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(opt);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer",
                    "text-[var(--text-base)]",
                    active
                      ? "bg-[var(--color-surface-warm)] text-[var(--color-text)]"
                      : "text-[var(--color-text)]",
                  )}
                >
                  <MapPin size={14} className="text-[var(--color-text-muted)]" />
                  <span className="flex-1">{opt.label}</span>
                  {active && <Check size={14} className="text-[var(--color-cta)]" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {helperText && !error && (
        <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">{helperText}</p>
      )}
      {error && (
        <p className="text-[var(--text-xs)] text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
