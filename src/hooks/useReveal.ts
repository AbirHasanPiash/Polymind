import { useEffect, useRef, useState } from "react";

/**
 * Reveal an element the first time it scrolls into view.
 *
 * The observer disconnects on the first intersection: these are entrance
 * animations, so re-running them when the user scrolls back up would turn a
 * quiet page into a flickering one.
 *
 * Elements start hidden, so a browser without IntersectionObserver would be
 * left staring at a blank page. That case is decided in the initialiser rather
 * than in an effect — the content is simply visible from the first render.
 */
export function useReveal<T extends HTMLElement>(rootMargin = "0px 0px -10% 0px") {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    if (revealed) return;

    // Always attached: the caller renders the element unconditionally with this
    // ref, so reaching the effect means the node exists.
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [revealed, rootMargin]);

  return { ref, revealed };
}
