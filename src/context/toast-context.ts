import { createContext, useContext } from "react";

export type ToastVariant = "success" | "error" | "info";

export type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

export type ToastApi = {
  /** Show a toast. Returns its id so it can be dismissed early. */
  toast: (message: string, variant?: ToastVariant) => number;
  success: (message: string) => number;
  error: (message: string) => number;
  dismiss: (id: number) => void;
};

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}
