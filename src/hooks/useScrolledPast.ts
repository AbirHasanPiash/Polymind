import { useEffect, useRef, useState } from "react";

/**
 * True once the element the ref is attached to has scrolled out of view.
 *
 * Attach it to a small sentinel at the very top of the page to know whether the
 * page has been scrolled at all.
 *
 * Deliberately not a `window` scroll listener. The app shell sets
 * `overflow-x: hidden` on `#root`, which computes the other axis to
 * `overflow-y: auto`, so `#root` — not the document — is the scroll container:
 * `window.scrollY` stays at 0 forever and a scroll listener on it never fires.
 * Observing a sentinel works whichever element ends up doing the scrolling.
 */
export function useScrolledPast<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setPassed(!entry.isIntersecting),
      { threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, passed };
}
