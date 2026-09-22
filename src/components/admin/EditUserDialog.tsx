import { useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";

import type { AdminUser, AdminUserUpdate } from "../../api/types";
import { toNumber } from "../../lib/format";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, Switch } from "../ui/overlays";
import { Field, Input } from "../ui/primitives";

type Props = {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Resolves when the API accepted the change; rejects (already reported) otherwise. */
  onSave: (userId: string, patch: AdminUserUpdate) => Promise<void>;
};

export function EditUserDialog({ user, open, onOpenChange, onSave }: Props) {
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open && user !== null} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent title="Edit user" description={user?.email}>
        {/* Keyed on the user so the form remounts with fresh values for each account. */}
        {user && <EditUserForm key={user.id} user={user} saving={saving} setSaving={setSaving} onSave={onSave} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EditUserForm({
  user,
  saving,
  setSaving,
  onSave,
  onClose,
}: {
  user: AdminUser;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  onSave: Props["onSave"];
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [isActive, setIsActive] = useState(user.is_active);
  const [isSuperuser, setIsSuperuser] = useState(user.is_superuser);
  const [credits, setCredits] = useState(String(toNumber(user.wallet?.credits)));
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number.parseFloat(credits);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Credits must be zero or a positive number");
      return;
    }
    const patch: AdminUserUpdate = {};
    const trimmed = fullName.trim();
    if (trimmed !== (user.full_name ?? "")) patch.full_name = trimmed || null;
    if (isActive !== user.is_active) patch.is_active = isActive;
    if (isSuperuser !== user.is_superuser) patch.is_superuser = isSuperuser;
    if (amount !== toNumber(user.wallet?.credits)) patch.credits = amount;
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(user.id, patch);
      onClose();
    } catch {
      // The caller already showed the backend's reason; keep the form open.
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Full name" htmlFor="admin-user-name">
        <Input id="admin-user-name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={120} placeholder="No name" />
      </Field>

      <Field label="Wallet balance" htmlFor="admin-user-credits" hint="Sets the balance outright. Purchases and usage keep accruing from this value." error={error}>
        <Input
          id="admin-user-credits"
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={credits}
          onChange={(event) => setCredits(event.target.value)}
          className="font-mono"
        />
      </Field>

      <div className="space-y-3 rounded-xl border border-line bg-surface-2/50 p-4">
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-medium text-fg">Active</span>
            <span className="block text-xs text-fg-muted">Suspended accounts cannot sign in.</span>
          </span>
          <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Account active" />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
              Administrator
              {isSuperuser && <ShieldCheck className="h-4 w-4 text-warning" />}
            </span>
            <span className="block text-xs text-fg-muted">Full access to users, packages and analytics.</span>
          </span>
          <Switch checked={isSuperuser} onCheckedChange={setIsSuperuser} aria-label="Administrator" />
        </label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
      </DialogFooter>
    </form>
  );
}
