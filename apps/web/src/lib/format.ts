import type { Money } from "@kapruka/protocol";

/** Non-breaking space. Source uses the escape so linters do not flag it. */
const NBSP = " ";

const formatters = new Map<string, Intl.NumberFormat>();

/** LKR shown as "Rs 2,450" with a non-breaking space, no decimals.
 *  USD shown as "$12.99" with two decimals. Never mixed in one view.
 *  Per Section 6 of master.md, the Price atom is the single place this is implemented;
 *  it delegates here.
 */
export function formatMoney(money: Money, locale = "en-LK"): string {
  if (money.currency === "USD") {
    const key = `${locale}|USD`;
    let f = formatters.get(key);
    if (!f) {
      f = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      formatters.set(key, f);
    }
    return f.format(money.amount);
  }
  // LKR: prefer "Rs" prefix (Kapruka convention) with non-breaking space.
  const key = `${locale}|LKR`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    formatters.set(key, f);
  }
  return `Rs${NBSP}${f.format(money.amount)}`;
}

/** Format a count with a non-breaking space before the unit. */
export function formatCount(count: number, singular: string, plural: string): string {
  return `${count}${NBSP}${count === 1 ? singular : plural}`;
}

/** Format a delivery date for display (locale-aware). */
export function formatDate(iso: string, locale = "en-LK"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** mm:ss left, or "0:42 left" under a minute. */
export function formatCountdown(msLeft: number, oneMinuteLabel = "left"): string {
  const totalSec = Math.max(0, Math.floor(msLeft / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) {
    return `0:${s.toString().padStart(2, "0")} ${oneMinuteLabel}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}
