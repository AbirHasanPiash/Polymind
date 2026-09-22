import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import type { Toast } from "../../context/toast-context";
import { cn } from "../../lib/utils";

const VARIANT_STYLES = {
  success: { icon: CheckCircle2, accent: "text-success" },
  error: { icon: AlertCircle, accent: "text-danger" },
  info: { icon: Info, accent: "text-info" },
} as const;

type ToasterProps = {
  toasts: Toast[];
  onDismiss: (id: number) => void;
};

/** Notification stack. Replaces `window.alert`. */
export function Toaster({ toasts, onDismiss }: ToasterProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-auto sm:items-end"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const { icon: Icon, accent } = VARIANT_STYLES[toast.variant];
        return (
          <div
            key={toast.id}
            role="status"
            aria-live={toast.variant === "error" ? "assertive" : "polite"}
            className="surface-pop pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 animate-rise-in"
          >
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", accent)} aria-hidden="true" />
            <p className="min-w-0 flex-1 text-sm leading-snug break-words text-fg">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="-mr-1 rounded-md p-1 text-fg-subtle hover:bg-surface-2 hover:text-fg"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
