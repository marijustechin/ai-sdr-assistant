"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Accessible "Back to top" control, visible only after scrolling. Smooth
 * scrolling is skipped when the user prefers reduced motion.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleClick() {
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        "fixed bottom-6 right-6 z-40 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-md transition-opacity",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        visible
          ? "cursor-pointer opacity-100 motion-safe:transition-opacity"
          : "pointer-events-none opacity-0",
      )}
    >
      Back to top
    </button>
  );
}
