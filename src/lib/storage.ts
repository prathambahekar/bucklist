import {
  type WatchlistMovie,
  type BucklistBackupData,
  type ImportValidationResult,
  type MovieCollection,
  type AppMode,
  normalizePriority,
} from "../types";
export type { AppMode };
import { normalizePlatformsList } from "./api";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

const LOCAL_STORAGE_KEY = "bucklist_local_watchlist_v1";
const LOCAL_GAMES_STORAGE_KEY = "bucklist_local_games_v1";
const APP_MODE_STORAGE_KEY = "bucklist_app_mode_v1";
const TV_PROGRESS_KEY = "bucklist_tv_progress_v1";

// App Mode State ("cinema" | "games")
export function getLocalAppMode(): AppMode {
  try {
    const raw = localStorage.getItem(APP_MODE_STORAGE_KEY);
    if (raw === "games" || raw === "cinema") return raw;
  } catch {
    // ignore
  }
  return "cinema";
}

export function saveLocalAppMode(mode: AppMode): void {
  try {
    localStorage.setItem(APP_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

// Initial sample games for new users
export function getLocalGameWatchlist(): WatchlistMovie[] {
  try {
    const raw = localStorage.getItem(LOCAL_GAMES_STORAGE_KEY);
    if (!raw) return [];
    const list: WatchlistMovie[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    // Filter out seed items if any exist from previous runs
    const userItems = list.filter((m) => !m.id.startsWith("game-seed-"));
    return userItems.map((m) => ({
      ...m,
      priority: normalizePriority(m.priority),
      platforms: m.platforms || [],
    }));
  } catch {
    return [];
  }
}

export function saveLocalGameWatchlist(items: WatchlistMovie[]): void {
  try {
    localStorage.setItem(LOCAL_GAMES_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

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
      priority: normalizePriority(m.priority),
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

export type ViewMode = "detailed" | "compact" | "grid" | "cards" | "timeline" | "collections";
export type WatchedViewMode = ViewMode;
export type ToWatchViewMode = "detailed" | "compact" | "grid" | "cards";
export type TimelinePeriod = "month" | "week" | "year";

const TOWATCH_VIEW_MODE_KEY = "bucklist_towatch_view_mode_v2";
const WATCHED_VIEW_MODE_KEY = "bucklist_watched_view_mode_v2";
const TIMELINE_PERIOD_KEY = "bucklist_timeline_period_v1";
const BLEND_ENABLED_KEY = "bucklist_blend_enabled_v1";
const COLLECTIONS_ENABLED_KEY = "bucklist_collections_enabled_v1";

export function getLocalBlendEnabled(): boolean {
  try {
    const raw = localStorage.getItem(BLEND_ENABLED_KEY);
    if (raw === "true") return true;
    return false;
  } catch {
    return false;
  }
}

export function saveLocalBlendEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(BLEND_ENABLED_KEY, enabled ? "true" : "false");
  } catch {
    // ignore
  }
}

export function getLocalCollectionsEnabled(): boolean {
  try {
    const raw = localStorage.getItem(COLLECTIONS_ENABLED_KEY);
    if (raw === "false") return false;
    return true; // Enabled by default
  } catch {
    return true;
  }
}

export function saveLocalCollectionsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(COLLECTIONS_ENABLED_KEY, enabled ? "true" : "false");
  } catch {
    // ignore
  }
}

export function getLocalToWatchViewMode(): ToWatchViewMode {
  try {
    const raw = localStorage.getItem(TOWATCH_VIEW_MODE_KEY);
    if (raw === "detailed" || raw === "compact" || raw === "grid" || raw === "cards") {
      return raw;
    }
  } catch {
    // ignore
  }
  return "cards";
}

export function saveLocalToWatchViewMode(mode: ToWatchViewMode): void {
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
    if (raw === "detailed" || raw === "compact" || raw === "grid" || raw === "cards" || raw === "timeline" || raw === "collections") {
      return raw;
    }
  } catch {
    // ignore
  }
  return "timeline";
}

export function saveLocalWatchedViewMode(mode: WatchedViewMode): void {
  try {
    localStorage.setItem(WATCHED_VIEW_MODE_KEY, mode);
  } catch {
    // ignore
  }
}

export function getLocalTimelinePeriod(): TimelinePeriod {
  try {
    const raw = localStorage.getItem(TIMELINE_PERIOD_KEY);
    if (raw === "month" || raw === "week" || raw === "year") {
      return raw;
    }
  } catch {
    // ignore
  }
  return "week";
}

export function saveLocalTimelinePeriod(period: TimelinePeriod): void {
  try {
    localStorage.setItem(TIMELINE_PERIOD_KEY, period);
  } catch {
    // ignore
  }
}

// -------------------------------------------------------------
// Backup, Export, and Import Engine
// -------------------------------------------------------------

export function createBackupPayload(): BucklistBackupData {
  const watchlist = getLocalWatchlist();
  const gameWatchlist = getLocalGameWatchlist();
  const tvProgress = getLocalTvProgress();
  const toWatchViewMode = getLocalToWatchViewMode();
  const watchedViewMode = getLocalWatchedViewMode();
  const watchedCategory = getLocalWatchedCategory();
  const appMode = getLocalAppMode();

  let collections: MovieCollection[] = [];
  try {
    const raw = localStorage.getItem("bucklist_collections_v1");
    if (raw) collections = JSON.parse(raw);
  } catch {
    // ignore
  }

  const toWatchCount = watchlist.filter((m) => !m.watched).length;
  const watchedCount = watchlist.filter((m) => m.watched).length;
  const tvTrackedCount = Object.keys(tvProgress).length;

  return {
    version: "1.0",
    appName: "Bucklist",
    exportedAt: new Date().toISOString(),
    watchlist,
    gameWatchlist,
    collections,
    tvProgress,
    preferences: {
      toWatchViewMode,
      watchedViewMode,
      watchedCategory,
      appMode,
    },
    stats: {
      totalItems: watchlist.length + gameWatchlist.length,
      toWatchCount,
      watchedCount,
      tvTrackedCount,
      collectionsCount: collections.length,
    },
  };
}

export async function downloadBackupToStorage(customName?: string): Promise<{ success: boolean; filename: string; error?: string }> {
  const data = createBackupPayload();
  const jsonStr = JSON.stringify(data, null, 2);
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = customName || `bucklist-backup-${dateStr}.json`;

  // 1. Native Capacitor App (Android/iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await Filesystem.writeFile({
        path: filename,
        data: jsonStr,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      return { success: true, filename: result.uri };
    } catch (err) {
      console.error("Capacitor Filesystem write error:", err);
      // Fall through to share menu if direct save fails due to Android permissions
      try {
        const cacheResult = await Filesystem.writeFile({
          path: filename,
          data: jsonStr,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({ url: cacheResult.uri });
        return { success: true, filename: cacheResult.uri };
      } catch (shareErr) {
        return { success: false, filename, error: "Failed to save file natively." };
      }
    }
  }

  // 2. Desktop Chrome/Edge: Native File Picker (Allows choosing the exact folder)
  if (typeof window !== "undefined" && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'JSON Backup',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(jsonStr);
      await writable.close();
      return { success: true, filename: handle.name };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: true, filename };
      }
      // Proceed to fallback if it fails for other reasons
    }
  }

  // 3. Mobile Web & Fallback: Standard browser download (Forced to Downloads folder by mobile OS)
  try {
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }, 5000);

    return { success: true, filename };
  } catch (err) {
    console.error("Backup download error:", err);
    try {
      // Base64 URI is sometimes more reliable on strict Android WebViews than Blob URLs
      const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
      const dataUri = `data:application/json;base64,${base64}`;
      const link = document.createElement("a");
      link.href = dataUri;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
      }, 5000);
      return { success: true, filename };
    } catch {
      return { success: false, filename, error: "Browser blocked the download." };
    }
  }
}

