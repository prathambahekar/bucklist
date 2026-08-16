import type { WatchlistMovie } from "../types";
import { normalizePlatformsList } from "./api";

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
    const list: WatchlistMovie[] = JSON.parse(raw);
    return list.map((m) => ({
      ...m,
      platforms: normalizePlatformsList(m.platforms || []),
    }));
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
    ...all[tmdbId],
    watchedEpisodes: all[tmdbId]?.watchedEpisodes || [],
    seasonRatings: {
      ...existingRatings,
      [seasonNumber]: rating,
    },
    lastUpdated: new Date().toISOString(),
  };
  saveLocalTvProgress(all);
}

export type ViewMode = "detailed" | "compact" | "grid";
export type WatchedViewMode = ViewMode;
export type ToWatchViewMode = ViewMode;

const TOWATCH_VIEW_MODE_KEY = "bucklist_towatch_view_mode_v1";
const WATCHED_VIEW_MODE_KEY = "bucklist_watched_view_mode_v1";

export function getLocalToWatchViewMode(): ViewMode {
  try {
    const raw = localStorage.getItem(TOWATCH_VIEW_MODE_KEY);
    if (raw === "detailed" || raw === "compact" || raw === "grid") {
      return raw;
    }
  } catch {
    // ignore
  }
  return "detailed";
}

export function saveLocalToWatchViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(TOWATCH_VIEW_MODE_KEY, mode);
  } catch {
    // ignore
  }
}

export type WatchedCategory = "all" | "movies" | "series" | "anime";
const WATCHED_CATEGORY_KEY = "bucklist_watched_category_v1";

export function getLocalWatchedCategory(): WatchedCategory {
  try {
    const raw = localStorage.getItem(WATCHED_CATEGORY_KEY);
    if (raw === "all" || raw === "movies" || raw === "series" || raw === "anime") {
      return raw;
    }
  } catch {
    // ignore
  }
  return "all";
}

export function saveLocalWatchedCategory(cat: WatchedCategory): void {
  try {
    localStorage.setItem(WATCHED_CATEGORY_KEY, cat);
  } catch {
    // ignore
  }
}

export function getLocalWatchedViewMode(): WatchedViewMode {
  try {
    const raw = localStorage.getItem(WATCHED_VIEW_MODE_KEY);
    if (raw === "detailed" || raw === "compact" || raw === "grid") {
      return raw;
    }
  } catch {
    // ignore
  }
  return "compact";
}

export function saveLocalWatchedViewMode(mode: WatchedViewMode): void {
  try {
    localStorage.setItem(WATCHED_VIEW_MODE_KEY, mode);
  } catch {
    // ignore
  }
}
