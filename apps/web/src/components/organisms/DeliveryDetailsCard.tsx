import { CalendarDays, Check, MapPin, Phone, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DeliveryDetailsCardProps {
  values: Record<string, string>;
  className?: string;
}

// Right-aligned summary card rendered in place of the raw "key=value; ..."
// user bubble that the delivery form used to send. The wire payload still
// goes to the AI verbatim (silent send) - this is purely a UI swap.
export function DeliveryDetailsCard({ values, className }: DeliveryDetailsCardProps) {
  const rows = orderRows(values);
  if (rows.length === 0) return null;

  return (
    <div className={cn("ml-auto max-w-[520px] w-full", className)}>
      <article
        className={cn(
          "rounded-[18px] bg-[var(--color-surface)]",
          "border border-[var(--color-border)]",
          "shadow-[var(--shadow-sm)]",
          "overflow-hidden",
        )}
      >
        <header
          className={cn(
            "flex items-center gap-2 px-4 py-2.5",
            "border-b border-[var(--color-border)]",
            "bg-[color:var(--color-surface-warm)]",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "grid place-items-center w-5 h-5 rounded-full",
              "bg-[color:var(--color-accent)] text-[color:var(--color-text)]",
            )}
          >
            <Check size={12} strokeWidth={3} />
          </span>
          <span className="text-[var(--text-xs)] font-semibold tracking-[0.02em] text-[color:var(--color-text-muted)]">
            delivery details
          </span>
        </header>

        <dl className="px-4 py-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2.5">
          {rows.map(({ key, Icon, label, value }) => (
            <Row key={key} Icon={Icon} label={label} value={value} />
          ))}
        </dl>
      </article>
    </div>
  );
}

interface RowConfig {
  key: string;
  Icon: LucideIcon;
  label: string;
  value: string;
}

function Row({ Icon, label, value }: Omit<RowConfig, "key">) {
  return (
    <>
      <dt className="flex items-start pt-0.5 text-[color:var(--color-cta)]">
        <Icon size={14} strokeWidth={2.2} />
      </dt>
      <dd className="min-w-0">
        <div className="text-[var(--text-2xs)] tracking-[0.02em] text-[color:var(--color-text-muted)]">
          {label}
        </div>
        <div
          className="text-[var(--text-sm)] font-semibold text-[color:var(--color-text)] leading-snug break-words"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </div>
      </dd>
    </>
  );
}

// Field-name dictionary. The AI's request_info schema sets the keys, so we
// recognise the common ones and fall back to a humanised key for the rest.
const FIELD_MAP: Record<string, { Icon: LucideIcon; label: string }> = {
  recipient_name: { Icon: User, label: "recipient" },
  name: { Icon: User, label: "recipient" },
  recipient_phone: { Icon: Phone, label: "phone" },
  phone: { Icon: Phone, label: "phone" },
  address: { Icon: MapPin, label: "address" },
  line1: { Icon: MapPin, label: "address" },
  line2: { Icon: MapPin, label: "address line 2" },
  city: { Icon: MapPin, label: "city" },
  postal_code: { Icon: MapPin, label: "postal code" },
  postalCode: { Icon: MapPin, label: "postal code" },
  delivery_date: { Icon: CalendarDays, label: "delivery date" },
  date: { Icon: CalendarDays, label: "delivery date" },
};

// Display order - known keys first in a sensible order, unknown keys last
// in submission order.
const ORDER: string[] = [
  "recipient_name",
  "name",
  "recipient_phone",
  "phone",
  "address",
  "line1",
  "line2",
  "city",
  "postal_code",
  "postalCode",
  "delivery_date",
  "date",
];

function orderRows(values: Record<string, string>): RowConfig[] {
  const seen = new Set<string>();
  const rows: RowConfig[] = [];

  for (const key of ORDER) {
    const raw = values[key];
    if (!raw) continue;
    const cfg = FIELD_MAP[key];
    if (!cfg) continue;
    const display = formatValue(key, raw);
    if (!display) continue;
    rows.push({ key, Icon: cfg.Icon, label: cfg.label, value: display });
    seen.add(key);
  }

  for (const [key, rawValue] of Object.entries(values)) {
    if (seen.has(key) || !rawValue) continue;
    const cfg = FIELD_MAP[key];
    const display = formatValue(key, rawValue);
    if (!display) continue;
    rows.push({
      key,
      Icon: cfg?.Icon ?? MapPin,
      label: cfg?.label ?? humanise(key),
      value: display,
    });
  }

  return rows;
}

// "recipient_name" → "recipient name". Keeps the lowercase house style.
function humanise(key: string): string {
  const spaced = key.replace(/[_-]+/g, " ").trim();
  if (!spaced) return key;
  return spaced.toLowerCase();
}

function formatValue(key: string, raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (key === "delivery_date" || key === "date") return formatDate(value);
  return value;
}

// "2026-06-18" → "Thu, 18 Jun 2026". Falls back to the raw value if it
// doesn't parse as a date - the AI may send a free-form phrase.
function formatDate(raw: string): string {
  const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  if (!isoMatch) return raw;
  const d = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