export async function shareBackupToApps(customName?: string): Promise<{ success: boolean; error?: string; filename: string }> {
  const data = createBackupPayload();
  const jsonStr = JSON.stringify(data, null, 2);
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = customName || `bucklist-backup-${dateStr}.json`;

  // 1. Native Capacitor App (Android/iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await Filesystem.writeFile({
        path: filename,
        data: jsonStr,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await Share.share({
        title: "Bucklist Backup",
        url: result.uri,
        dialogTitle: "Share Backup",
      });
      return { success: true, filename: result.uri };
    } catch (err) {
      console.error("Capacitor share error:", err);
      return { success: false, filename, error: "Native share failed." };
    }
  }

  // 2. Web Share API Fallback
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return { 
      success: false, 
      filename, 
      error: "Sharing requires a secure HTTPS connection." 
    };
  }

  // 3. Try sharing as a File
  // CRITICAL ANDROID BUG FIX: Use text/plain MIME type and do NOT include `text` or `title`.
  // Also, we do NOT check canShare here because some Android browsers falsely return false
  // for perfectly valid intents. We just try it.
  try {
    const blob = new Blob([jsonStr], { type: "text/plain" });
    const file = new File([blob], filename, { type: "text/plain" });
    
    await navigator.share({
      files: [file]
    });
    return { success: true, filename };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return { success: true, filename };
    }
    console.warn("navigator.share with file failed, falling back to text share", err);
  }

  // 4. Fallback: Share the raw JSON as text
  try {
    await navigator.share({
      title: "Bucklist Backup",
      text: jsonStr,
    });
    return { success: true, filename };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return { success: true, filename };
    }
    return { success: false, filename, error: "Failed to open share menu." };
  }
}

