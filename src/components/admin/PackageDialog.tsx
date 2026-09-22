import { useMemo, useState, type FormEvent } from "react";
import { Calculator } from "lucide-react";

import api, { getErrorMessage } from "../../api/client";
import type { Package } from "../../api/types";
import { formatCurrency, toNumber } from "../../lib/format";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, Switch } from "../ui/overlays";
import { Badge, Field, Input, Textarea } from "../ui/primitives";

/** Rough unit economics so a package is never priced below what it costs to serve. */
const API_COST_PER_CREDIT = 0.025;
const STRIPE_FIXED_FEE = 0.3;
const STRIPE_PERCENT_FEE = 0.029;

type Props = {
  /** null creates a new package. */
  pkg: Package | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (pkg: Package) => void;
};

export function PackageDialog({ pkg, open, onOpenChange, onSaved }: Props) {
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent title={pkg ? "Edit package" : "New package"} description="A purchasable bundle of credits shown on the billing page." size="lg">
        {/* Keyed so the form remounts with the right initial values on every open. */}
        <PackageForm key={pkg?.id ?? "new"} pkg={pkg} saving={saving} setSaving={setSaving} onSaved={onSaved} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PackageForm({
  pkg,
  saving,
  setSaving,
  onSaved,
  onClose,
}: {
  pkg: Package | null;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  onSaved: (pkg: Package) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(pkg?.name ?? "");
  const [description, setDescription] = useState(pkg?.description ?? "");
  const [price, setPrice] = useState(pkg ? String(toNumber(pkg.price)) : "");
  const [credits, setCredits] = useState(pkg ? String(toNumber(pkg.credits)) : "");
  const [isFeatured, setIsFeatured] = useState(pkg?.is_featured ?? false);
  const [isActive, setIsActive] = useState(pkg?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const priceValue = Number.parseFloat(price);
    const creditsValue = Number.parseFloat(credits);
    if (name.trim().length < 3) return setError("Name must be at least 3 characters");
    if (!Number.isFinite(priceValue) || priceValue <= 0) return setError("Price must be greater than zero");
    if (!Number.isFinite(creditsValue) || creditsValue <= 0) return setError("Credits must be greater than zero");

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: priceValue,
      credits: creditsValue,
      is_featured: isFeatured,
      is_active: isActive,
    };
    setError(null);
    setSaving(true);
    try {
      const { data } = pkg ? await api.put<Package>(`/packages/${pkg.id}`, payload) : await api.post<Package>("/packages/", payload);
      onSaved(data);
      onClose();
    } catch (err) {
      // getErrorMessage unwraps FastAPI's `detail`, so a duplicate name or a
      // validation failure is reported in the backend's own words.
      setError(getErrorMessage(err, "Could not save the package"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <Field label="Name" htmlFor="pkg-name">
        <Input id="pkg-name" value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={50} placeholder="e.g. Creator" required />
      </Field>
      <Field label="Description" htmlFor="pkg-description" hint="Shown under the name on the pricing card.">
        <Textarea id="pkg-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={300} placeholder="For regular users who want room to explore." />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Price (USD)" htmlFor="pkg-price">
          <Input id="pkg-price" type="number" inputMode="decimal" step="0.01" min="0.5" value={price} onChange={(event) => setPrice(event.target.value)} className="font-mono" required />
        </Field>
        <Field label="Credits" htmlFor="pkg-credits">
          <Input id="pkg-credits" type="number" inputMode="decimal" step="0.1" min="1" value={credits} onChange={(event) => setCredits(event.target.value)} className="font-mono" required />
        </Field>
      </div>

      <div className="grid gap-3 rounded-xl border border-line bg-surface-2/50 p-4 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-medium text-fg">Featured</span>
            <span className="block text-xs text-fg-muted">Highlighted as “Most popular”.</span>
          </span>
          <Switch checked={isFeatured} onCheckedChange={setIsFeatured} aria-label="Featured" />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-medium text-fg">Active</span>
            <span className="block text-xs text-fg-muted">Inactive packages are hidden from users.</span>
          </span>
          <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Active" />
        </label>
      </div>

      <ProfitAnalyzer price={Number.parseFloat(price) || 0} credits={Number.parseFloat(credits) || 0} />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {pkg ? "Save changes" : "Create package"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ProfitAnalyzer({ price, credits }: { price: number; credits: number }) {
  const analysis = useMemo(() => {
    if (!price || !credits) return null;
    const stripeFee = price * STRIPE_PERCENT_FEE + STRIPE_FIXED_FEE;
    const apiCost = credits * API_COST_PER_CREDIT;
    const profit = price - stripeFee - apiCost;
    return { stripeFee, apiCost, profit, margin: (profit / price) * 100 };
  }, [price, credits]);

  if (!analysis) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-4 text-sm text-fg-muted">
        <Calculator className="h-4 w-4" />
        Enter a price and credits to see the unit economics
      </div>
    );
  }

  const tone = analysis.margin > 30 ? "success" : analysis.margin > 0 ? "warning" : "danger";

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="flex items-center gap-2 border-b border-line bg-surface-2/60 px-4 py-2 text-[11px] font-semibold tracking-wider text-fg-muted uppercase">
        <Calculator className="h-3.5 w-3.5" /> Projected unit economics
      </div>
      <div className="space-y-2 px-4 py-3 text-sm">
        <Row label="Revenue" value={formatCurrency(price)} />
        <Row label="Stripe fee (2.9% + 30¢)" value={`− ${formatCurrency(analysis.stripeFee)}`} tone="text-danger" />
        <Row label="Estimated provider cost (4× margin baked in)" value={`− ${formatCurrency(analysis.apiCost)}`} tone="text-warning" />
        <div className="my-1 h-px bg-line" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-fg-muted uppercase">Net profit</span>
          <span className="flex items-center gap-2">
            <span className={cn("font-mono text-base font-semibold", analysis.profit > 0 ? "text-success" : "text-danger")}>{formatCurrency(analysis.profit)}</span>
            <Badge tone={tone}>{analysis.margin.toFixed(1)}%</Badge>
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-fg-muted">{label}</span>
      <span className={cn("font-mono text-fg", tone)}>{value}</span>
    </div>
  );
}
