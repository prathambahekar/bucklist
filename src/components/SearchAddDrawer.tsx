import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  X,
  Loader2,
  Plus,
  Check,
  Film,
  Tv,
  Sparkles,
  TrendingUp,
  Flame,
  CheckCircle2,
  Star,
} from "lucide-react";
import type { SearchResult } from "../types";
import { searchMovies, fetchCategorySuggestions, getPosterUrl } from "../lib/api";
import { OttBadge } from "./OttBadge";

interface SearchAddDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleWatchlist: (item: SearchResult) => Promise<void> | void;
  onToggleWatched: (item: SearchResult) => Promise<void> | void;
  onAddToWatchlist?: (item: SearchResult) => Promise<void> | void;
  onAddToWatched?: (item: SearchResult) => Promise<void> | void;
  existingWatchlistIds: Set<number>;
  existingWatchedIds: Set<number>;
  addingId: number | null;
}

type FilterCategory = "all" | "movie" | "tv" | "anime";

function isAnimeItem(item: SearchResult): boolean {
  const genres = item.genres || [];
  const hasAnimation = genres.some((g) => g.toLowerCase().includes("anim"));
  const onCrunchyroll = (item.platforms || []).some((p) => p.toLowerCase().includes("crunchy"));
  return hasAnimation || onCrunchyroll;
}

