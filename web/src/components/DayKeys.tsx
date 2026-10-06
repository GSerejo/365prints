"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Setas ← e → do teclado levam ao dia anterior e ao próximo. */
export function DayKeys({ older, newer }: { older: string | null; newer: string | null }) {
  const router = useRouter();
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented) return;
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      const href = event.key === "ArrowLeft" ? older : event.key === "ArrowRight" ? newer : null;
      if (href) router.push(href);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [older, newer, router]);
  return null;
}