export async function exportBackupFile(customName?: string): Promise<{ success: boolean; method: "shared" | "downloaded" | "failed"; filename: string }> {
  const res = await downloadBackupToStorage(customName);
  return { success: res.success, method: res.success ? "downloaded" : "failed", filename: res.filename };
}

export function downloadBackupFile(customName?: string): boolean {
  downloadBackupToStorage(customName).catch(() => {});
  return true;
}

export function sanitizeMovieItem(item: any): WatchlistMovie | null {
  if (!item || typeof item !== "object") return null;

  // TMDB id must exist and be numeric
  const tmdbIdNum = Number(item.tmdb_id || item.id);
  if (!tmdbIdNum || isNaN(tmdbIdNum)) return null;

  const title = typeof item.title === "string" && item.title.trim() ? item.title.trim() : `Untitled (${tmdbIdNum})`;

  const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : `movie-${tmdbIdNum}-${Date.now()}`;
  const posterPath = typeof item.poster_path === "string" ? item.poster_path : null;
  const releaseYear = item.release_year ? String(item.release_year) : null;
  const mediaType = item.media_type === "tv" || item.media_type === "movie" || item.media_type === "game" ? item.media_type : undefined;
  const metacritic = typeof item.metacritic === "number" ? item.metacritic : undefined;
  const playtime = typeof item.playtime === "number" ? item.playtime : undefined;

  const genres = Array.isArray(item.genres)
    ? item.genres.filter((g: any) => typeof g === "string")
    : [];

  const rawPlatforms = Array.isArray(item.platforms)
    ? item.platforms.filter((p: any) => typeof p === "string")
    : [];
  const platforms = normalizePlatformsList(rawPlatforms);

  const watched = Boolean(item.watched);
  const watchedDate = item.watched_date ? String(item.watched_date) : null;
  const watchedSource = typeof item.watched_source === "string" ? item.watched_source : undefined;
  const watchedPlatform = typeof item.watched_platform === "string" ? item.watched_platform : null;
  const rating = typeof item.rating === "number" ? Math.max(0, Math.min(10, item.rating)) : null;
  const priority = normalizePriority(item.priority);
  const createdAt = typeof item.created_at === "string" ? item.created_at : new Date().toISOString();

  return {
    id,
    tmdb_id: tmdbIdNum,
    title,
    poster_path: posterPath,
    release_year: releaseYear,
    media_type: mediaType,
    metacritic,
    playtime,
    genres,
    platforms,
    priority,
    watched,
    watched_date: watchedDate,
    watched_source: watchedSource,
    watched_platform: watchedPlatform,
    rating,
    created_at: createdAt,
  };
}

