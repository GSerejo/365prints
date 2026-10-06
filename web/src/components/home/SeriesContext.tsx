"use client";

import { createContext, useContext } from "react";
import type { DayEntry } from "@/lib/series";

type Series = { days: (DayEntry | null)[]; currentDay: number };

const SeriesContext = createContext<Series | null>(null);

/** Os dias do quadro vão uma vez só para o navegador e são lidos pela impressora e pelo calendário. */
export function SeriesProvider({ children, ...series }: Series & { children: React.ReactNode }) {
  return <SeriesContext value={series}>{children}</SeriesContext>;
}

export function useSeries() {
  const series = useContext(SeriesContext);
  if (!series) throw new Error("useSeries precisa de <SeriesProvider>");
  return series;
}
