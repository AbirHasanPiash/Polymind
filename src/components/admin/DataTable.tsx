/**
 * Table furniture shared by the admin pages: a scroll-safe shell, header and
 * cell helpers, skeleton rows and an empty row. Pages render a real table on
 * md+ screens and stack cards on phones; both variants use these pieces.
 */

import * as React from "react";

import { cn } from "../../lib/utils";
import { Card, Skeleton } from "../ui/primitives";

export function TableShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="custom-scrollbar overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">{children}</table>
      </div>
    </Card>
  );
}

export function Th({ children, className, align = "left" }: { children?: React.ReactNode; className?: string; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-line bg-surface-2/60 px-4 py-3 text-[11px] font-semibold tracking-wider text-fg-muted uppercase whitespace-nowrap",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, align = "left" }: { children?: React.ReactNode; className?: string; align?: "left" | "right" }) {
  return <td className={cn("px-4 py-3 align-middle text-fg", align === "right" && "text-right", className)}>{children}</td>;
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("border-b border-line last:border-b-0 hover:bg-surface-2/50", className)}>{children}</tr>;
}

export function SkeletonRows({ rows = 5, columns }: { rows?: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row} className="border-b border-line last:border-b-0">
          {Array.from({ length: columns }).map((__, column) => (
            <td key={column} className="px-4 py-3">
              <Skeleton className={cn("h-4", column === 0 ? "w-40" : "w-20")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function EmptyRow({ columns, children }: { columns: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={columns} className="px-4 py-12 text-center text-sm text-fg-muted">
        {children}
      </td>
    </tr>
  );
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="space-y-3 p-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </Card>
      ))}
    </div>
  );
}

/** Label/value pair used inside the phone-size cards. */
export function CardStat({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[11px] font-medium tracking-wider text-fg-subtle uppercase">{label}</p>
      <div className="mt-0.5 text-sm text-fg">{children}</div>
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  loading = false,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  loading?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-fg-muted">
        Showing <span className="font-medium text-fg">{from}</span>–<span className="font-medium text-fg">{to}</span> of{" "}
        <span className="font-medium text-fg">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPage(page - 1)}
          className="h-10 rounded-xl border border-line px-4 text-sm font-medium text-fg hover:bg-surface-2 disabled:opacity-40"
        >
          Previous
        </button>
        <span className="rounded-xl bg-surface-2 px-3 py-2 font-mono text-xs text-fg-muted">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => onPage(page + 1)}
          className="h-10 rounded-xl border border-line px-4 text-sm font-medium text-fg hover:bg-surface-2 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