export function robustParseJson(rawInput: string): any {
  if (!rawInput || typeof rawInput !== "string") {
    throw new Error("The provided JSON text is empty.");
  }

  let text = rawInput.trim();

  // 1. Direct standard parse
  try {
    return JSON.parse(text);
  } catch {
    // Continue to sanitize
  }

  // 2. Strip UTF Byte Order Mark (BOM), zero-width characters, and normalize spaces
  text = text
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u00A0\u2002-\u200A\u202F\u205F\u3000]/g, " ");

  // 3. Remove Markdown code block wrappers (e.g. ```json ... ``` or ``` ... ```)
  text = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(text.trim());
  } catch {
    // Continue
  }

  // 4. Replace smart / curly quotes with standard ASCII quotes
  let sanitized = text
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B]/g, '"');

  // Replace full-width colons, commas, brackets that messaging apps/keyboards insert
  sanitized = sanitized
    .replace(/：/g, ":")
    .replace(/，/g, ",")
    .replace(/｛/g, "{")
    .replace(/｝/g, "}")
    .replace(/［/g, "[")
    .replace(/］/g, "]");

  try {
    return JSON.parse(sanitized.trim());
  } catch {
    // Continue
  }

  // 5. Extract JSON object/array block if Telegram or clipboard added header/footer text
  // e.g. "User Name, [16.08.2026 13:24]\n{ ... }" or "[12:34] { ... }"
  const firstBrace = sanitized.indexOf("{");
  const firstBracket = sanitized.indexOf("[");
  let startIndex = -1;
  let isObject = false;

  if (firstBrace !== -1 && firstBracket !== -1) {
    if (firstBrace < firstBracket) {
      startIndex = firstBrace;
      isObject = true;
    } else {
      startIndex = firstBracket;
      isObject = false;
    }
  } else if (firstBrace !== -1) {
    startIndex = firstBrace;
    isObject = true;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    isObject = false;
  }

  if (startIndex !== -1) {
    const endIndex = isObject ? sanitized.lastIndexOf("}") : sanitized.lastIndexOf("]");
    if (endIndex > startIndex) {
      const extracted = sanitized.substring(startIndex, endIndex + 1);
      try {
        return JSON.parse(extracted);
      } catch {
        // Strip trailing commas before closing braces/brackets
        const noTrailingCommas = extracted.replace(/,\s*([}\]])/g, "$1");
        try {
          return JSON.parse(noTrailingCommas);
        } catch {
          // Continue
        }
      }
    }
  }

  // 6. Last attempt: strip trailing commas on full sanitized string
  const finalClean = sanitized.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(finalClean.trim());
}