export function SearchAddDrawer({
  isOpen,
  onClose,
  onToggleWatchlist,
  onToggleWatched,
  onAddToWatchlist,
  onAddToWatched,
  existingWatchlistIds,
  existingWatchedIds,
  addingId,
}: SearchAddDrawerProps) {
  const handleWatchlistAction = onToggleWatchlist || onAddToWatchlist;
  const handleWatchedAction = onToggleWatched || onAddToWatched;
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<
    Partial<Record<FilterCategory, SearchResult[]>>
  >({});
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("all");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  // Auto focus input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery("");
      setSearchResults([]);
      setFetchError(null);
    }
  }, [isOpen]);

  const loadSuggestions = (cat: FilterCategory) => {
    setSuggestionsLoading(true);
    setFetchError(null);
    fetchCategorySuggestions(cat)
      .then((res) => {
        setCategorySuggestions((prev) => ({ ...prev, [cat]: res }));
      })
      .catch((err) => {
        console.warn("Category suggestions fetch failed:", err);
        setFetchError("Unable to load trending titles. Tap retry to reload.");
      })
      .finally(() => setSuggestionsLoading(false));
  };

  // Fetch suggestions for active category when not searching
  useEffect(() => {
    if (!isOpen) return;
    if (query.trim().length >= 2) return;

    if (!categorySuggestions[activeCategory]) {
      loadSuggestions(activeCategory);
    }
  }, [isOpen, activeCategory, query, categorySuggestions]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Search debounce
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setLoading(false);
      setFetchError(null);
      return;
    }

    setLoading(true);
    setFetchError(null);
    const curId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const res = await searchMovies(trimmed);
        if (curId === requestIdRef.current) {
          setSearchResults(res);
        }
      } catch (err) {
        console.error("Search failed:", err);
        if (curId === requestIdRef.current) {
          setSearchResults([]);
          setFetchError("Search request timed out or was rate limited. Tap retry to try again.");
        }
      } finally {
        if (curId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  // Determine current active list (search results or category suggestions)
  const isSearching = query.trim().length >= 2;
  const currentSuggestions = categorySuggestions[activeCategory] || [];

  // Filter list by category pill when searching
  const filteredList = useMemo(() => {
    if (!isSearching) {
      return currentSuggestions;
    }
    if (activeCategory === "all") return searchResults;
    if (activeCategory === "anime") {
      return searchResults.filter((item) => isAnimeItem(item));
    }
    if (activeCategory === "tv") {
      return searchResults.filter((item) => item.media_type === "tv" && !isAnimeItem(item));
    }
    if (activeCategory === "movie") {
      return searchResults.filter((item) => item.media_type === "movie" && !isAnimeItem(item));
    }
    return searchResults;
  }, [isSearching, currentSuggestions, searchResults, activeCategory]);

  if (!isOpen) return null;

  const currentLoading = isSearching ? loading : suggestionsLoading;

  return (
    <div
      id="search-add-drawer-root"
      className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center items-center sm:p-4 animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        id="search-drawer-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity cursor-pointer"
        aria-hidden="true"
      />

      {/* Drawer Panel - Almost fullscreen (~88vh) with rounded corners and top gap */}
      <div
        id="search-add-drawer-panel"
        className="relative w-full max-w-xl h-[88dvh] max-h-[88dvh] bg-zinc-950 border-t sm:border border-zinc-800/90 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab Handle indicator for mobile */}
        <div className="pt-2.5 pb-1 flex justify-center shrink-0 sm:hidden">
          <div className="w-10 h-1 bg-zinc-700/80 rounded-full" />
        </div>

        {/* Drawer Header without yellow icon */}
        <div className="px-4 pt-3 pb-2 sm:px-5 sm:pt-4 sm:pb-2 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-zinc-100 leading-tight">
              Add to Bucklist
            </h2>
            <p className="text-xs text-zinc-400">
              Search movies, TV series, or anime on TMDB
            </p>
          </div>

          <button
            id="close-search-drawer-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
            title="Close Drawer (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Bar & Category Filter Chips */}
        <div className="px-4 py-2 sm:px-5 space-y-2.5 shrink-0">
          <div className="relative flex items-center bg-zinc-900 border border-zinc-800 focus-within:border-amber-500/80 rounded-xl px-3.5 py-2.5 shadow-inner transition-colors">
            <Search className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0" />
            <input
              ref={inputRef}
              id="search-drawer-input"
              type="text"
              className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
              placeholder="Search title, e.g. Oppenheimer, Breaking Bad, Jujutsu Kaisen..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {loading && (
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin mr-1.5 shrink-0" />
            )}
            {query.length > 0 && !loading && (
              <button
                type="button"
                id="search-drawer-clear-btn"
                onClick={() => {
                  setQuery("");
                  setSearchResults([]);
                  setFetchError(null);
                  inputRef.current?.focus();
                }}
                className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Media Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === "all"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("movie")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === "movie"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
              }`}
            >
              <Film className="w-3 h-3 text-emerald-400" />
              <span>Movies</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("tv")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === "tv"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
              }`}
            >
              <Tv className="w-3 h-3 text-blue-400" />
              <span>Series</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("anime")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === "anime"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Anime</span>
            </button>
          </div>
        </div>

        {/* Section Label */}
        <div className="px-4 py-1.5 sm:px-5 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
            {isSearching ? (
              <>
                <Search className="w-3 h-3 text-amber-400" />
                <span>Search results ({filteredList.length})</span>
              </>
            ) : (
              <>
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>
                  {activeCategory === "anime"
                    ? "Popular Anime series & movies"
                    : activeCategory === "movie"
                    ? "Trending Movies this week"
                    : activeCategory === "tv"
                    ? "Trending TV Series this week"
                    : "Trending & Popular this week"}
                </span>
              </>
            )}
          </span>
          <span className="text-[11px] text-zinc-500">
            TMDB Powered
          </span>
        </div>

        {/* Content List Area */}
        <div
          id="search-drawer-results-list"
          className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3"
        >
          {fetchError ? (
            <div className="py-16 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-amber-400">
                <Film className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-200 mb-1">
                Unable to load results
              </h4>
              <p className="text-xs text-zinc-400 max-w-xs mb-3">
                {fetchError}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (isSearching) {
                    const q = query;
                    setQuery("");
                    setTimeout(() => setQuery(q), 50);
                  } else {
                    loadSuggestions(activeCategory);
                  }
                }}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 rounded-xl transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : currentLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-7 h-7 text-amber-400 animate-spin mb-3" />
              <p className="text-sm font-medium text-zinc-300">Finding titles...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-zinc-500">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-1">
                {isSearching ? `No results for "${query}"` : "No titles found"}
              </h4>
              <p className="text-xs text-zinc-500 max-w-xs mb-3">
                Try searching with another spelling or switch the category filter.
              </p>
              {isSearching && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActiveCategory("all");
                    inputRef.current?.focus();
                  }}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 rounded-xl transition-colors cursor-pointer"
                >
                  Clear search & Reset
                </button>
              )}
            </div>
          ) : (
            filteredList.map((item) => {
              const poster = getPosterUrl(item.poster_path);
              const isWatchlist = existingWatchlistIds.has(item.tmdb_id);
              const isWatched = existingWatchedIds.has(item.tmdb_id);
              const isTv = item.media_type === "tv";
              const isAnime = isAnimeItem(item);
              const isProcessing = addingId === item.tmdb_id;

              return (
                <div
                  key={`${item.media_type}-${item.tmdb_id}`}
                  id={`drawer-result-${item.tmdb_id}`}
                  className="p-2.5 sm:p-3 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors flex gap-3.5 group"
                >
                  {/* Poster */}
                  <div className="relative w-16 sm:w-20 aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 shadow-xs">
                    <img
                      src={
                        poster ||
                        "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=60"
                      }
                      alt={item.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Details & Actions */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      {/* Title & Media Badge */}
                      <div className="flex items-start justify-between gap-1.5">
                        <h3 className="text-sm font-bold text-zinc-100 leading-snug line-clamp-1 group-hover:text-amber-400 transition-colors">
                          {item.title}
                        </h3>
                      </div>

                      {/* Badges & Metadata */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[11px] text-zinc-400">
                        <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-semibold text-[10px]">
                          {isAnime ? (
                            <>
                              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                              <span>Anime</span>
                            </>
                          ) : isTv ? (
                            <>
                              <Tv className="w-2.5 h-2.5 text-blue-400" />
                              <span>Series</span>
                            </>
                          ) : (
                            <>
                              <Film className="w-2.5 h-2.5 text-emerald-400" />
                              <span>Movie</span>
                            </>
                          )}
                        </span>

                        {item.release_year && (
                          <span className="text-zinc-500 font-medium">{item.release_year}</span>
                        )}

                        {item.genres && item.genres.length > 0 && (
                          <span className="text-zinc-500 truncate text-[10px] max-w-[130px]">
                            {item.genres.slice(0, 2).join(" • ")}
                          </span>
                        )}
                      </div>

                      {/* OTT Platforms */}
                      {item.platforms && item.platforms.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {item.platforms.slice(0, 3).map((p) => (
                            <OttBadge key={p} platform={p} />
                          ))}
                        </div>
                      )}

                      {/* Overview Preview */}
                      {item.overview && (
                        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1.5 leading-relaxed">
                          {item.overview}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-2.5 pt-1.5 flex-wrap">
                      {/* Watchlist Toggle Button (Re-clicking removes/undoes from watchlist) */}
                      <button
                        type="button"
                        id={`btn-add-watchlist-${item.tmdb_id}`}
                        disabled={isProcessing}
                        onClick={() => handleWatchlistAction?.(item)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                          isWatchlist
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                            : isWatched
                            ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                            : "bg-zinc-100 hover:bg-amber-400 text-zinc-950 shadow-xs"
                        }`}
                        title={
                          isWatchlist
                            ? "In Watchlist — Click to remove (Undo)"
                            : isWatched
                            ? "Marked watched — Click to move back to To Watch"
                            : "Add to Watchlist"
                        }
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isWatchlist ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>In Watchlist</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>To Watch</span>
                          </>
                        )}
                      </button>

                      {/* Watched Toggle Button (Re-clicking unmarks/undoes watched status) */}
                      <button
                        type="button"
                        id={`btn-add-watched-${item.tmdb_id}`}
                        disabled={isProcessing}
                        onClick={() => handleWatchedAction?.(item)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                          isWatched
                            ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40"
                            : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800"
                        }`}
                        title={
                          isWatched
                            ? "Watched — Click to unmark (Undo)"
                            : "Rate & Mark Watched"
                        }
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isWatched ? "Watched" : "Mark Watched"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
