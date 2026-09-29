"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

export function ContentRequest({ query }: { query: string | null }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return <p className="mt-6 text-sm font-medium text-accent">Valeu! Sua sugestão foi registrada.</p>;
  }

  return (
    <form
      className="mt-6 flex flex-col gap-2 text-left"
      onSubmit={(event) => {
        event.preventDefault();
        if (!text.trim()) return;
        track("content_request", { text: text.trim().slice(0, 500), query: query || null });
        setSent(true);
      }}
    >
      <label htmlFor="content-request" className="text-sm font-medium">
        O que você queria aprender?
      </label>
      <textarea
        id="content-request"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
        maxLength={500}
        placeholder="Ex.: como imprimir TPU sem entupir o bico"
        className="rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-accent"
      />
      <button
        type="submit"
        className="self-end rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:opacity-90"
      >
        Enviar sugestão
      </button>
    </form>
  );
}