export function validateAndParseBackupJson(jsonString: string): ImportValidationResult {
  try {
    if (!jsonString || !jsonString.trim()) {
      return { valid: false, error: "The provided JSON string is empty." };
    }

    const parsed = robustParseJson(jsonString);

    let rawWatchlist: any[] = [];
    let rawTvProgress: any = {};
    let preferences: BucklistBackupData["preferences"] = undefined;

    if (Array.isArray(parsed)) {
      // Direct array of movies
      rawWatchlist = parsed;
    } else if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.watchlist)) {
        rawWatchlist = parsed.watchlist;
      } else if (Array.isArray(parsed.movies)) {
        rawWatchlist = parsed.movies;
      } else if (Array.isArray(parsed.items)) {
        rawWatchlist = parsed.items;
      } else {
        return {
          valid: false,
          error: "Invalid JSON format: no 'watchlist' array or movie list found.",
        };
      }

      if (parsed.tvProgress && typeof parsed.tvProgress === "object") {
        rawTvProgress = parsed.tvProgress;
      }

      if (parsed.preferences && typeof parsed.preferences === "object") {
        preferences = parsed.preferences;
      }
    } else {
      return {
        valid: false,
        error: "Invalid JSON format: root element must be an object or array.",
      };
    }

    const validWatchlist: WatchlistMovie[] = [];
    for (const item of rawWatchlist) {
      const sanitized = sanitizeMovieItem(item);
      if (sanitized) {
        validWatchlist.push(sanitized);
      }
    }

    if (validWatchlist.length === 0 && Object.keys(rawTvProgress).length === 0) {
      return {
        valid: false,
        error: "No valid movie or TV watchlist entries found in the file.",
      };
    }

    // Clean TV progress
    const cleanTvProgress: TvProgressMap = {};
    if (rawTvProgress && typeof rawTvProgress === "object") {
      for (const [key, val] of Object.entries(rawTvProgress)) {
        const tmdbId = Number(key);
        if (!isNaN(tmdbId) && val && typeof val === "object") {
          const itemVal = val as any;
          const watchedEpisodes = Array.isArray(itemVal.watchedEpisodes)
            ? itemVal.watchedEpisodes.filter((e: any) => typeof e === "string")
            : [];
          const seasonRatings: Record<number, number> = {};
          if (itemVal.seasonRatings && typeof itemVal.seasonRatings === "object") {
            for (const [sKey, sRating] of Object.entries(itemVal.seasonRatings)) {
              const sNum = Number(sKey);
              if (!isNaN(sNum) && typeof sRating === "number") {
                seasonRatings[sNum] = sRating;
              }
            }
          }

          cleanTvProgress[tmdbId] = {
            watchedEpisodes,
            totalEpisodes: typeof itemVal.totalEpisodes === "number" ? itemVal.totalEpisodes : undefined,
            seasonRatings: Object.keys(seasonRatings).length > 0 ? seasonRatings : undefined,
            lastUpdated: typeof itemVal.lastUpdated === "string" ? itemVal.lastUpdated : new Date().toISOString(),
          };
        }
      }
    }

    const toWatchCount = validWatchlist.filter((m) => !m.watched).length;
    const watchedCount = validWatchlist.filter((m) => m.watched).length;
    const tvSeriesCount = validWatchlist.filter((m) => m.media_type === "tv").length;
    const tvProgressItemsCount = Object.keys(cleanTvProgress).length;

    const data: BucklistBackupData = {
      version: "1.0",
      appName: "Bucklist",
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      watchlist: validWatchlist,
      tvProgress: cleanTvProgress,
      preferences,
      stats: {
        totalItems: validWatchlist.length,
        toWatchCount,
        watchedCount,
        tvTrackedCount: tvProgressItemsCount,
      },
    };

    return {
      valid: true,
      data,
      summary: {
        totalItems: validWatchlist.length,
        toWatchCount,
        watchedCount,
        tvSeriesCount,
        tvProgressItemsCount,
      },
    };
  } catch (err) {
    return {
      valid: false,
      error: `JSON parsing failed: ${(err as Error).message || "Invalid JSON syntax"}`,
    };
  }
}

export function resetAllLocalData(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(TV_PROGRESS_KEY);
    // Keep preference keys or reset if desired, but clear watchlist and progress
    saveLocalWatchlist([]);
    saveLocalTvProgress({});
  } catch {
    // ignore
  }
}

