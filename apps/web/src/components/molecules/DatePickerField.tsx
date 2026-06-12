import { useId } from "react";
import { Calendar } from "lucide-react";
import { Input } from "@/components/atoms";

export interface DatePickerFieldProps {
  id?: string;
  label: string;
  /** ISO string yyyy-mm-dd. */
  value: string;
  onValueChange: (iso: string) => void;
  required?: boolean;
  /** ISO string min. Defaults to today + 1 day in Asia/Colombo. */
  min?: string;
  /** ISO string max. Defaults to today + 60 days. */
  max?: string;
  helperText?: string;
  error?: string;
}

function todayIsoColombo(offsetDays = 0): string {
  // Asia/Colombo is UTC+5:30, no DST. Add offset in days.
  const now = new Date();
  const colombo = new Date(now.getTime() + (5.5 * 60 + now.getTimezoneOffset()) * 60_000);
  colombo.setDate(colombo.getDate() + offsetDays);
  return colombo.toISOString().slice(0, 10);
}

// Uses native <input type="date"> which on mobile gives the OS picker (best UX).
// A Radix-based picker on desktop is a post-MVP upgrade.
export function DatePickerField({
  id,
  label,
  value,
  onValueChange,
  required,
  min = todayIsoColombo(1),
  max = todayIsoColombo(60),
  helperText,
  error,
}: DatePickerFieldProps) {
  const baseId = useId();
  const inputId = id ?? `${baseId}-date`;
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
          type="date"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          invalid={Boolean(error)}
          onChange={(e) => onValueChange(e.target.value)}
          className="pl-10"
        />
        <Calendar
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
        />
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
