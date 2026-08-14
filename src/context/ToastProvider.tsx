import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";

import { Toaster } from "../components/ui/Toaster";
import { ToastContext, type Toast, type ToastApi, type ToastVariant } from "./toast-context";

const DEFAULT_DURATION_MS = 4500;
/** Older toasts are dropped rather than stacking into a wall of notices. */
const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, variant }].slice(-MAX_VISIBLE));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DEFAULT_DURATION_MS),
      );
      return id;
    },
    [dismiss],
  );

  // Stable identity: an unstable context value re-renders every consumer on
  // each provider render, which is how a toast helper turns into page-wide jank.
  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (message: string) => toast(message, "success"),
      error: (message: string) => toast(message, "error"),
      dismiss,
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