export function applyImportedBackup(
  backup: BucklistBackupData,
  mode: "merge" | "replace"
): {
  totalItems: number;
  newItemsAdded: number;
  itemsUpdated: number;
  tvProgressMerged: number;
} {
  const currentWatchlist = getLocalWatchlist();
  const currentTvProgress = getLocalTvProgress();

  if (mode === "replace") {
    // Direct replacement
    saveLocalWatchlist(backup.watchlist);
    if (backup.tvProgress) {
      saveLocalTvProgress(backup.tvProgress);
    }
    if (backup.preferences) {
      if (backup.preferences.toWatchViewMode) {
        saveLocalToWatchViewMode(backup.preferences.toWatchViewMode);
      }
      if (backup.preferences.watchedViewMode) {
        saveLocalWatchedViewMode(backup.preferences.watchedViewMode);
      }
      if (backup.preferences.watchedCategory) {
        saveLocalWatchedCategory(backup.preferences.watchedCategory);
      }
    }

    return {
      totalItems: backup.watchlist.length,
      newItemsAdded: backup.watchlist.length,
      itemsUpdated: 0,
      tvProgressMerged: Object.keys(backup.tvProgress || {}).length,
    };
  }

  // Merge Mode
  const movieMapByTmdb = new Map<number, WatchlistMovie>();
  // Index existing items
  for (const item of currentWatchlist) {
    movieMapByTmdb.set(item.tmdb_id, item);
  }

  let newItemsAdded = 0;
  let itemsUpdated = 0;

  for (const importedItem of backup.watchlist) {
    const existing = movieMapByTmdb.get(importedItem.tmdb_id);
    if (!existing) {
      // New item
      movieMapByTmdb.set(importedItem.tmdb_id, importedItem);
      newItemsAdded++;
    } else {
      // Item exists - merge smart:
      // If imported is watched and existing is unwatched, update to watched with rating
      let hasChanges = false;
      const merged: WatchlistMovie = { ...existing };

      if (!existing.watched && importedItem.watched) {
        merged.watched = true;
        merged.watched_date = importedItem.watched_date || existing.watched_date || new Date().toISOString().split("T")[0];
        merged.rating = importedItem.rating ?? existing.rating;
        hasChanges = true;
      } else if (existing.watched && importedItem.watched && importedItem.rating && !existing.rating) {
        merged.rating = importedItem.rating;
        hasChanges = true;
      }

      // Merge platforms and genres if imported has more
      if (importedItem.platforms && importedItem.platforms.length > 0) {
        const mergedPlatforms = Array.from(new Set([...(existing.platforms || []), ...importedItem.platforms]));
        if (mergedPlatforms.length !== (existing.platforms || []).length) {
          merged.platforms = mergedPlatforms;
          hasChanges = true;
        }
      }

      if (importedItem.genres && importedItem.genres.length > 0) {
        const mergedGenres = Array.from(new Set([...(existing.genres || []), ...importedItem.genres]));
        if (mergedGenres.length !== (existing.genres || []).length) {
          merged.genres = mergedGenres;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        itemsUpdated++;
        movieMapByTmdb.set(importedItem.tmdb_id, merged);
      }
    }
  }

  const finalWatchlist = Array.from(movieMapByTmdb.values());
  saveLocalWatchlist(finalWatchlist);

  // Merge TV progress
  let tvProgressMergedCount = 0;
  const mergedTvProgress: TvProgressMap = { ...currentTvProgress };

  if (backup.tvProgress) {
    for (const [tmdbKey, importedProgress] of Object.entries(backup.tvProgress)) {
      const tmdbId = Number(tmdbKey);
      const existingProg = mergedTvProgress[tmdbId];

      if (!existingProg) {
        mergedTvProgress[tmdbId] = importedProgress;
        tvProgressMergedCount++;
      } else {
        // Merge episodes set
        const epSet = new Set<string>([
          ...(existingProg.watchedEpisodes || []),
          ...(importedProgress.watchedEpisodes || []),
        ]);
        const mergedEpisodes = Array.from(epSet);

        // Merge season ratings
        const mergedRatings = {
          ...(existingProg.seasonRatings || {}),
          ...(importedProgress.seasonRatings || {}),
        };

        mergedTvProgress[tmdbId] = {
          watchedEpisodes: mergedEpisodes,
          totalEpisodes: Math.max(existingProg.totalEpisodes || 0, importedProgress.totalEpisodes || 0) || undefined,
          seasonRatings: Object.keys(mergedRatings).length > 0 ? mergedRatings : undefined,
          lastUpdated: new Date().toISOString(),
        };
        tvProgressMergedCount++;
      }
    }
    saveLocalTvProgress(mergedTvProgress);
  }

  return {
    totalItems: finalWatchlist.length,
    newItemsAdded,
    itemsUpdated,
    tvProgressMerged: tvProgressMergedCount,
  };
}
