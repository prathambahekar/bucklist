import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  X,
  Loader2,
  Film,
  Tv,
  Gamepad2,
  Star,
  CheckCircle2,
  Bookmark,
  Check,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { SearchResult, WatchlistMovie, AppMode } from "../types";
import { searchMovies, getPosterUrl } from "../lib/api";
import { searchGames } from "../lib/rawgApi";
import { OttBadge } from "./OttBadge";

interface UniversalSearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  movies: WatchlistMovie[];
  watched: WatchlistMovie[];
  onSelectMovie: (item: WatchlistMovie | SearchResult) => void;
  onToggleWatchlist?: (item: SearchResult) => Promise<void> | void;
  onToggleWatched?: (item: SearchResult) => Promise<void> | void;
  existingWatchlistIds: Set<number>;
  existingWatchedIds: Set<number>;
  appMode?: AppMode;
}

type SearchFilterScope = "all" | "library" | "movies" | "tv";

export function UniversalSearchDrawer({
  isOpen,
  onClose,
  movies,
  watched,
  onSelectMovie,
  existingWatchlistIds,
  existingWatchedIds,
  appMode = "cinema",
}: UniversalSearchDrawerProps) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchFilterScope>("all");
  const [externalResults, setExternalResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  const isGaming = appMode === "gaming";

  // Auto focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery("");
      setExternalResults([]);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Client-side library search (instant matching in watchlist & watched)
  const libraryMatches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    const allLibrary = [
      ...movies.map((m) => ({ item: m, status: "watchlist" as const })),
      ...watched.map((m) => ({ item: m, status: "watched" as const })),
    ];

    return allLibrary.filter(({ item }) => {
      const titleMatch = (item.title || "").toLowerCase().includes(trimmed);
      const genreMatch = (item.genres || []).some((g) =>
        g.toLowerCase().includes(trimmed)
      );
      const yearMatch = (item.release_year || "").includes(trimmed);

      if (!isGaming) {
        if (scope === "movies" && item.media_type === "tv") return false;
        if (scope === "tv" && item.media_type !== "tv") return false;
      }

      return titleMatch || genreMatch || yearMatch;
    });
  }, [query, movies, watched, scope, isGaming]);

  // External live search with debouncing (TMDB for cinema, RAWG for gaming)
  useEffect(() => {
    const trimmed = query.trim();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!trimmed || scope === "library") {
      setExternalResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = window.setTimeout(() => {
      if (isGaming) {
        searchGames(trimmed)
          .then((res) => {
            setExternalResults(res);
          })
          .catch((err) => {
            console.warn("Universal game search query failed:", err);
            setExternalResults([]);
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        searchMovies(trimmed)
          .then((res) => {
            let filtered = res;
            if (scope === "movies") {
              filtered = res.filter((item) => item.media_type !== "tv");
            } else if (scope === "tv") {
              filtered = res.filter((item) => item.media_type === "tv");
            }
            setExternalResults(filtered);
          })
          .catch((err) => {
            console.warn("Universal cinema search query failed:", err);
            setExternalResults([]);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, scope, isGaming]);

  if (!isOpen) return null;

  const handleItemClick = (item: WatchlistMovie | SearchResult) => {
    onSelectMovie(item);
    onClose();
  };

  const hasQuery = query.trim().length > 0;
  const libraryIds = new Set(libraryMatches.map((m) => m.item.tmdb_id));

  // Filter out external results that are already shown in library matches to avoid duplicates
  const filteredExternalResults = externalResults.filter(
    (item) => !libraryIds.has(item.tmdb_id)
  );

  const placeholderText = isGaming
    ? "Search gaming backlog, 500k+ games, genres..."
    : "Search library, movies, series, or genres...";

  const accentColor = isGaming ? "emerald" : "amber";

  return (
    <div
      id="universal-search-backdrop"
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 sm:py-8 transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        id="universal-search-drawer"
        className="w-full max-w-2xl bg-[#09090b] border-t sm:border border-zinc-800/80 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] h-[85vh] sm:h-auto animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 pb-[env(safe-area-inset-bottom,16px)] sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab Handle (mobile only) */}
        <div className="pt-3 pb-1 flex justify-center shrink-0 sm:hidden">
          <div className="w-10 h-1 bg-zinc-700/60 rounded-full" />
        </div>

        {/* Clean, Seamless Search Header */}
        <div className="px-4 pt-3 sm:pt-4 pb-2 shrink-0 space-y-3">
          <div className={`flex items-center gap-2.5 bg-zinc-900/90 border border-zinc-800/80 focus-within:border-${accentColor}-400/50 rounded-2xl px-3.5 py-2.5 focus-within:ring-1 focus-within:ring-${accentColor}-400/20 transition-all`}>
            {isGaming ? (
              <Gamepad2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Search className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <input
              ref={inputRef}
              id="universal-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholderText}
              className="w-full bg-transparent text-sm sm:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none font-medium"
              autoComplete="off"
              spellCheck="false"
            />
            {isLoading && (
              <Loader2 className={`w-4 h-4 text-${accentColor}-400 animate-spin shrink-0`} />
            )}
            {query && !isLoading && (
              <button
                type="button"
                id="universal-search-clear-btn"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              id="universal-search-close-btn"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close search"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Minimal Scope Filter Chips */}
          {!isGaming && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "library", label: "In My Library" },
                  { id: "movies", label: "Movies" },
                  { id: "tv", label: "TV Series" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  id={`search-scope-${tab.id}`}
                  onClick={() => setScope(tab.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    scope === tab.id
                      ? "bg-amber-500 text-zinc-950 shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200 bg-zinc-900/90 hover:bg-zinc-850"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
          {isGaming && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: "all", label: "All Games (RAWG)" },
                  { id: "library", label: "In My Backlog" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  id={`search-scope-${tab.id}`}
                  onClick={() => setScope(tab.id as SearchFilterScope)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    scope === tab.id
                      ? "bg-emerald-500 text-zinc-950 shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200 bg-zinc-900/90 hover:bg-zinc-850"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 no-scrollbar">
          {/* STATE 1: Empty Query - Quick Access Sections */}
          {!hasQuery && (
            <div className="space-y-4 pb-4">
              {/* Recently added to watchlist */}
              {movies.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Bookmark className={`w-3.5 h-3.5 ${isGaming ? "text-emerald-400" : "text-amber-400"}`} />
                      {isGaming ? "In Your Backlog (To Play)" : "In Your Watchlist (To Watch)"}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium">
                      {movies.length} {isGaming ? "games" : "saved"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {movies.slice(0, 4).map((movie) => {
                      const poster = getPosterUrl(movie.poster_path);
                      return (
                        <button
                          key={movie.id}
                          type="button"
                          onClick={() => handleItemClick(movie)}
                          className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-800/80 text-left transition-all group cursor-pointer"
                        >
                          <div className="w-10 h-14 rounded-lg overflow-hidden bg-zinc-950 shrink-0">
                            {poster ? (
                              <img
                                src={poster}
                                alt={movie.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                {isGaming ? <Gamepad2 className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className={`text-xs sm:text-sm font-bold text-zinc-200 ${isGaming ? "group-hover:text-emerald-400" : "group-hover:text-amber-400"} truncate transition-colors`}>
                              {movie.title}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                              <span>{movie.release_year || "—"}</span>
                              <span>•</span>
                              <span className="capitalize">{isGaming ? "Game" : (movie.media_type === "tv" ? "TV" : "Movie")}</span>
                            </div>
                          </div>
                          <ArrowRight className={`w-4 h-4 text-zinc-600 ${isGaming ? "group-hover:text-emerald-400" : "group-hover:text-amber-400"} transition-colors shrink-0 mr-1`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recently watched */}
              {watched.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {isGaming ? "Recently Played" : "Recently Watched"}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium">
                      {watched.length} completed
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {watched.slice(0, 4).map((movie) => {
                      const poster = getPosterUrl(movie.poster_path);
                      return (
                        <button
                          key={movie.id}
                          type="button"
                          onClick={() => handleItemClick(movie)}
                          className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-800/80 text-left transition-all group cursor-pointer"
                        >
                          <div className="w-10 h-14 rounded-lg overflow-hidden bg-zinc-950 shrink-0">
                            {poster ? (
                              <img
                                src={poster}
                                alt={movie.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                {isGaming ? <Gamepad2 className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-bold text-zinc-200 group-hover:text-emerald-400 truncate transition-colors">
                              {movie.title}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                              {movie.rating ? (
                                <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                                  <Star className="w-3 h-3 fill-amber-400" />
                                  {movie.rating}
                                </span>
                              ) : (
                                <span>{isGaming ? "Played" : "Watched"}</span>
                              )}
                              <span>•</span>
                              <span>{movie.release_year || "—"}</span>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors shrink-0 mr-1" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {movies.length === 0 && watched.length === 0 && (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  {isGaming
                    ? "Type any game title (e.g. Witcher, Elden Ring, Zelda) to search RAWG"
                    : "Type any title name to instantly search across movies & TV series"}
                </div>
              )}
            </div>
          )}

          {/* STATE 2: Query Results */}
          {hasQuery && (
            <div className="space-y-4 pb-4">
              {/* Library Matches Section */}
              {libraryMatches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className={`text-xs font-bold ${isGaming ? "text-emerald-400" : "text-amber-400"} uppercase tracking-wider flex items-center gap-1.5`}>
                      <Bookmark className="w-3.5 h-3.5" />
                      In Your {isGaming ? "Gaming Backlog" : "Library"} ({libraryMatches.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {libraryMatches.map(({ item, status }) => {
                      const poster = getPosterUrl(item.poster_path);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleItemClick(item)}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/80 transition-all group cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-14 rounded-lg overflow-hidden bg-zinc-950 shrink-0">
                              {poster ? (
                                <img
                                  src={poster}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                  {isGaming ? <Gamepad2 className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={`text-xs sm:text-sm font-bold text-zinc-100 ${isGaming ? "group-hover:text-emerald-400" : "group-hover:text-amber-400"} truncate transition-colors`}>
                                  {item.title}
                                </h4>
                                {status === "watchlist" ? (
                                  <span className={`text-[10px] ${isGaming ? "bg-emerald-400/15 text-emerald-400" : "bg-amber-400/15 text-amber-400"} font-semibold px-2 py-0.5 rounded-full shrink-0`}>
                                    {isGaming ? "To Play" : "To-Watch"}
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-emerald-400/15 text-emerald-400 font-semibold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                                    {isGaming ? "Played" : "Watched"} {item.rating ? `★${item.rating}` : ""}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1 flex-wrap">
                                <span>{item.release_year || "—"}</span>
                                <span>•</span>
                                <span className="capitalize">{isGaming ? "Game" : (item.media_type === "tv" ? "TV Series" : "Movie")}</span>
                                {item.genres && item.genres.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-[140px] text-zinc-500">
                                      {item.genres.slice(0, 2).join(", ")}
                                    </span>
                                  </>
                                )}
                              </div>
                              {item.platforms && item.platforms.length > 0 && (
                                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                  {item.platforms.slice(0, 2).map((p) => (
                                    <OttBadge key={p} platform={p} size="sm" />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <ArrowRight className={`w-4 h-4 text-zinc-600 ${isGaming ? "group-hover:text-emerald-400" : "group-hover:text-amber-400"} transition-colors shrink-0 mr-1`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Global Search Results */}
              {scope !== "library" && (
                <div className="space-y-2 pt-1">
                  {filteredExternalResults.length > 0 && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                        {isGaming ? "Explore Games (RAWG)" : "Explore Titles"} ({filteredExternalResults.length})
                      </span>
                    </div>
                  )}

                  {isLoading && filteredExternalResults.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-zinc-500 gap-2">
                      <Loader2 className={`w-5 h-5 animate-spin ${isGaming ? "text-emerald-400" : "text-amber-400"}`} />
                      <span className="text-xs">Searching {isGaming ? "RAWG games..." : "titles..."}</span>
                    </div>
                  )}

                  {!isLoading && filteredExternalResults.length === 0 && libraryMatches.length === 0 && (
                    <div className="text-center py-12 text-zinc-500 text-xs">
                      No matching {isGaming ? "games" : "titles"} found for &quot;{query}&quot;
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {filteredExternalResults.map((item) => {
                      const inWatchlist = existingWatchlistIds.has(item.tmdb_id);
                      const inWatched = existingWatchedIds.has(item.tmdb_id);
                      const poster = getPosterUrl(item.poster_path);

                      return (
                        <div
                          key={item.tmdb_id}
                          onClick={() => handleItemClick(item)}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-850 transition-all group cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-14 rounded-lg overflow-hidden bg-zinc-950 shrink-0">
                              {poster ? (
                                <img
                                  src={poster}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                  {isGaming ? (
                                    <Gamepad2 className="w-4 h-4" />
                                  ) : item.media_type === "tv" ? (
                                    <Tv className="w-4 h-4" />
                                  ) : (
                                    <Film className="w-4 h-4" />
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className={`text-xs sm:text-sm font-bold text-zinc-100 ${isGaming ? "group-hover:text-emerald-400" : "group-hover:text-amber-400"} truncate transition-colors`}>
                                {item.title}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5 flex-wrap">
                                <span>{item.release_year || "—"}</span>
                                <span>•</span>
                                <span className="capitalize">{isGaming ? "Game" : (item.media_type === "tv" ? "TV Series" : "Movie")}</span>
                                {item.metacritic && (
                                  <>
                                    <span>•</span>
                                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1 rounded text-[10px]">
                                      Meta {item.metacritic}
                                    </span>
                                  </>
                                )}
                              </div>
                              {item.platforms && item.platforms.length > 0 && (
                                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                  {item.platforms.slice(0, 2).map((p) => (
                                    <OttBadge key={p} platform={p} size="sm" />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {inWatchlist && (
                              <span className={`text-[10px] font-semibold ${isGaming ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10"} px-2 py-0.5 rounded-full`}>
                                {isGaming ? "In Backlog" : "In List"}
                              </span>
                            )}
                            {inWatched && (
                              <span className="text-[10px] font-semibold text-emerald-400 px-2 py-0.5 bg-emerald-400/10 rounded-full">
                                {isGaming ? "Played" : "Watched"}
                              </span>
                            )}
                            <ArrowRight className={`w-4 h-4 text-zinc-600 ${isGaming ? "group-hover:text-emerald-400" : "group-hover:text-amber-400"} transition-colors`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
