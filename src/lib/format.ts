/** Formatting helpers shared across pages, previously re-implemented in each one. */

/** Human-readable file size: 2048 -> "2.0 KB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Credits with two decimals.
 *
 * The API sends `Numeric(18, 6)` values as JSON strings to preserve precision,
 * so the input is coerced rather than assumed to be a number.
 */
export function formatCredits(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "0.00";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Money with the currency symbol, defaulting to USD. */
export function formatCurrency(value: number | string | null | undefined, currency = "USD"): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "-";
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  });
}

/** Short absolute date: "14 Aug 2026". */
export function formatDate(value: string | number | Date | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Date and time, for tables where ordering within a day matters. */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Relative time: "just now", "5 min ago", "3 days ago". */
export function formatRelativeTime(value: string | number | Date | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["minute", 60],
    ["hour", 3600],
    ["day", 86400],
    ["month", 2_592_000],
    ["year", 31_536_000],
  ];

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  let unit: Intl.RelativeTimeFormatUnit = "minute";
  let divisor = 60;
  for (const [candidateUnit, candidateDivisor] of units) {
    if (seconds < candidateDivisor * 60 || candidateUnit === "year") {
      unit = candidateUnit;
      divisor = candidateDivisor;
      break;
    }
  }
  return formatter.format(-Math.round(seconds / divisor), unit);
}

/** Truncate to `length` characters, adding an ellipsis when it was cut. */
export function truncate(text: string, length: number): string {
  if (!text) return "";
  return text.length > length ? `${text.slice(0, length)}…` : text;
}
