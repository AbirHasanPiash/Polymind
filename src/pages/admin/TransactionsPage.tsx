import { useMemo, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { CheckCircle2, Clock, CreditCard, XCircle } from "lucide-react";

import { fetcher } from "../../api/client";
import type { AdminTransaction } from "../../api/types";
import { CardStat, EmptyRow, SkeletonCards, SkeletonRows, TableShell, Td, Th, Tr } from "../../components/admin/DataTable";
import { Button } from "../../components/ui/button";
import { Avatar, Badge, Card, Page, PageHeader, Segmented } from "../../components/ui/primitives";
import { formatCredits, formatCurrency, formatDateTime } from "../../lib/format";

type StatusFilter = "all" | "completed" | "pending" | "failed";

const PAGE_SIZE = 50;

const STATUS_META: Record<string, { tone: "success" | "warning" | "danger" | "neutral"; icon: typeof CheckCircle2; label: string }> = {
  completed: { tone: "success", icon: CheckCircle2, label: "Completed" },
  pending: { tone: "warning", icon: Clock, label: "Pending" },
  failed: { tone: "danger", icon: XCircle, label: "Failed" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { tone: "neutral" as const, icon: Clock, label: status };
  return (
    <Badge tone={meta.tone}>
      <meta.icon className="h-3 w-3" /> {meta.label}
    </Badge>
  );
}

function gatewayLabel(gateway: string | null): string {
  if (!gateway) return "—";
  return gateway.charAt(0).toUpperCase() + gateway.slice(1);
}

export default function TransactionsPage() {
  const [status, setStatus] = useState<StatusFilter>("all");

  const getKey = (index: number, previous: AdminTransaction[] | null) => {
    if (previous && previous.length < PAGE_SIZE) return null;
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(index * PAGE_SIZE) });
    if (status !== "all") params.set("status", status);
    return `/admin/stats/transactions?${params.toString()}`;
  };

  const { data, error, isLoading, isValidating, size, setSize } = useSWRInfinite<AdminTransaction[]>(getKey, fetcher, {
    revalidateFirstPage: false,
  });

  const rows = useMemo(() => (data ?? []).flat(), [data]);
  const lastPage = data?.[data.length - 1];
  const hasMore = Boolean(lastPage && lastPage.length === PAGE_SIZE);
  const loadingMore = isValidating && size > (data?.length ?? 0);
  const showSkeleton = isLoading && !data;

  const completedTotal = useMemo(() => rows.filter((row) => row.status === "completed").reduce((sum, row) => sum + Number(row.amount), 0), [rows]);

  return (
    <Page>
      <PageHeader
        eyebrow="Admin"
        title="Transactions"
        description="Every checkout across all users, newest first."
        actions={
          <Segmented<StatusFilter>
            aria-label="Status"
            size="md"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All" },
              { value: "completed", label: "Completed" },
              { value: "pending", label: "Pending" },
              { value: "failed", label: "Failed" },
            ]}
          />
        }
      />

      {rows.length > 0 && (
        <p className="mt-6 text-sm text-fg-muted">
          Showing <span className="font-medium text-fg">{rows.length}</span> transaction{rows.length === 1 ? "" : "s"}
          {status === "all" || status === "completed" ? (
            <>
              {" "}
              · <span className="font-mono text-fg">{formatCurrency(completedTotal)}</span> completed in this list
            </>
          ) : null}
        </p>
      )}

      {/* Desktop table */}
      <div className="mt-6 hidden md:block">
        <TableShell>
          <thead>
            <tr>
              <Th>User</Th>
              <Th>Package</Th>
              <Th>Gateway</Th>
              <Th>Status</Th>
              <Th align="right">Amount</Th>
              <Th align="right">Credits</Th>
              <Th>Created</Th>
              <Th>Completed</Th>
            </tr>
          </thead>
          <tbody>
            {showSkeleton ? (
              <SkeletonRows columns={8} rows={6} />
            ) : error && !data ? (
              <EmptyRow columns={8}>Failed to load transactions. Try refreshing.</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow columns={8}>No transactions{status !== "all" ? ` with status “${status}”` : ""} yet.</EmptyRow>
            ) : (
              rows.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    <span className="flex items-center gap-2.5">
                      <Avatar name={row.email} size="sm" />
                      <span className="max-w-[16rem] truncate font-mono text-xs">{row.email ?? row.user_id}</span>
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap">{row.package_name ?? <span className="text-fg-subtle">—</span>}</Td>
                  <Td className="whitespace-nowrap">{gatewayLabel(row.payment_gateway)}</Td>
                  <Td>
                    <StatusBadge status={row.status} />
                  </Td>
                  <Td align="right" className="font-mono whitespace-nowrap">{formatCurrency(row.amount, row.currency ?? "USD")}</Td>
                  <Td align="right" className="font-mono whitespace-nowrap text-accent">+{formatCredits(row.credits_added)}</Td>
                  <Td className="whitespace-nowrap text-fg-muted">{formatDateTime(row.created_at)}</Td>
                  <Td className="whitespace-nowrap text-fg-muted">{row.completed_at ? formatDateTime(row.completed_at) : "—"}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </TableShell>
      </div>

      {/* Phone cards */}
      <div className="mt-6 space-y-3 md:hidden">
        {showSkeleton ? (
          <SkeletonCards />
        ) : rows.length === 0 ? (
          <Card className="px-4 py-10 text-center text-sm text-fg-muted">{error && !data ? "Failed to load transactions." : "No transactions yet."}</Card>
        ) : (
          rows.map((row) => (
            <Card key={row.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={row.email} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-xs text-fg">{row.email ?? row.user_id}</span>
                    <span className="block text-xs text-fg-muted">{formatDateTime(row.created_at)}</span>
                  </span>
                </div>
                <StatusBadge status={row.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3">
                <CardStat label="Amount">
                  <span className="font-mono">{formatCurrency(row.amount, row.currency ?? "USD")}</span>
                </CardStat>
                <CardStat label="Credits">
                  <span className="font-mono text-accent">+{formatCredits(row.credits_added)}</span>
                </CardStat>
                <CardStat label="Package">{row.package_name ?? "—"}</CardStat>
                <CardStat label="Gateway">{gatewayLabel(row.payment_gateway)}</CardStat>
              </div>
            </Card>
          ))
        )}
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={() => void setSize(size + 1)} loading={loadingMore}>
            <CreditCard /> Load more
          </Button>
        </div>
      )}
    </Page>
  );
}
