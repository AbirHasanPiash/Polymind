import { useMemo, useState } from "react";
import useSWR from "swr";
import { Archive, ArchiveRestore, Package as PackageIcon, Pencil, Plus, Sparkles } from "lucide-react";

import api, { fetcher, getErrorMessage } from "../../api/client";
import type { Package } from "../../api/types";
import { PackageDialog } from "../../components/admin/PackageDialog";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/overlays";
import { Badge, Card, EmptyState, Page, PageHeader, Skeleton } from "../../components/ui/primitives";
import { useToast } from "../../context/toast-context";
import { formatCredits, formatCurrency, toNumber } from "../../lib/format";
import { cn } from "../../lib/utils";

const PACKAGES_KEY = "/packages/?include_inactive=true";

export default function PackagesPage() {
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<Package[]>(PACKAGES_KEY, fetcher);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [archiving, setArchiving] = useState<Package | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const packages = useMemo(
    () =>
      [...(data ?? [])].sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return toNumber(a.price) - toNumber(b.price);
      }),
    [data],
  );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditing(pkg);
    setDialogOpen(true);
  };

  const onSaved = (pkg: Package) => {
    void mutate((current) => {
      const list = current ?? [];
      return list.some((item) => item.id === pkg.id) ? list.map((item) => (item.id === pkg.id ? pkg : item)) : [...list, pkg];
    });
    toast.success(editing ? "Package updated" : "Package created");
  };

  const archive = async () => {
    if (!archiving) return;
    setBusyId(archiving.id);
    try {
      const { data: updated } = await api.delete<Package>(`/packages/${archiving.id}`);
      await mutate((current) => (current ?? []).map((item) => (item.id === updated.id ? updated : item)), { revalidate: false });
      toast.success(`Archived ${archiving.name}`);
      setArchiving(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to archive package"));
    } finally {
      setBusyId(null);
    }
  };

  const restore = async (pkg: Package) => {
    setBusyId(pkg.id);
    try {
      const { data: updated } = await api.put<Package>(`/packages/${pkg.id}`, { is_active: true });
      await mutate((current) => (current ?? []).map((item) => (item.id === updated.id ? updated : item)), { revalidate: false });
      toast.success(`Restored ${pkg.name}`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to restore package"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Admin"
        title="Packages"
        description="The credit bundles users can buy. Archived packages stay on record for past purchases but are hidden from the store."
        actions={
          <Button onClick={openCreate}>
            <Plus /> New package
          </Button>
        }
      />

      {error && !data ? (
        <EmptyState className="mt-8" title="Could not load packages" description="The packages endpoint did not respond. Try again in a moment." />
      ) : isLoading && !data ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<PackageIcon className="h-6 w-6" />}
          title="No packages yet"
          description="Create the first credit bundle so users have something to buy."
          action={
            <Button onClick={openCreate}>
              <Plus /> Create package
            </Button>
          }
        />
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {packages.map((pkg) => {
            const price = toNumber(pkg.price);
            const credits = toNumber(pkg.credits);
            const busy = busyId === pkg.id;
            return (
              <Card
                key={pkg.id}
                className={cn(
                  "relative flex h-full flex-col p-5",
                  pkg.is_active && pkg.is_featured && "border-accent/50 shadow-accent/10",
                  !pkg.is_active && "border-dashed opacity-75",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className={cn("truncate text-lg font-semibold", pkg.is_active ? "text-fg" : "text-fg-muted")}>{pkg.name}</h3>
                    <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-fg-muted">{pkg.description || "No description provided."}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {pkg.is_active && pkg.is_featured && (
                      <Badge tone="accent">
                        <Sparkles className="h-3 w-3" /> Featured
                      </Badge>
                    )}
                    {!pkg.is_active && (
                      <Badge tone="warning">
                        <Archive className="h-3 w-3" /> Archived
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-surface-2/70 p-3">
                    <p className="text-[11px] tracking-wider text-fg-subtle uppercase">Price</p>
                    <p className="mt-0.5 font-mono text-xl font-semibold text-fg">{formatCurrency(price, pkg.currency ?? "USD")}</p>
                  </div>
                  <div className="rounded-xl bg-surface-2/70 p-3">
                    <p className="text-[11px] tracking-wider text-fg-subtle uppercase">Credits</p>
                    <p className="mt-0.5 font-mono text-xl font-semibold text-accent">{formatCredits(credits, 0)}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-fg-muted">
                  {credits > 0 ? `${formatCurrency(price / credits)} per credit` : "—"}
                </p>

                <div className="mt-auto flex gap-2 border-t border-line pt-4">
                  {pkg.is_active ? (
                    <>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(pkg)} disabled={busy}>
                        <Pencil /> Edit
                      </Button>
                      <Button variant="danger-soft" size="sm" onClick={() => setArchiving(pkg)} disabled={busy} aria-label={`Archive ${pkg.name}`}>
                        <Archive /> Archive
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="secondary" size="sm" className="flex-1" onClick={() => void restore(pkg)} loading={busy}>
                        <ArchiveRestore /> Restore
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(pkg)} disabled={busy} aria-label={`Edit ${pkg.name}`}>
                        <Pencil /> Edit
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <PackageDialog pkg={editing} open={dialogOpen} onOpenChange={setDialogOpen} onSaved={onSaved} />

      <ConfirmDialog
        open={archiving !== null}
        onOpenChange={(open) => !open && setArchiving(null)}
        title={`Archive ${archiving?.name ?? "this package"}?`}
        description="It disappears from the store immediately. Existing purchases keep their record, and you can restore it later."
        confirmLabel="Archive"
        loading={busyId !== null}
        onConfirm={archive}
      />
    </Page>
  );
}
