/** Formatting helpers shared across pages. */

/** Human-readable file size: 2048 -> "2.0 KB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function toNumber(value: number | string | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

/**
 * Credits with two decimals.
 *
 * The API sends `Numeric(18, 6)` values as JSON strings to preserve precision,
 * so the input is coerced rather than assumed to be a number.
 */
export function formatCredits(value: number | string | null | undefined, digits = 2): string {
  return toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Small charges need more precision: 0.0028 credits should not read as 0.00. */
export function formatCost(value: number | string | null | undefined): string {
  const amount = toNumber(value);
  if (amount === 0) return "0";
  if (amount < 0.01) return amount.toFixed(4);
  if (amount < 1) return amount.toFixed(3);
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Money with the currency symbol, defaulting to USD. */
export function formatCurrency(value: number | string | null | undefined, currency = "USD"): string {
  return toNumber(value).toLocaleString(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  });
}

/** 1234567 -> "1.2M", 12345 -> "12.3K". */
export function formatCompact(value: number | string | null | undefined): string {
  return toNumber(value).toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 1 });
}

/** Short absolute date: "14 Aug 2026". */
export function formatDate(value: string | number | Date | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
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

export function formatTime(value: string | number | Date | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

/** Group label for a sidebar list: Today · Yesterday · Previous 7 days · Older. */
export function dayBucket(value: string | null | undefined): string {
  if (!value) return "Older";
  const date = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.floor((startOfToday - date.getTime()) / 86_400_000);
  if (date.getTime() >= startOfToday) return "Today";
  if (diffDays < 1) return "Yesterday";
  if (diffDays < 7) return "Previous 7 days";
  if (diffDays < 30) return "Previous 30 days";
  return "Older";
}

/** Truncate to `length` characters, adding an ellipsis when it was cut. */
export function truncate(text: string, length: number): string {
  if (!text) return "";
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

/** "1.2s" / "850ms" */
export function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function initials(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) return "?";
  const parts = nameOrEmail.trim().split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
