import { createClient } from "@supabase/supabase-js";
import type { WatchlistMovie } from "../types";

export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://tnbadlzvyobczssypusz.supabase.co";
export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable__J8sJ67EIwcrQ1YKJkHLow_weIhS4OM";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Local storage key fallback
const LOCAL_STORAGE_KEY = "bucklist_local_watchlist_v1";
const TV_PROGRESS_KEY = "bucklist_tv_progress_v1";

export interface TvProgressMap {
  [tmdbId: number]: {
    watchedEpisodes: string[];
    totalEpisodes?: number;
    seasonRatings?: Record<number, number>;
    lastUpdated?: string;
  };
}

export function getLocalWatchlist(): WatchlistMovie[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalWatchlist(items: WatchlistMovie[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function getLocalTvProgress(): TvProgressMap {
  try {
    const raw = localStorage.getItem(TV_PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveLocalTvProgress(progress: TvProgressMap): void {
  try {
    localStorage.setItem(TV_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

export function getSeriesWatchedEpisodes(tmdbId: number): string[] {
  const all = getLocalTvProgress();
  return all[tmdbId]?.watchedEpisodes || [];
}

export function updateSeriesWatchedEpisodes(
  tmdbId: number,
  watchedEpisodes: string[],
  totalEpisodes?: number
): void {
  const all = getLocalTvProgress();
  all[tmdbId] = {
    ...all[tmdbId],
    watchedEpisodes,
    totalEpisodes: totalEpisodes ?? all[tmdbId]?.totalEpisodes,
    lastUpdated: new Date().toISOString(),
  };
  saveLocalTvProgress(all);
}

export function getSeriesSeasonRatings(tmdbId: number): Record<number, number> {
  const all = getLocalTvProgress();
  return all[tmdbId]?.seasonRatings || {};
}

export function updateSeriesSeasonRating(
  tmdbId: number,
  seasonNumber: number,
  rating: number
): void {
  const all = getLocalTvProgress();
  const existingRatings = all[tmdbId]?.seasonRatings || {};
  all[tmdbId] = {
    watchedEpisodes: all[tmdbId]?.watchedEpisodes || [],
    ...all[tmdbId],
    seasonRatings: {
      ...existingRatings,
      [seasonNumber]: rating,
    },
    lastUpdated: new Date().toISOString(),
  };
  saveLocalTvProgress(all);
}
