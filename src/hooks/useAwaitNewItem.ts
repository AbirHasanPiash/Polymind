import { useEffect, useRef } from "react";

type Options<T extends { id: string }> = {
  /** Latest list from SWR. */
  items: T[] | undefined;
  /** True while a generation is in flight. */
  isWaiting: boolean;
  /** Called once with the item that appeared. */
  onArrived: (item: T) => void;
  /** Called if nothing arrives in time. */
  onTimeout: () => void;
  timeoutMs: number;
};

/**
 * Watches a polled list for an item that was not there when the wait began.
 *
 * Media generation is asynchronous: the endpoint returns a task id and the row
 * shows up later. Pages used to poll with a `setInterval` started inside a
 * click handler, which kept running after the component unmounted and fired
 * `alert()` from a page the user had already left. Here the wait is tied to the
 * component's lifetime and SWR owns the polling.
 */
export function useAwaitNewItem<T extends { id: string }>({
  items,
  isWaiting,
  onArrived,
  onTimeout,
  timeoutMs,
}: Options<T>) {
  const knownIds = useRef<Set<string> | null>(null);
  const startedAt = useRef<number | null>(null);

  // Callbacks in refs: they are usually inline arrow functions, and depending on
  // them directly would restart the wait on every render. Written in an effect,
  // since mutating a ref during render is unsafe under concurrent rendering.
  const onArrivedRef = useRef(onArrived);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onArrivedRef.current = onArrived;
    onTimeoutRef.current = onTimeout;
  }, [onArrived, onTimeout]);

  // Snapshot the ids present when the wait starts.
  useEffect(() => {
    if (!isWaiting) {
      knownIds.current = null;
      startedAt.current = null;
      return;
    }
    if (knownIds.current === null) {
      knownIds.current = new Set((items ?? []).map((item) => item.id));
      startedAt.current = Date.now();
    }
  }, [isWaiting, items]);

  useEffect(() => {
    if (!isWaiting || knownIds.current === null) return;

    const fresh = (items ?? []).find((item) => !knownIds.current?.has(item.id));
    if (fresh) {
      onArrivedRef.current(fresh);
      return;
    }

    if (startedAt.current && Date.now() - startedAt.current > timeoutMs) {
      onTimeoutRef.current();
    }
  }, [items, isWaiting, timeoutMs]);
}
