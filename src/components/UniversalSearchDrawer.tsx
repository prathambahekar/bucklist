import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  X,
  Loader2,
  Film,
  Tv,
  Star,
  CheckCircle2,
  Bookmark,
  Check,
  Sparkles,
  ArrowRight,
  Gamepad2,
} from "lucide-react";
import type { SearchResult, WatchlistMovie, AppMode } from "../types";
import {
  searchMovies,
  getPosterUrl,
  handleImageError,
  DEFAULT_POSTER_FALLBACK,
  DEFAULT_GAME_POSTER_FALLBACK,
} from "../lib/api";
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
  const isGames = appMode === "games";
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchFilterScope>("all");
  const [tmdbResults, setTmdbResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Auto focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery("");
      setTmdbResults([]);
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

      if (!isGames) {
        if (scope === "movies" && item.media_type === "tv") return false;
        if (scope === "tv" && item.media_type !== "tv") return false;
      }

      return titleMatch || genreMatch || yearMatch;
    });
  }, [query, movies, watched, scope, isGames]);

  // Live search with debouncing (RAWG in games mode, TMDB in cinema mode)
  useEffect(() => {
    const trimmed = query.trim();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!trimmed || scope === "library") {
      setTmdbResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = window.setTimeout(() => {
      const searchFn = isGames ? searchGames(trimmed) : searchMovies(trimmed);

      searchFn
        .then((res) => {
          let filtered = res;
          if (!isGames) {
            if (scope === "movies") {
              filtered = res.filter((item) => item.media_type !== "tv");
            } else if (scope === "tv") {
              filtered = res.filter((item) => item.media_type === "tv");
            }
          }
          setTmdbResults(filtered);
        })
        .catch((err) => {
          console.warn("Universal search query failed:", err);
          setTmdbResults([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, scope, isGames]);

  if (!isOpen) return null;

  const handleItemClick = (item: WatchlistMovie | SearchResult) => {
    onSelectMovie(item);
    onClose();
  };

  const hasQuery = query.trim().length > 0;
  const libraryIds = new Set(libraryMatches.map((m) => m.item.tmdb_id));

  // Filter out results that are already shown in library matches to avoid duplicates
  const filteredTmdbResults = tmdbResults.filter(
    (item) => !libraryIds.has(item.tmdb_id)
  );

  const resolvePoster = (posterPath?: string | null) => {
    if (!posterPath) return null;
    return getPosterUrl(posterPath);
  };

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
          <div className="flex items-center gap-2.5 bg-zinc-900/90 border border-zinc-800/80 focus-within:border-amber-400/50 rounded-2xl px-3.5 py-2.5 focus-within:ring-1 focus-within:ring-amber-400/20 transition-all">
            <Search className="w-4 h-4 text-amber-400 shrink-0" />
            <input
              ref={inputRef}
              id="universal-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isGames ? "Search games, genres, or platforms..." : "Search library, movies, series, or genres..."}
              className="w-full bg-transparent text-sm sm:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none font-medium"
              autoComplete="off"
              spellCheck="false"
            />
            {isLoading && (
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
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
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(isGames
              ? [
                  { id: "all", label: "All" },
                  { id: "library", label: "In My Backlog" },
                ]
              : [
                  { id: "all", label: "All" },
                  { id: "library", label: "In My Library" },
                  { id: "movies", label: "Movies" },
                  { id: "tv", label: "TV Series" },
                ]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                id={`search-scope-${tab.id}`}
                onClick={() => setScope(tab.id as SearchFilterScope)}
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
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 no-scrollbar">
          {/* STATE 1: Empty Query - Quick Access Sections */}
          {!hasQuery && (
            <div className="space-y-4 pb-4">
              {/* Recently added to watchlist / backlog */}
              {movies.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                      {isGames ? "In Your Backlog" : "In Your Watchlist"}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium">
                      {movies.length} saved
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {movies.slice(0, 4).map((movie) => {
                      const poster = resolvePoster(movie.poster_path);
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
                                onError={(e) =>
                                  handleImageError(
                                    e,
                                    isGames
                                      ? DEFAULT_GAME_POSTER_FALLBACK
                                      : DEFAULT_POSTER_FALLBACK
                                  )
                                }
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                {isGames ? <Gamepad2 className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-bold text-zinc-200 group-hover:text-amber-400 truncate transition-colors">
                              {movie.title}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                              <span>{movie.release_year || "—"}</span>
                              {movie.metacritic ? (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-400 font-semibold">{movie.metacritic} Metascore</span>
                                </>
                              ) : !isGames ? (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{movie.media_type === "tv" ? "TV" : "Movie"}</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-colors shrink-0 mr-1" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recently watched / played */}
              {watched.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {isGames ? "Recently Played" : "Recently Watched"}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium">
                      {watched.length} completed
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {watched.slice(0, 4).map((movie) => {
                      const poster = resolvePoster(movie.poster_path);
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
                                onError={(e) =>
                                  handleImageError(
                                    e,
                                    isGames
                                      ? DEFAULT_GAME_POSTER_FALLBACK
                                      : DEFAULT_POSTER_FALLBACK
                                  )
                                }
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                {isGames ? <Gamepad2 className="w-4 h-4" /> : <Film className="w-4 h-4" />}
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
                                <span>{isGames ? "Played" : "Watched"}</span>
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
                  {isGames
                    ? "Type any title to instantly search video games via RAWG"
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
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5" />
                      In Your {isGames ? "Backlog" : "Library"} ({libraryMatches.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {libraryMatches.map(({ item, status }) => {
                      const poster = resolvePoster(item.poster_path);
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
                                  onError={(e) =>
                                    handleImageError(
                                      e,
                                      isGames
                                        ? DEFAULT_GAME_POSTER_FALLBACK
                                        : DEFAULT_POSTER_FALLBACK
                                    )
                                  }
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                  {isGames ? <Gamepad2 className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs sm:text-sm font-bold text-zinc-100 group-hover:text-amber-400 truncate transition-colors">
                                  {item.title}
                                </h4>
                                {status === "watchlist" ? (
                                  <span className="text-[10px] bg-amber-400/15 text-amber-400 font-semibold px-2 py-0.5 rounded-full shrink-0">
                                    {isGames ? "To-Play" : "To-Watch"}
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-emerald-400/15 text-emerald-400 font-semibold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                                    {isGames ? "Played" : "Watched"} {item.rating ? `★${item.rating}` : ""}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1 flex-wrap">
                                <span>{item.release_year || "—"}</span>
                                {item.metacritic ? (
                                  <>
                                    <span>•</span>
                                    <span className="text-emerald-400 font-medium">{item.metacritic} Metascore</span>
                                  </>
                                ) : !isGames ? (
                                  <>
                                    <span>•</span>
                                    <span className="capitalize">{item.media_type === "tv" ? "TV Series" : "Movie"}</span>
                                  </>
                                ) : null}
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

                          <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-colors shrink-0 mr-1" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Global Search Results */}
              {scope !== "library" && (
                <div className="space-y-2 pt-1">
                  {filteredTmdbResults.length > 0 && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                        {isGames ? `Explore Games (${filteredTmdbResults.length})` : `Explore Titles (${filteredTmdbResults.length})`}
                      </span>
                    </div>
                  )}

                  {isLoading && filteredTmdbResults.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-zinc-500 gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                      <span className="text-xs">{isGames ? "Searching games..." : "Searching titles..."}</span>
                    </div>
                  )}

                  {!isLoading && filteredTmdbResults.length === 0 && libraryMatches.length === 0 && (
                    <div className="text-center py-12 text-zinc-500 text-xs">
                      No matching {isGames ? "games" : "titles"} found for &quot;{query}&quot;
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {filteredTmdbResults.map((item) => {
                      const inWatchlist = existingWatchlistIds.has(item.tmdb_id);
                      const inWatched = existingWatchedIds.has(item.tmdb_id);
                      const poster = resolvePoster(item.poster_path);

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
                                  onError={(e) =>
                                    handleImageError(
                                      e,
                                      isGames
                                        ? DEFAULT_GAME_POSTER_FALLBACK
                                        : DEFAULT_POSTER_FALLBACK
                                    )
                                  }
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                  {isGames ? (
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
                              <h4 className="text-xs sm:text-sm font-bold text-zinc-100 group-hover:text-amber-400 truncate transition-colors">
                                {item.title}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5 flex-wrap">
                                <span>{item.release_year || "—"}</span>
                                {item.metacritic ? (
                                  <>
                                    <span>•</span>
                                    <span className="text-emerald-400 font-semibold">{item.metacritic} Metascore</span>
                                  </>
                                ) : !isGames ? (
                                  <>
                                    <span>•</span>
                                    <span className="capitalize">{item.media_type === "tv" ? "TV Series" : "Movie"}</span>
                                  </>
                                ) : null}
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
                              <span className="text-[10px] font-semibold text-amber-400 px-2 py-0.5 bg-amber-400/10 rounded-full">
                                {isGames ? "In Backlog" : "In List"}
                              </span>
                            )}
                            {inWatched && (
                              <span className="text-[10px] font-semibold text-emerald-400 px-2 py-0.5 bg-emerald-400/10 rounded-full">
                                {isGames ? "Played" : "Watched"}
                              </span>
                            )}
                            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-colors" />
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

