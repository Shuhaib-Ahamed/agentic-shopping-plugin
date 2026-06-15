import {
  CalendarDays,
  CircleDollarSign,
  MapPin,
  Phone,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMoney as formatLkr } from "@/lib/format";

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
    <div className={cn("ml-auto w-full max-w-[440px]", className)}>
      <article
        className={cn(
          "rounded-[var(--radius-bubble)] rounded-br-[6px]",
          "bg-[var(--color-surface)]",
          "ring-1 ring-[var(--color-border)]",
          "shadow-[var(--shadow-bubble)]",
          "overflow-hidden",
        )}
      >
        <header
          className={cn(
            "flex items-center gap-2.5 px-4 pt-3.5 pb-3",
            "border-b border-dashed border-[var(--color-border)]",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "grid place-items-center w-7 h-7 rounded-[10px] shrink-0",
              "bg-[var(--color-lavender)] text-[var(--color-lavender-ink)]",
            )}
          >
            <Sparkles size={14} strokeWidth={2.2} />
          </span>
          <h3
            className={cn(
              "m-0 text-[var(--text-sm)] font-semibold leading-snug",
              "text-[var(--color-text)] tracking-[0.005em]",
            )}
          >
            Delivery Details
          </h3>
        </header>

        <dl className="px-4 py-3">
          {rows.map(({ key, Icon, label, value }, i) => (
            <Row key={key} Icon={Icon} label={label} value={value} divided={i > 0} />
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

function Row({ Icon, label, value, divided }: Omit<RowConfig, "key"> & { divided: boolean }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[28px_1fr] gap-x-3 items-center py-2",
        divided && "border-t border-[var(--color-border)]",
      )}
    >
      <dt
        aria-hidden
        className={cn(
          "grid place-items-center w-7 h-7 rounded-[8px]",
          "bg-[var(--color-cta-soft)] text-[var(--color-cta)]",
        )}
      >
        <Icon size={14} strokeWidth={2.2} />
      </dt>
      <dd className="min-w-0 flex items-baseline justify-between gap-3">
        <span
          className={cn(
            "text-[var(--text-2xs)] font-medium uppercase",
            "tracking-[0.08em] text-[var(--color-text-muted)]",
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "text-[var(--text-sm)] font-semibold leading-snug text-right",
            "text-[var(--color-text)] break-words min-w-0",
          )}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </span>
      </dd>
    </div>
  );
}

// Field-name dictionary. The AI's request_info schema sets the keys, so we
// recognise the common ones and fall back to a humanised key for the rest.
const FIELD_MAP: Record<string, { Icon: LucideIcon; label: string }> = {
  recipient_name: { Icon: User, label: "Recipient" },
  name: { Icon: User, label: "Recipient" },
  recipient_phone: { Icon: Phone, label: "Phone" },
  phone: { Icon: Phone, label: "Phone" },
  address: { Icon: MapPin, label: "Address" },
  line1: { Icon: MapPin, label: "Address" },
  line2: { Icon: MapPin, label: "Address Line 2" },
  city: { Icon: MapPin, label: "City" },
  postal_code: { Icon: MapPin, label: "Postal Code" },
  postalCode: { Icon: MapPin, label: "Postal Code" },
  delivery_date: { Icon: CalendarDays, label: "Delivery Date" },
  date: { Icon: CalendarDays, label: "Delivery Date" },
  budget: { Icon: CircleDollarSign, label: "Budget" },
  bouquet_budget: { Icon: CircleDollarSign, label: "Bouquet Budget" },
  amount: { Icon: CircleDollarSign, label: "Amount" },
  price: { Icon: CircleDollarSign, label: "Price" },
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
  "bouquet_budget",
  "budget",
  "amount",
  "price",
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
      Icon: cfg?.Icon ?? pickIconForKey(key),
      label: cfg?.label ?? titleCase(key),
      value: display,
    });
  }

  return rows;
}

function pickIconForKey(key: string): LucideIcon {
  const k = key.toLowerCase();
  if (/(budget|price|amount|cost|total)/.test(k)) return CircleDollarSign;
  if (/(date|day|when)/.test(k)) return CalendarDays;
  if (/(phone|mobile|tel)/.test(k)) return Phone;
  if (/(name|recipient|contact)/.test(k)) return User;
  return MapPin;
}

// "recipient_name" → "Recipient Name". Title Case for label legibility.
function titleCase(key: string): string {
  const spaced = key.replace(/[_-]+/g, " ").trim();
  if (!spaced) return key;
  return spaced
    .split(" ")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function formatValue(key: string, raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  const k = key.toLowerCase();
  if (k === "delivery_date" || k === "date") return formatDate(value);
  if (/(phone|mobile|tel)/.test(k)) return formatPhone(value);
  if (/(budget|price|amount|cost|total)/.test(k)) return formatMoney(value);
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

// "07782647583" → "077 826 4758". Groups LK-style mobile numbers as 3,3,4.
// Anything that doesn't match the 10/11 digit shape is returned untouched.
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return raw;
}

// "5000 - 10000" → "Rs 5,000 to Rs 10,000". Delegates to the shared LKR
// formatter in lib/format so the rupee symbol and grouping match the rest
// of the app (Price atom, master design system rule). Falls back to raw
// when no numbers parse, so free-form phrases ("around 5k") still render.
function formatMoney(raw: string): string {
  const matches = raw.match(/\d[\d,]*/g);
  if (!matches || matches.length === 0) return raw;
  const nums = matches.map((m) => Number.parseInt(m.replace(/,/g, ""), 10)).filter(Number.isFinite);
  if (nums.length === 0) return raw;
  if (nums.length >= 2) {
    return `${formatLkr({ amount: nums[0]!, currency: "LKR" })} to ${formatLkr({ amount: nums[1]!, currency: "LKR" })}`;
  }
  return formatLkr({ amount: nums[0]!, currency: "LKR" });
}
