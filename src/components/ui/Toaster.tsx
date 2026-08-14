import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";

import type { Toast } from "../../context/toast-context";
import { cn } from "../../lib/utils";

const VARIANT_STYLES = {
  success: {
    icon: CheckCircleIcon,
    accent: "text-emerald-500 dark:text-emerald-400",
    ring: "ring-emerald-500/20",
  },
  error: {
    icon: ExclamationCircleIcon,
    accent: "text-rose-500 dark:text-rose-400",
    ring: "ring-rose-500/20",
  },
  info: {
    icon: InformationCircleIcon,
    accent: "text-blue-500 dark:text-blue-400",
    ring: "ring-blue-500/20",
  },
} as const;

type ToasterProps = {
  toasts: Toast[];
  onDismiss: (id: number) => void;
};

/**
 * Notification stack.
 *
 * Replaces `window.alert`, which blocked the main thread, could not be styled,
 * and on mobile interrupted whatever the user was doing.
 */
export function Toaster({ toasts, onDismiss }: ToasterProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      // pointer-events-none on the stack lets clicks pass through the gaps;
      // each toast re-enables them for itself.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-auto sm:items-end"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const { icon: Icon, accent, ring } = VARIANT_STYLES[toast.variant];
        return (
          <div
            key={toast.id}
            role="status"
            aria-live={toast.variant === "error" ? "assertive" : "polite"}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 shadow-lg ring-1",
              "bg-white dark:bg-[#13151c] border border-slate-200 dark:border-gray-700/60",
              "animate-rise-in",
              ring,
            )}
          >
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", accent)} aria-hidden="true" />
            <p className="min-w-0 flex-1 text-sm leading-snug text-slate-700 dark:text-gray-200 break-words">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="-mr-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              aria-label="Dismiss notification"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
