import { useCallback, useState } from "react";
import type { KeyedMutator } from "swr";

import api, { getErrorMessage } from "../../api/client";
import { useToast } from "../../context/toast-context";

/**
 * Delete-with-confirmation for a polled SWR list: optimistic removal, rolled
 * back if the request fails, with the confirm dialog state kept here so the
 * three studios do not each re-implement it.
 */
export function useDeleteItem<T extends { id: string }>({
  mutate,
  endpoint,
  label,
}: {
  mutate: KeyedMutator<T[]>;
  endpoint: (id: string) => string;
  label: string;
}) {
  const toast = useToast();
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = useCallback(async () => {
    if (!target) return;
    const id = target;
    setBusy(true);
    try {
      await mutate(
        async (current) => {
          await api.delete(endpoint(id));
          return (current ?? []).filter((item) => item.id !== id);
        },
        {
          optimisticData: (current) => (current ?? []).filter((item) => item.id !== id),
          rollbackOnError: true,
          revalidate: false,
        },
      );
      toast.success(`${label} deleted`);
      setTarget(null);
    } catch (error) {
      toast.error(getErrorMessage(error, `Could not delete this ${label.toLowerCase()}`));
    } finally {
      setBusy(false);
    }
  }, [target, mutate, endpoint, label, toast]);

  const cancel = useCallback(() => {
    if (!busy) setTarget(null);
  }, [busy]);

  return { target, request: setTarget, cancel, confirm, busy };
}
