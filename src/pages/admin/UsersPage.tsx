import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Pencil, Search, ShieldCheck, Trash2, Users } from "lucide-react";

import api, { fetcher, getErrorMessage } from "../../api/client";
import type { AdminUser, AdminUserPage, AdminUserUpdate } from "../../api/types";
import { CardStat, EmptyRow, Pagination, SkeletonCards, SkeletonRows, TableShell, Td, Th, Tr } from "../../components/admin/DataTable";
import { EditUserDialog } from "../../components/admin/EditUserDialog";
import { Button } from "../../components/ui/button";
import { ConfirmDialog, Tooltip } from "../../components/ui/overlays";
import { Avatar, Badge, Card, Input, Page, PageHeader, Segmented } from "../../components/ui/primitives";
import { useAuth } from "../../context/auth-context";
import { useToast } from "../../context/toast-context";
import { formatCredits, formatDate } from "../../lib/format";

type RoleFilter = "all" | "admin" | "user";
type StatusFilter = "all" | "active" | "suspended";

const PAGE_SIZE = 20;

export default function UsersPage() {
  const toast = useToast();
  const { user: me } = useAuth();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const key = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (role !== "all") params.set("is_superuser", String(role === "admin"));
    if (status !== "all") params.set("is_active", String(status === "active"));
    return `/admin/users?${params.toString()}`;
  }, [page, debouncedSearch, role, status]);

  // keepPreviousData: the table keeps showing the current page while the next
  // one loads, instead of collapsing to a skeleton on every keystroke.
  const { data, error, isLoading, mutate } = useSWR<AdminUserPage>(key, fetcher, { keepPreviousData: true });

  const saveUser = async (userId: string, patch: AdminUserUpdate) => {
    try {
      await api.patch(`/admin/users/${userId}`, patch);
      await mutate();
      toast.success("User updated");
    } catch (err) {
      // Surfaces the backend's reason, e.g. "You cannot remove your own admin privileges".
      toast.error(getErrorMessage(err, "Failed to update user"));
      throw err;
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(`/admin/users/${deleting.id}`);
      await mutate();
      toast.success(`Deleted ${deleting.email}`);
      setDeleting(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete user"));
    } finally {
      setBusy(false);
    }
  };

  const users = data?.users ?? [];
  const total = data?.total_count ?? 0;
  const showSkeleton = isLoading && !data;

  return (
    <Page>
      <PageHeader eyebrow="Admin" title="Users" description="Search accounts, adjust roles and wallet balances, and suspend or remove users." />

      <Card className="mt-8 flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or email…" className="pl-9" aria-label="Search users" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<RoleFilter>
            aria-label="Role"
            size="md"
            value={role}
            onChange={(value) => {
              setRole(value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All roles" },
              { value: "admin", label: "Admins" },
              { value: "user", label: "Users" },
            ]}
          />
          <Segmented<StatusFilter>
            aria-label="Status"
            size="md"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[
              { value: "all", label: "Any status" },
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
            ]}
          />
        </div>
      </Card>

      {/* Desktop table */}
      <div className="mt-6 hidden md:block">
        <TableShell>
          <thead>
            <tr>
              <Th>User</Th>
              <Th>Status</Th>
              <Th align="right">Wallet</Th>
              <Th>Joined</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {showSkeleton ? (
              <SkeletonRows columns={5} />
            ) : error && !data ? (
              <EmptyRow columns={5}>Failed to load users. Try refreshing.</EmptyRow>
            ) : users.length === 0 ? (
              <EmptyRow columns={5}>No users match these filters.</EmptyRow>
            ) : (
              users.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    <span className="flex items-center gap-3">
                      <Avatar name={row.full_name || row.email} admin={row.is_superuser} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 font-medium">
                          <span className="truncate">{row.full_name || "No name"}</span>
                          {row.id === me?.id && <Badge tone="accent">You</Badge>}
                        </span>
                        <span className="block truncate font-mono text-xs text-fg-muted">{row.email}</span>
                      </span>
                    </span>
                  </Td>
                  <Td>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={row.is_active ? "success" : "danger"}>{row.is_active ? "Active" : "Suspended"}</Badge>
                      {row.is_superuser && (
                        <Badge tone="warning">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </Badge>
                      )}
                    </span>
                  </Td>
                  <Td align="right" className="font-mono whitespace-nowrap">{formatCredits(row.wallet?.credits)} cr</Td>
                  <Td className="whitespace-nowrap text-fg-muted">{formatDate(row.created_at)}</Td>
                  <Td align="right">
                    <span className="inline-flex items-center gap-1">
                      <Tooltip content="Edit user">
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditing(row)} aria-label={`Edit ${row.email}`}>
                          <Pencil />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Delete user">
                        <Button variant="ghost" size="icon-sm" className="hover:bg-danger/10 hover:text-danger" onClick={() => setDeleting(row)} aria-label={`Delete ${row.email}`}>
                          <Trash2 />
                        </Button>
                      </Tooltip>
                    </span>
                  </Td>
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
        ) : users.length === 0 ? (
          <Card className="px-4 py-10 text-center text-sm text-fg-muted">{error && !data ? "Failed to load users." : "No users match these filters."}</Card>
        ) : (
          users.map((row) => (
            <Card key={row.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar name={row.full_name || row.email} admin={row.is_superuser} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-medium text-fg">
                    <span className="truncate">{row.full_name || "No name"}</span>
                    {row.id === me?.id && <Badge tone="accent">You</Badge>}
                  </p>
                  <p className="truncate font-mono text-xs text-fg-muted">{row.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone={row.is_active ? "success" : "danger"}>{row.is_active ? "Active" : "Suspended"}</Badge>
                    {row.is_superuser && (
                      <Badge tone="warning">
                        <ShieldCheck className="h-3 w-3" /> Admin
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3">
                <CardStat label="Wallet">
                  <span className="font-mono">{formatCredits(row.wallet?.credits)} cr</span>
                </CardStat>
                <CardStat label="Joined">{formatDate(row.created_at)}</CardStat>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditing(row)}>
                  <Pencil /> Edit
                </Button>
                <Button variant="danger-soft" size="sm" className="flex-1" onClick={() => setDeleting(row)}>
                  <Trash2 /> Delete
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="mt-6">
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} loading={isLoading} />
      </div>

      {!showSkeleton && total === 0 && !debouncedSearch && role === "all" && status === "all" && (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
          <Users className="h-4 w-4" /> No accounts yet.
        </p>
      )}

      <EditUserDialog user={editing} open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} onSave={saveUser} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.email ?? "this user"}?`}
        description="Their conversations, generated media, wallet and purchase history will be permanently removed. This cannot be undone."
        confirmLabel="Delete user"
        loading={busy}
        onConfirm={confirmDelete}
      />
    </Page>
  );
}
