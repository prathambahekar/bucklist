import React, { useState } from "react";
import {
  X,
  Search,
  Plus,
  Check,
  Film,
  Loader2,
  ListPlus,
  Star,
} from "lucide-react";
import type { Blend, WatchlistMovie, SearchResult } from "../types";
import { searchMovies, getPosterUrl } from "../lib/api";
import { OttBadge } from "./OttBadge";

interface AddMovieToBlendModalProps {
  isOpen: boolean;
  onClose: () => void;
  blend: Blend;
  watchlist: WatchlistMovie[];
  currentMemberId: string;
  currentMemberName: string;
  onAddMovie: (
    movie: WatchlistMovie | SearchResult,
    extraDetails?: {
      runtime?: string;
      director?: string;
      cast?: string[];
      backdropPath?: string;
      voteAverage?: number;
    }
  ) => void;
}

export function AddMovieToBlendModal({
  isOpen,
  onClose,
  blend,
  watchlist,
  currentMemberId,
  currentMemberName,
  onAddMovie,
}: AddMovieToBlendModalProps) {
  const [activeTab, setActiveTab] = useState<"search" | "watchlist">("search");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<number>>(
    new Set(blend.movies.map((m) => m.tmdb_id))
  );

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const results = await searchMovies(query);
      setSearchResults(results);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (item: WatchlistMovie | SearchResult) => {
    setAddedIds((prev) => new Set(prev).add(item.tmdb_id));
    onAddMovie(item);
  };

  // Filter watchlist movies not already in blend
  const availableFromWatchlist = watchlist.filter(
    (m) => !addedIds.has(m.tmdb_id)
  );

  return (
    <div
      id="add-movie-to-blend-backdrop"
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="add-movie-to-blend-modal"
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden relative text-zinc-100 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200">
                <ListPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-100">
                  Add Movies to {blend.name}
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Adding as <span className="text-zinc-200 font-semibold">{currentMemberName}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl max-w-xs">
            <button
              type="button"
              onClick={() => setActiveTab("search")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "search"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Search TMDB
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("watchlist")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "watchlist"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Bucket List ({availableFromWatchlist.length})
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {activeTab === "search" ? (
            <div>
              <form onSubmit={handleSearch} className="relative mb-4">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search movies, TV shows..."
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-500 rounded-xl pl-9 pr-20 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
                </button>
              </form>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                  <span>Searching TMDB...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((item) => {
                    const isAdded = addedIds.has(item.tmdb_id);
                    const posterUrl = getPosterUrl(item.poster_path);
                    return (
                      <div
                        key={item.tmdb_id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className="w-10 h-14 rounded-lg bg-zinc-950 overflow-hidden shrink-0 border border-zinc-800">
                            {posterUrl ? (
                              <img
                                src={posterUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                <Film className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                              {item.release_year && <span>{item.release_year}</span>}
                              {item.genres && item.genres.length > 0 && (
                                <span>• {item.genres.slice(0, 2).join(", ")}</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(item.platforms || []).slice(0, 2).map((p) => (
                                <OttBadge key={p} platform={p} />
                              ))}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isAdded}
                          onClick={() => handleAdd(item)}
                          className={`shrink-0 p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isAdded
                              ? "bg-zinc-800/50 text-emerald-400 border border-emerald-500/30"
                              : "bg-white hover:bg-zinc-200 text-zinc-950 shadow-sm active:scale-95"
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span className="hidden sm:inline">In Blend</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 stroke-[2.5]" />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : query.trim() ? (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  No titles found for "{query}". Try a different movie title.
                </div>
              ) : (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  Search for any movie or series to add it directly to this Blend.
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: Add from existing Watchlist */
            <div>
              {availableFromWatchlist.length > 0 ? (
                <div className="space-y-2">
                  {availableFromWatchlist.map((item) => {
                    const isAdded = addedIds.has(item.tmdb_id);
                    const posterUrl = getPosterUrl(item.poster_path);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className="w-10 h-14 rounded-lg bg-zinc-950 overflow-hidden shrink-0 border border-zinc-800">
                            {posterUrl ? (
                              <img
                                src={posterUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                <Film className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                              {item.release_year && <span>{item.release_year}</span>}
                              {item.rating && (
                                <span className="flex items-center gap-0.5 text-zinc-200 font-semibold">
                                  <Star className="w-3 h-3 fill-zinc-200 text-zinc-200" />
                                  {item.rating}★
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isAdded}
                          onClick={() => handleAdd(item)}
                          className={`shrink-0 p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isAdded
                              ? "bg-zinc-800/50 text-emerald-400 border border-emerald-500/30"
                              : "bg-white hover:bg-zinc-200 text-zinc-950 shadow-sm active:scale-95"
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 stroke-[2.5]" />
                              <span>Add to Blend</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  All items from your bucket list are already in this Blend or your watchlist is empty.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
