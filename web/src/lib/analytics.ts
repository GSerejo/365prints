import posthog from "posthog-js";

export type Platform = "tiktok" | "instagram";

type Events = {
  search: { query: string; results_count: number; category: string | null };
  search_no_results: { query: string; category: string | null };
  category_selected: { category: string | null };
  video_opened: { video_id: string; day: number | null; query: string | null };
  watch_click: {
    video_id: string;
    day: number | null;
    platform: Platform;
    source: "card" | "detail";
  };
  content_request: { text: string; query: string | null };
};

export function track<E extends keyof Events>(event: E, properties: Events[E]) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    if (process.env.NODE_ENV === "development") console.debug("[analytics]", event, properties);
    return;
  }
  posthog.capture(event, properties);
}
