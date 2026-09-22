import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BookmarkPlus,
  Check,
  KeyRound,
  Monitor,
  Moon,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
} from "lucide-react";

import api, { getErrorMessage } from "../api/client";
import type { Effort, Preferences, SavedPrompt } from "../api/types";
import { useTheme, type Theme } from "../components/theme-context";
import { Button } from "../components/ui/button";
import { ConfirmDialog, Dialog, DialogContent, DialogFooter, Switch } from "../components/ui/overlays";
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Page,
  PageHeader,
  Segmented,
  Select,
  Textarea,
} from "../components/ui/primitives";
import { useAuth } from "../context/auth-context";
import { useToast } from "../context/toast-context";
import { useModelCatalogue } from "../hooks/useModelCatalogue";
import { formatDate } from "../lib/format";
import { AUTO_MODEL, EFFORT_META, PROVIDER_META, groupByProvider } from "../lib/models";

const MIN_PASSWORD_LENGTH = 8;
const MAX_INSTRUCTIONS = 4000;
const MAX_SAVED_PROMPTS = 50;
const EFFORTS: Effort[] = ["low", "medium", "high"];

type PromptDraft = { id: string | null; title: string; content: string };

export default function SettingsPage() {
  const { user, refreshProfile, updatePreferences, logout } = useAuth();
  const toast = useToast();
  const { models } = useModelCatalogue();
  const { theme, setTheme } = useTheme();

  const preferences: Preferences | undefined = user?.preferences;

  // Profile
  const [fullName, setFullName] = useState(() => user?.full_name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Assistant
  const [instructions, setInstructions] = useState(() => preferences?.custom_instructions ?? "");
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [savingPreference, setSavingPreference] = useState<string | null>(null);

  // Saved prompts
  const [promptDraft, setPromptDraft] = useState<PromptDraft | null>(null);
  const [promptToDelete, setPromptToDelete] = useState<SavedPrompt | null>(null);
  const [savingPrompt, setSavingPrompt] = useState(false);

  // Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  // Danger zone
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!user || !preferences) {
    return (
      <Page width="narrow">
        <PageHeader eyebrow="Account" title="Settings" />
        <p className="mt-6 text-sm text-fg-muted">Loading your profile…</p>
      </Page>
    );
  }

  const savedInstructions = preferences.custom_instructions ?? "";
  const instructionsDirty = instructions.trim() !== savedInstructions.trim();
  const profileDirty = fullName.trim() !== (user.full_name ?? "").trim();

  /* ---------------------------------------------------------------- handlers */

  const savePreference = async (key: string, patch: Partial<Preferences>, message = "Saved") => {
    setSavingPreference(key);
    try {
      await updatePreferences(patch);
      toast.success(message);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save your preference"));
    } finally {
      setSavingPreference(null);
    }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!profileDirty || savingProfile) return;
    setSavingProfile(true);
    try {
      await api.patch("/users/me", { full_name: fullName.trim() || null });
      await refreshProfile();
      toast.success("Profile updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update your profile"));
    } finally {
      setSavingProfile(false);
    }
  };

  const saveInstructions = async () => {
    if (!instructionsDirty || savingInstructions) return;
    setSavingInstructions(true);
    try {
      await updatePreferences({ custom_instructions: instructions.trim() || null });
      toast.success(instructions.trim() ? "Custom instructions saved" : "Custom instructions cleared");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save your instructions"));
    } finally {
      setSavingInstructions(false);
    }
  };

  const savePrompt = async (event: FormEvent) => {
    event.preventDefault();
    if (!promptDraft || savingPrompt) return;
    const title = promptDraft.title.trim();
    const content = promptDraft.content.trim();
    if (!title || !content) return;

    const existing = preferences.saved_prompts;
    const next = promptDraft.id
      ? existing.map((prompt) => (prompt.id === promptDraft.id ? { ...prompt, title, content } : prompt))
      : [...existing, { id: crypto.randomUUID(), title, content }];
    if (next.length > MAX_SAVED_PROMPTS) {
      toast.error(`You can keep up to ${MAX_SAVED_PROMPTS} saved prompts`);
      return;
    }

    setSavingPrompt(true);
    try {
      await updatePreferences({ saved_prompts: next });
      setPromptDraft(null);
      toast.success(promptDraft.id ? "Prompt updated" : "Prompt saved");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save the prompt"));
    } finally {
      setSavingPrompt(false);
    }
  };

  const deletePrompt = async () => {
    if (!promptToDelete) return;
    setSavingPrompt(true);
    try {
      await updatePreferences({ saved_prompts: preferences.saved_prompts.filter((prompt) => prompt.id !== promptToDelete.id) });
      setPromptToDelete(null);
      toast.success("Prompt deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete the prompt"));
    } finally {
      setSavingPrompt(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (changingPassword) return;
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Use at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match");
      return;
    }
    setPasswordError(null);
    setChangingPassword(true);
    try {
      await api.post("/users/me/password", {
        current_password: user.has_password ? currentPassword : undefined,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await refreshProfile();
      toast.success("Password changed");
    } catch (error) {
      setPasswordError(getErrorMessage(error, "Could not change your password"));
    } finally {
      setChangingPassword(false);
    }
  };

  const deleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await api.request({
        method: "DELETE",
        url: "/users/me",
        data: { password: user.has_password ? deletePassword : undefined, confirmation: "DELETE" },
      });
      toast.success("Your account has been deleted");
      logout();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete your account"));
      setDeleting(false);
    }
  };

  const canDelete = deleteConfirmation === "DELETE" && (!user.has_password || deletePassword.length > 0);

  /* ------------------------------------------------------------------ render */

  return (
    <Page width="narrow">
      <PageHeader eyebrow="Account" title="Settings" description="Your profile, how the assistant behaves for you, and account security." />

      <div className="mt-6 space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader
            title="Profile"
            description="How you appear in Polymind."
            action={
              user.is_superuser ? (
                <Badge tone="warning">
                  <ShieldCheck className="h-3 w-3" /> Admin
                </Badge>
              ) : undefined
            }
          />
          <CardBody>
            <div className="flex items-center gap-4">
              <Avatar name={user.full_name || user.email} admin={user.is_superuser} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-fg">{user.full_name || "Unnamed"}</p>
                <p className="truncate text-sm text-fg-muted">{user.email}</p>
                {user.created_at && <p className="mt-0.5 text-xs text-fg-subtle">Member since {formatDate(user.created_at)}</p>}
              </div>
            </div>

            <form onSubmit={(event) => void saveProfile(event)} className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="full_name">
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your name"
                  maxLength={120}
                  autoComplete="name"
                />
              </Field>
              <Field label="Email" htmlFor="email" hint="Your email is your sign-in and cannot be changed here.">
                <Input id="email" value={user.email} disabled readOnly />
              </Field>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={!profileDirty} loading={savingProfile}>
                  <UserRound />
                  Save profile
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Assistant */}
        <Card>
          <CardHeader title="Assistant" description="Defaults for every new conversation. You can still change them per message." />
          <CardBody className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Default model"
                htmlFor="default_model"
                hint={
                  savingPreference === "default_model"
                    ? "Saving…"
                    : "Auto reads each message and picks the best model for it."
                }
              >
                <Select
                  id="default_model"
                  value={preferences.default_model}
                  disabled={savingPreference === "default_model"}
                  onChange={(event) => void savePreference("default_model", { default_model: event.target.value }, "Default model saved")}
                >
                  <option value={AUTO_MODEL}>Auto — smart routing</option>
                  {groupByProvider(models).map((group) => (
                    <optgroup key={group.provider} label={PROVIDER_META[group.provider].label}>
                      {group.models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.display_name}
                          {model.badge ? ` (${model.badge})` : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              </Field>

              <Field label="Reasoning depth" hint={EFFORT_META[preferences.default_effort].hint}>
                <Segmented<Effort>
                  aria-label="Default reasoning depth"
                  size="md"
                  className="w-full [&>button]:flex-1"
                  value={preferences.default_effort}
                  onChange={(effort) => void savePreference("default_effort", { default_effort: effort }, "Reasoning depth saved")}
                  options={EFFORTS.map((effort) => ({ value: effort, label: EFFORT_META[effort].label, title: EFFORT_META[effort].hint }))}
                />
              </Field>
            </div>

            <Field
              label="Custom instructions"
              htmlFor="custom_instructions"
              hint="Sent with every message: your role, preferred tone, formats you like, things to avoid."
            >
              <Textarea
                id="custom_instructions"
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                maxLength={MAX_INSTRUCTIONS}
                rows={5}
                placeholder="e.g. I'm a backend engineer. Prefer concise answers with code first, then a short explanation."
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="font-mono text-[11px] text-fg-subtle">
                  {instructions.length} / {MAX_INSTRUCTIONS}
                </span>
                <div className="flex items-center gap-2">
                  {!instructionsDirty && savedInstructions && (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <Check className="h-3.5 w-3.5" /> Saved
                    </span>
                  )}
                  {instructionsDirty && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setInstructions(savedInstructions)}>
                      Discard
                    </Button>
                  )}
                  <Button type="button" size="sm" disabled={!instructionsDirty} loading={savingInstructions} onClick={() => void saveInstructions()}>
                    Save instructions
                  </Button>
                </div>
              </div>
            </Field>

            <div className="divide-y divide-line rounded-xl border border-line">
              <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
                <span>
                  <span className="block text-sm font-medium text-fg">Send with Enter</span>
                  <span className="block text-xs text-fg-muted">Off: Enter adds a line and ⌘/Ctrl + Enter sends.</span>
                </span>
                <Switch
                  checked={preferences.send_on_enter}
                  disabled={savingPreference === "send_on_enter"}
                  onCheckedChange={(checked) => void savePreference("send_on_enter", { send_on_enter: checked })}
                  aria-label="Send with Enter"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
                <span>
                  <span className="block text-sm font-medium text-fg">Show cost per reply</span>
                  <span className="block text-xs text-fg-muted">Credits, tokens and time under each answer.</span>
                </span>
                <Switch
                  checked={preferences.show_costs}
                  disabled={savingPreference === "show_costs"}
                  onCheckedChange={(checked) => void savePreference("show_costs", { show_costs: checked })}
                  aria-label="Show cost per reply"
                />
              </label>
            </div>
          </CardBody>
        </Card>

        {/* Saved prompts */}
        <Card>
          <CardHeader
            title="Saved prompts"
            description={`Reusable prompts you can drop into any chat from the composer. ${preferences.saved_prompts.length} of ${MAX_SAVED_PROMPTS}.`}
            action={
              <Button
                size="sm"
                variant="outline"
                disabled={preferences.saved_prompts.length >= MAX_SAVED_PROMPTS}
                onClick={() => setPromptDraft({ id: null, title: "", content: "" })}
              >
                <Plus />
                Add prompt
              </Button>
            }
          />
          <CardBody className="pt-3">
            {preferences.saved_prompts.length === 0 ? (
              <EmptyState
                className="py-8"
                icon={<BookmarkPlus className="h-6 w-6" />}
                title="No saved prompts yet"
                description="Save the instructions you type again and again — a code review checklist, a summary format, a tone guide."
                action={
                  <Button size="sm" onClick={() => setPromptDraft({ id: null, title: "", content: "" })}>
                    <Plus />
                    Add your first prompt
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {preferences.saved_prompts.map((prompt) => (
                  <li key={prompt.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">{prompt.title}</p>
                      <p className="mt-0.5 text-xs text-fg-muted line-clamp-2">{prompt.content}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setPromptDraft({ id: prompt.id, title: prompt.title, content: prompt.content })}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-fg-subtle hover:bg-surface-2 hover:text-fg"
                        aria-label={`Edit ${prompt.title}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPromptToDelete(prompt)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-fg-subtle hover:bg-danger/10 hover:text-danger"
                        aria-label={`Delete ${prompt.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader title="Appearance" description="Pick a theme, or follow your device." />
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  { value: "light", label: "Light", icon: Sun },
                  { value: "dark", label: "Dark", icon: Moon },
                  { value: "system", label: "System", icon: Monitor },
                ] as { value: Theme; label: string; icon: typeof Sun }[]
              ).map((option) => {
                const active = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    aria-pressed={active}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      active ? "border-accent bg-accent-soft text-fg" : "border-line bg-surface-2/40 text-fg-muted hover:border-line-strong hover:text-fg"
                    }`}
                  >
                    <option.icon className={`h-5 w-5 ${active ? "text-accent" : ""}`} />
                    <span className="text-sm font-medium">{option.label}</span>
                    {active && <Check className="ml-auto h-4 w-4 text-accent" />}
                  </button>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader title="Security" description={user.has_password ? "Change the password you sign in with." : "Manage how you sign in."} />
          <CardBody>
            {user.has_password ? (
              <form onSubmit={(event) => void changePassword(event)} className="grid gap-4 sm:grid-cols-2">
                <Field label="Current password" htmlFor="current_password" className="sm:col-span-2">
                  <Input
                    id="current_password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </Field>
                <Field label="New password" htmlFor="new_password" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
                  <Input
                    id="new_password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD_LENGTH}
                    required
                  />
                </Field>
                <Field label="Confirm new password" htmlFor="confirm_password" error={passwordError}>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </Field>
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" loading={changingPassword} disabled={!currentPassword || !newPassword || !confirmPassword}>
                    <KeyRound />
                    Change password
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-fg">This account signs in with Google</p>
                    <p className="mt-0.5 text-xs text-fg-muted">
                      To add a password as a second way in, use the reset flow: we will email you a link to set one.
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/forgot-password">Set a password</Link>
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Danger zone */}
        <Card className="border-danger/30">
          <CardHeader title="Danger zone" description="Irreversible actions. Please be certain." />
          <CardBody>
            {user.is_superuser ? (
              <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-2/50 p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <p className="text-sm text-fg-muted">Admin accounts cannot delete themselves. Ask another administrator to remove this account.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-fg">Delete account</p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    Removes your conversations, generated media, transactions and remaining credits. This cannot be undone.
                  </p>
                </div>
                <Button variant="danger-soft" onClick={() => setDeleteOpen(true)}>
                  <Trash2 />
                  Delete my account
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Prompt editor */}
      <Dialog open={promptDraft !== null} onOpenChange={(open) => !open && !savingPrompt && setPromptDraft(null)}>
        <DialogContent title={promptDraft?.id ? "Edit prompt" : "New saved prompt"} description="Insert it into any chat from the bookmark button in the composer.">
          <form onSubmit={(event) => void savePrompt(event)} className="space-y-4">
            <Field label="Title" htmlFor="prompt_title">
              <Input
                id="prompt_title"
                value={promptDraft?.title ?? ""}
                onChange={(event) => setPromptDraft((draft) => (draft ? { ...draft, title: event.target.value } : draft))}
                maxLength={80}
                placeholder="e.g. Code review checklist"
                autoFocus
                required
              />
            </Field>
            <Field label="Prompt" htmlFor="prompt_content">
              <Textarea
                id="prompt_content"
                value={promptDraft?.content ?? ""}
                onChange={(event) => setPromptDraft((draft) => (draft ? { ...draft, content: event.target.value } : draft))}
                maxLength={4000}
                rows={6}
                placeholder="Review the following code for bugs, security issues and readability…"
                required
              />
              <p className="mt-1 text-right font-mono text-[11px] text-fg-subtle">{promptDraft?.content.length ?? 0} / 4000</p>
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPromptDraft(null)} disabled={savingPrompt}>
                Cancel
              </Button>
              <Button type="submit" loading={savingPrompt} disabled={!promptDraft?.title.trim() || !promptDraft?.content.trim()}>
                {promptDraft?.id ? "Save changes" : "Save prompt"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={promptToDelete !== null}
        onOpenChange={(open) => !open && setPromptToDelete(null)}
        title="Delete this saved prompt?"
        description={promptToDelete ? `“${promptToDelete.title}” will be removed from your library.` : undefined}
        loading={savingPrompt}
        onConfirm={deletePrompt}
      />

      {/* Delete account */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (deleting) return;
          setDeleteOpen(open);
          if (!open) {
            setDeleteConfirmation("");
            setDeletePassword("");
          }
        }}
      >
        <DialogContent
          title="Delete your account?"
          description="Everything you created in Polymind will be permanently erased, including any credits left in your wallet."
          size="sm"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (canDelete) void deleteAccount();
            }}
            className="space-y-4"
          >
            <Field label={<span>Type <span className="font-mono font-semibold text-danger">DELETE</span> to confirm</span>} htmlFor="delete_confirmation">
              <Input
                id="delete_confirmation"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="DELETE"
              />
            </Field>
            {user.has_password && (
              <Field label="Your password" htmlFor="delete_password">
                <Input
                  id="delete_password"
                  type="password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  autoComplete="current-password"
                />
              </Field>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Keep my account
              </Button>
              <Button type="submit" variant="danger" loading={deleting} disabled={!canDelete}>
                Delete permanently
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
