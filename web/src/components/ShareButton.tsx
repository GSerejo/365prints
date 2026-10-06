"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

export function ShareButton({ videoId, title }: { videoId: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        track("share", { video_id: videoId, method: "native" });
      } catch {
        // A pessoa fechou a janela de compartilhar.
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    track("share", { video_id: videoId, method: "copy" });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold transition hover:border-brand hover:text-accent"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
      </svg>
      <span aria-live="polite">{copied ? "Link copiado!" : "Compartilhar"}</span>
    </button>
  );
}
