import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

// Sem chave (ex.: rodando localmente) o site funciona normalmente, só não registra nada.
if (key) {
  posthog.init(key, {
    api_host: "/ingest",
    ui_host:
      process.env.NEXT_PUBLIC_POSTHOG_REGION === "eu"
        ? "https://eu.posthog.com"
        : "https://us.posthog.com",
    defaults: "2026-08-30",
    person_profiles: "identified_only",
    // Só estatísticas de uso: nada de gravar a tela de quem visita (e o site não usa pesquisas).
    disable_session_recording: true,
    disable_surveys: true,
  });
}
