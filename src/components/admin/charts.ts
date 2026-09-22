/** Chart styling and data helpers shared by the admin dashboards. */

import type { CSSProperties } from "react";

import type { Decimalish } from "../../api/types";
import { toNumber } from "../../lib/format";

/** Recharts renders inline styles, so the palette is passed as CSS variables. */
export const CHART = {
  accent: "var(--accent)",
  brand2: "var(--brand-2)",
  brand3: "var(--brand-3)",
  success: "var(--success)",
  warning: "var(--warning)",
  grid: "var(--line)",
  tick: "var(--fg-muted)",
} as const;

export const CHART_TOOLTIP_STYLE: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  color: "var(--fg)",
  boxShadow: "var(--shadow-pop)",
  fontSize: 12,
};

export const CHART_LABEL_STYLE: CSSProperties = { color: "var(--fg-muted)", marginBottom: 4 };
export const CHART_ITEM_STYLE: CSSProperties = { color: "var(--fg)" };

/** "Sep 21" from "2026-09-21". */
export function shortDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * The API only returns days that have data; charts read better with every day
 * of the window present, so the gaps are filled with zeros here.
 */
export function fillDays(days: number, points: { date: string; value: Decimalish }[]): { date: string; value: number }[] {
  const byDay = new Map(points.map((point) => [point.date, toNumber(point.value)]));
  const result: { date: string; value: number }[] = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset--) {
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
    const key = day.toISOString().slice(0, 10);
    result.push({ date: key, value: byDay.get(key) ?? 0 });
  }
  return result;
}
