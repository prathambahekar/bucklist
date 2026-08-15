import { useState, useEffect, useRef } from "react";
import { Search, X, Plus, Check } from "lucide-react";
import { searchMovies, getPosterUrl, type SearchResult } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface SearchBarProps {
  onAdded: () => void;
  existingTmdbIds?: Set<number>;
}

export function SearchBar({ onAdded, existingTmdbIds = new Set() }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localAddedIds, setLocalAddedIds] = useState<Set<number>>(new Set());
  const [addingId, setAddingId] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search effect
  useEffect(() => {
    const trimmed = query.trim();
    setError(null);

    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setOpen(true);
    const currentRequestId = ++requestIdRef.current;

    const timer = setTimeout(async () => {
      try {
        const res = await searchMovies(trimmed);
        if (currentRequestId === requestIdRef.current) {
          setResults(res);
          setError(null);
        }
      } catch (e) {
        if (currentRequestId === requestIdRef.current) {
          setError(e instanceof Error ? e.message : "Something went wrong");
          setResults([]);
        }
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  async function handleAdd(movie: SearchResult) {
    setAddingId(movie.tmdb_id);
    try {
      const { error: insertError } = await supabase
        .from("watchlist")
        .insert({
          tmdb_id: movie.tmdb_id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_year: movie.release_year,
          genres: movie.genres || [],
          platforms: movie.platforms || [],
        });
      if (insertError) {
        if (insertError.code === "23505") {
          setError(`"${movie.title}" is already in your watchlist`);
        } else {
          throw insertError;
        }
      } else {
        setLocalAddedIds((prev) => new Set(prev).add(movie.tmdb_id));
        onAdded();
      }
    } catch (e) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : e instanceof Error
          ? e.message
          : "Failed to add movie";
      setError(msg);
    } finally {
      setAddingId(null);
    }
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setOpen(false);
    setError(null);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => (results.length > 0 || loading || error) && setOpen(true)}
          placeholder="Search movies or TV series..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-10 py-3.5 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="p-3 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-12 h-[72px] rounded-lg bg-zinc-800 flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-zinc-800 rounded w-3/4" />
                    <div className="h-3 bg-zinc-800/60 rounded w-1/3" />
                    <div className="h-3 bg-zinc-800/40 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="px-4 py-3 text-sm text-red-400 border-b border-zinc-800">{error}</div>
          )}

          {!loading && !error && results.length === 0 && query.trim().length >= 2 && (
            <div className="px-4 py-8 text-center text-zinc-500 text-sm">No titles found</div>
          )}

          {!loading && results.length > 0 && (
            <div className="divide-y divide-zinc-800/60">
              {results.map((movie) => {
                const poster = getPosterUrl(movie.poster_path);
                const isAdded = existingTmdbIds.has(movie.tmdb_id) || localAddedIds.has(movie.tmdb_id);
                const isAdding = addingId === movie.tmdb_id;
                const genres = movie.genres || [];
                const platforms = movie.platforms || [];
                const isTv = movie.media_type === "tv";
                return (
                  <div
                    key={movie.tmdb_id}
                    className="flex gap-3 p-3 hover:bg-zinc-800/40 transition-colors"
                  >
                    <div className="w-12 h-[72px] rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                      {poster ? (
                        <img src={poster} alt={movie.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px] text-center px-1">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-medium text-zinc-100 truncate">
                            {movie.title}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-[9px] font-semibold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                                isTv
                                  ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                                  : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                              }`}
                            >
                              {isTv ? "TV Series" : "Movie"}
                            </span>
                            {movie.release_year && (
                              <span className="text-xs text-zinc-500">{movie.release_year}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAdd(movie)}
                          disabled={isAdded || isAdding}
                          className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            isAdded
                              ? "bg-green-500/15 text-green-400 cursor-default"
                              : "bg-zinc-100 text-zinc-900 hover:bg-white"
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Added
                            </>
                          ) : isAdding ? (
                            "Adding..."
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" /> Add
                            </>
                          )}
                        </button>
                      </div>

                      {genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {genres.slice(0, 3).map((g) => (
                            <span
                              key={g}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      )}

                      {platforms.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {platforms.slice(0, 3).map((p) => (
                            <span
                              key={p}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/90"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
