import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Bookmark,
  Search,
  X,
  Plus,
  Check,
  Film,
  CheckCircle2,
  Trash2,
  Star,
  PlayCircle,
  SlidersHorizontal,
  Loader2,
  Tv,
  ListOrdered,
} from "lucide-react";
import {
  supabase,
  getLocalWatchlist,
  saveLocalWatchlist,
  getLocalTvProgress,
  TvProgressMap,
} from "./lib/supabase";
import {
  searchMovies,
  getPosterUrl,
  getBackdropUrl,
  getTmdbApiKey,
  detectMediaType,
} from "./lib/api";
import { EpisodeDrawer } from "./components/EpisodeDrawer";
import { StarRating } from "./components/StarRating";
import { OttBadge, OttIcon } from "./components/OttBadge";
import type {
  WatchlistMovie,
  SearchResult,
  MovieDetailExtra,
  TabType,
} from "./types";

export default function App() {
  const [tab, setTab] = useState<TabType>("towatch");
  const [movies, setMovies] = useState<WatchlistMovie[]>([]);
  const [watched, setWatched] = useState<WatchlistMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [knownTvTmdbIds, setKnownTvTmdbIds] = useState<Set<number>>(() => new Set());

  // TV Episode Drawer State & Progress Tracking
  const [activeTvDrawerMovie, setActiveTvDrawerMovie] = useState<
    WatchlistMovie | SearchResult | null
  >(null);
  const [tvProgressMap, setTvProgressMap] = useState<TvProgressMap>({});

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);

  // Modal states
  const [watchedModalMovie, setWatchedModalMovie] = useState<WatchlistMovie | null>(null);
  const [userRating, setUserRating] = useState<number>(5);
  const [detailMovie, setDetailMovie] = useState<WatchlistMovie | SearchResult | null>(null);
  const [genreModalOpen, setGenreModalOpen] = useState(false);
  const [detailExtraLoading, setDetailExtraLoading] = useState(false);
  const [detailExtra, setDetailExtra] = useState<MovieDetailExtra | null>(null);

  // Filter & Sort
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [sortBy] = useState<"newest" | "rating" | "release">("newest");

  const requestIdRef = useRef(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Load TV progress
  useEffect(() => {
    setTvProgressMap(getLocalTvProgress());
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isItemTv = useCallback(
    (item: WatchlistMovie | SearchResult | null | undefined): boolean => {
      if (!item) return false;
      // Strictly respect media_type
      if (item.media_type === "tv") return true;
      if (item.media_type === "movie") return false;

      // If media_type is not yet set, check known IDs only if verified
      if (knownTvTmdbIds.has(item.tmdb_id)) return true;

      // Common TV shows quick detection fallback
      const lower = (item.title || "").toLowerCase();
      if (
        lower.includes("house of the dragon") ||
        lower.includes("game of thrones") ||
        lower.includes("breaking bad") ||
        lower.includes("stranger things") ||
        lower.includes("the last of us") ||
        lower.includes("succession") ||
        lower.includes("the bear") ||
        lower.includes("shogun")
      ) {
        return true;
      }
      return false;
    },
    [knownTvTmdbIds]
  );

  const fetchAll = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("watchlist")
        .select("*")
        .order("created_at", { ascending: false });

      let all: WatchlistMovie[] = [];
      if (error) {
        console.warn("Supabase fetch notice, using local storage:", error.message);
        all = getLocalWatchlist();
      } else {
        all = (data || []) as WatchlistMovie[];
        saveLocalWatchlist(all);
      }

      // Collect known TV IDs only from items that are verified as TV
      const tvIds = new Set<number>();
      all.forEach((m) => {
        if (m.media_type === "tv") tvIds.add(m.tmdb_id);
      });
      setKnownTvTmdbIds(tvIds);

      // Auto-detect missing media types in background
      const missingMedia = all.filter((m) => !m.media_type);
      if (missingMedia.length > 0) {
        Promise.all(
          missingMedia.map(async (item) => {
            const detected = await detectMediaType(item.tmdb_id, item.title, item.release_year);
            return { id: item.id, tmdb_id: item.tmdb_id, media_type: detected };
          })
        ).then((results) => {
          let hasNewTv = false;
          const updatedTvIds = new Set(tvIds);
          results.forEach((r) => {
            if (r.media_type === "tv") {
              updatedTvIds.add(r.tmdb_id);
              hasNewTv = true;
            }
          });

          if (hasNewTv) {
            setKnownTvTmdbIds(updatedTvIds);
          }

          // Update local state with accurately detected types
          setMovies((prev) =>
            prev.map((m) => {
              const res = results.find((r) => r.id === m.id);
              return res ? { ...m, media_type: res.media_type } : m;
            })
          );
          setWatched((prev) =>
            prev.map((m) => {
              const res = results.find((r) => r.id === m.id);
              return res ? { ...m, media_type: res.media_type } : m;
            })
          );

          // Also persist back to local storage
          const current = getLocalWatchlist();
          const updatedLocal = current.map((m) => {
            const res = results.find((r) => r.id === m.id);
            return res ? { ...m, media_type: res.media_type } : m;
          });
          saveLocalWatchlist(updatedLocal);
        });
      }

      setMovies(all.filter((m) => !m.watched));
      setWatched(
        all
          .filter((m) => m.watched)
          .sort((a, b) => (b.watched_date || "").localeCompare(a.watched_date || ""))
      );
    } catch (e) {
      console.warn("Using local storage fallback:", e);
      const local = getLocalWatchlist();
      setMovies(local.filter((m) => !m.watched));
      setWatched(
        local
          .filter((m) => m.watched)
          .sort((a, b) => (b.watched_date || "").localeCompare(a.watched_date || ""))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Search debounce effect
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setSearchOpen(true);
    const currentRequestId = ++requestIdRef.current;

    const timer = setTimeout(async () => {
      try {
        const res = await searchMovies(trimmed);
        if (currentRequestId === requestIdRef.current) {
          setSearchResults(res);
        }
      } catch {
        if (currentRequestId === requestIdRef.current) {
          setSearchResults([]);
        }
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setSearchLoading(false);
        }
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch extra details when detail modal opens
  useEffect(() => {
    if (!detailMovie?.tmdb_id) {
      setDetailExtra(null);
      setDetailExtraLoading(false);
      return;
    }

    const tmdbKey = getTmdbApiKey();
    const primaryType = detailMovie.media_type === "tv" ? "tv" : "movie";
    const secondaryType = primaryType === "tv" ? "movie" : "tv";

    async function fetchTmdbDetail(type: "tv" | "movie") {
      const res = await fetch(
        `https://api.themoviedb.org/3/${type}/${detailMovie!.tmdb_id}?api_key=${tmdbKey}&append_to_response=credits,videos&language=en-US`
      );
      if (!res.ok) return null;
      return res.json();
    }

    (async () => {
      setDetailExtraLoading(true);
      try {
        let data = await fetchTmdbDetail(primaryType);
        if (!data || (!data.overview && !data.backdrop_path)) {
          const fallbackData = await fetchTmdbDetail(secondaryType);
          if (fallbackData) data = fallbackData;
        }

        if (!data) return;
        const isTv = data.number_of_seasons !== undefined || primaryType === "tv";
        let runtimeStr = "";
        if (isTv) {
          if (data.number_of_seasons) {
            runtimeStr = `${data.number_of_seasons} Season${data.number_of_seasons > 1 ? "s" : ""}`;
            if (data.number_of_episodes) {
              runtimeStr += ` • ${data.number_of_episodes} Ep`;
            }
          }
        } else if (data.runtime) {
          const hrs = Math.floor(data.runtime / 60);
          const mins = data.runtime % 60;
          runtimeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
        }

        const castList = (data.credits?.cast || [])
          .slice(0, 5)
          .map((c: { name: string }) => c.name);

        const directorObj = (data.credits?.crew || []).find(
          (c: { job: string }) => c.job === "Director"
        );
        const creatorObj = data.created_by?.[0];
        const directorName = directorObj?.name || creatorObj?.name;

        const videos = data.videos?.results || [];
        const trailer =
          videos.find(
            (v: { type: string; site: string }) =>
              v.type === "Trailer" && v.site === "YouTube"
          ) || videos[0];

        const storedOverview =
          detailMovie && "overview" in detailMovie ? detailMovie.overview : null;
        setDetailExtra({
          overview: data.overview || storedOverview,
          tagline: data.tagline,
          voteAverage: data.vote_average
            ? Number(data.vote_average.toFixed(1))
            : undefined,
          voteCount: data.vote_count,
          runtime: runtimeStr,
          cast: castList,
          director: directorName,
          trailerKey: trailer?.key,
          backdropPath: data.backdrop_path,
        });
      } catch (e) {
        console.error("Detail fetch error:", e);
      } finally {
        setDetailExtraLoading(false);
      }
    })();
  }, [detailMovie]);

  async function handleAdd(item: SearchResult) {
    setAddingId(item.tmdb_id);
    const newRecord: WatchlistMovie = {
      id: "wl_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
      tmdb_id: item.tmdb_id,
      title: item.title,
      poster_path: item.poster_path,
      release_year: item.release_year,
      media_type: item.media_type,
      genres: item.genres || [],
      platforms: item.platforms || [],
      watched: false,
      watched_date: null,
      rating: null,
      created_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from("watchlist").insert([{
        tmdb_id: item.tmdb_id,
        title: item.title,
        poster_path: item.poster_path,
        release_year: item.release_year,
        genres: item.genres || [],
        platforms: item.platforms || [],
        watched: false,
      }]);

      if (error) {
        console.warn("Supabase insert fallback to local state:", error);
        // Add to local state & storage
        const current = getLocalWatchlist();
        if (current.some((m) => m.tmdb_id === item.tmdb_id)) {
          alert(`"${item.title}" is already in your watchlist.`);
        } else {
          const updated = [newRecord, ...current];
          saveLocalWatchlist(updated);
          setMovies((prev) => [newRecord, ...prev]);
        }
      } else {
        await fetchAll();
      }
      setSearchOpen(false);
      setQuery("");
    } catch {
      const current = getLocalWatchlist();
      const updated = [newRecord, ...current];
      saveLocalWatchlist(updated);
      setMovies((prev) => [newRecord, ...prev]);
      setSearchOpen(false);
      setQuery("");
    } finally {
      setAddingId(null);
    }
  }

  async function handleSaveWatched() {
    if (!watchedModalMovie) return;
    const todayDate = new Date().toISOString().split("T")[0];

    // Optimistic update
    const updatedMovie: WatchlistMovie = {
      ...watchedModalMovie,
      watched: true,
      watched_date: todayDate,
      rating: userRating,
    };

    setMovies((prev) => prev.filter((m) => m.id !== watchedModalMovie.id));
    setWatched((prev) => [updatedMovie, ...prev.filter((m) => m.id !== watchedModalMovie.id)]);
    setWatchedModalMovie(null);

    // Save to local storage
    const current = getLocalWatchlist();
    const updatedList = current.map((m) =>
      m.id === watchedModalMovie.id ? updatedMovie : m
    );
    saveLocalWatchlist(updatedList);

    try {
      const { error } = await supabase
        .from("watchlist")
        .update({
          watched: true,
          watched_date: todayDate,
          rating: userRating,
        })
        .eq("id", watchedModalMovie.id);

      if (error) {
        console.warn("Supabase update error, saved locally:", error);
      }
    } catch (e) {
      console.warn("Update exception:", e);
    }
  }

  async function handleMarkSeriesWatched(series: WatchlistMovie, rating: number = 5) {
    const todayDate = new Date().toISOString().split("T")[0];
    const updatedMovie: WatchlistMovie = {
      ...series,
      watched: true,
      watched_date: todayDate,
      rating,
    };

    setMovies((prev) => prev.filter((m) => m.id !== series.id));
    setWatched((prev) => [updatedMovie, ...prev.filter((m) => m.id !== series.id)]);
    setActiveTvDrawerMovie(null);

    const current = getLocalWatchlist();
    const updatedList = current.map((m) => (m.id === series.id ? updatedMovie : m));
    saveLocalWatchlist(updatedList);

    try {
      const { error } = await supabase
        .from("watchlist")
        .update({
          watched: true,
          watched_date: todayDate,
          rating,
        })
        .eq("id", series.id);

      if (error) {
        console.warn("Supabase series update error:", error);
      }
    } catch (e) {
      console.warn("Series update exception:", e);
    }
  }

  async function handleTvProgressUpdated(tmdbId: number, watchedCount: number, totalCount: number) {
    setTvProgressMap((prev) => ({
      ...prev,
      [tmdbId]: {
        watchedEpisodes: getLocalTvProgress()[tmdbId]?.watchedEpisodes || [],
        totalEpisodes: totalCount,
        lastUpdated: new Date().toISOString(),
      },
    }));

    // Auto mark series as completed when all episodes are watched
    if (totalCount > 0 && watchedCount >= totalCount) {
      const targetMovie = movies.find((m) => m.tmdb_id === tmdbId);
      if (targetMovie && !targetMovie.watched) {
        const seasonRatings = getSeriesSeasonRatings(tmdbId);
        const ratedVals = Object.values(seasonRatings).filter(
          (r) => typeof r === "number" && r > 0
        );
        let finalRating = targetMovie.rating || 5;
        if (ratedVals.length > 0) {
          finalRating =
            Math.round((ratedVals.reduce((a, b) => a + b, 0) / ratedVals.length) * 2) / 2;
        }

        const todayDate = new Date().toISOString().split("T")[0];
        const updatedMovie: WatchlistMovie = {
          ...targetMovie,
          watched: true,
          watched_date: todayDate,
          rating: finalRating,
        };

        setMovies((prev) => prev.filter((m) => m.tmdb_id !== tmdbId));
        setWatched((prev) => [updatedMovie, ...prev.filter((m) => m.tmdb_id !== tmdbId)]);

        const current = getLocalWatchlist();
        const updatedList = current.map((m) => (m.tmdb_id === tmdbId ? updatedMovie : m));
        saveLocalWatchlist(updatedList);

        try {
          await supabase
            .from("watchlist")
            .update({
              watched: true,
              watched_date: todayDate,
              rating: finalRating,
            })
            .eq("tmdb_id", tmdbId);
        } catch (e) {
          console.warn("Auto-complete series update error:", e);
        }
      }
    } else if (totalCount > 0 && watchedCount < totalCount) {
      // Revert if user unchecks an episode from 100%
      const targetWatched = watched.find((m) => m.tmdb_id === tmdbId);
      if (targetWatched && targetWatched.watched) {
        const unwatchedMovie: WatchlistMovie = {
          ...targetWatched,
          watched: false,
          watched_date: undefined,
        };

        setWatched((prev) => prev.filter((m) => m.tmdb_id !== tmdbId));
        setMovies((prev) => [unwatchedMovie, ...prev.filter((m) => m.tmdb_id !== tmdbId)]);

        const current = getLocalWatchlist();
        const updatedList = current.map((m) => (m.tmdb_id === tmdbId ? unwatchedMovie : m));
        saveLocalWatchlist(updatedList);

        try {
          await supabase
            .from("watchlist")
            .update({
              watched: false,
              watched_date: null,
            })
            .eq("tmdb_id", tmdbId);
        } catch (e) {
          console.warn("Revert watched series update error:", e);
        }
      }
    }
  }

  async function handleRatingUpdated(tmdbId: number, newRating: number) {
    setMovies((prev) =>
      prev.map((m) => (m.tmdb_id === tmdbId ? { ...m, rating: newRating } : m))
    );
    setWatched((prev) =>
      prev.map((m) => (m.tmdb_id === tmdbId ? { ...m, rating: newRating } : m))
    );

    const current = getLocalWatchlist();
    const updatedList = current.map((m) =>
      m.tmdb_id === tmdbId ? { ...m, rating: newRating } : m
    );
    saveLocalWatchlist(updatedList);

    try {
      const { error } = await supabase
        .from("watchlist")
        .update({ rating: newRating })
        .eq("tmdb_id", tmdbId);
      if (error) {
        console.warn("Supabase rating update error:", error);
      }
    } catch (e) {
      console.warn("Rating update exception:", e);
    }
  }

  async function handleDelete(id: string) {
    // Optimistically update local state for 0ms instant UI removal
    setMovies((prev) => prev.filter((m) => m.id !== id));
    setWatched((prev) => prev.filter((m) => m.id !== id));

    const current = getLocalWatchlist();
    saveLocalWatchlist(current.filter((m) => m.id !== id));

    try {
      const { error } = await supabase.from("watchlist").delete().eq("id", id);
      if (error) {
        console.warn("Supabase delete error:", error);
      }
    } catch (e) {
      console.warn("Delete exception:", e);
    }
  }

  const existingTmdbIds = useMemo(
    () => new Set<number>([...movies.map((m) => m.tmdb_id), ...watched.map((m) => m.tmdb_id)]),
    [movies, watched]
  );

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    [...movies, ...watched].forEach((m) => (m.genres || []).forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [movies, watched]);

  const allPlatforms = useMemo(() => {
    const set = new Set<string>();
    [...movies, ...watched].forEach((m) => (m.platforms || []).forEach((p) => set.add(p)));
    return Array.from(set).sort();
  }, [movies, watched]);

  const processList = useCallback(
    (list: WatchlistMovie[]) => {
      let filtered = list;
      if (selectedGenre) filtered = filtered.filter((m) => (m.genres || []).includes(selectedGenre));
      if (selectedPlatform) filtered = filtered.filter((m) => (m.platforms || []).includes(selectedPlatform));

      return [...filtered].sort((a, b) => {
        if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
        if (sortBy === "release") return (b.release_year || "").localeCompare(a.release_year || "");
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
    },
    [selectedGenre, selectedPlatform, sortBy]
  );

  const displayMovies = useMemo(() => processList(movies), [movies, processList]);
  const displayWatched = useMemo(() => processList(watched), [watched, processList]);

  return (
    <div id="bucklist-app" className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center pb-24">
      <div className="w-full max-w-6xl xl:max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {/* Header Bar */}
        <header id="app-header" className="flex items-center justify-between py-3 border-b border-zinc-800/80 mb-4">
          <div className="flex items-center gap-3">
            <div id="logo-badge" className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-950 shadow-md shadow-amber-500/20">
              <Bookmark className="w-5 h-5 fill-zinc-950" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-100">Bucklist</h1>
              <p className="text-xs text-zinc-500 hidden sm:block">Personal Movie & TV Watchlist</p>
            </div>
          </div>

          {/* Top Badges */}
          <div id="header-stats" className="flex items-center gap-1.5 sm:gap-2">
            <div
              id="stat-to-watch"
              className="flex items-center gap-1 sm:gap-1.5 bg-zinc-900 border border-zinc-800/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold text-zinc-200"
            >
              <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400" />
              <span>{movies.length} To Watch</span>
            </div>
            <div
              id="stat-watched"
              className="flex items-center gap-1 sm:gap-1.5 bg-zinc-900 border border-zinc-800/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold text-zinc-200"
            >
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
              <span>{watched.length} Watched</span>
            </div>
          </div>
        </header>

        {/* Search Input Bar with Integrated Filter Toggle */}
        <div id="search-section" ref={searchContainerRef} className="relative z-30 mb-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 flex items-center bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2.5 focus-within:border-amber-500/80 transition-colors shadow-inner">
              <Search className="w-4 h-4 text-zinc-500 mr-2.5 shrink-0" />
              <input
                id="search-input"
                type="text"
                className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
                placeholder="Search movies or TV series on TMDB..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => (searchResults.length > 0 || searchLoading) && setSearchOpen(true)}
              />
              {query.length > 0 && (
                <button
                  id="search-clear-btn"
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSearchResults([]);
                    setSearchOpen(false);
                  }}
                  className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Integrated Filter Button */}
            <button
              id="filter-toggle-btn"
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl border flex items-center justify-center relative transition-colors ${
                showFilters || selectedGenre || selectedPlatform
                  ? "bg-amber-500/15 border-amber-500/50 text-amber-400"
                  : "bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              }`}
              title="Toggle Filters"
            >
              <SlidersHorizontal className="w-5 h-5" />
              {(selectedGenre || selectedPlatform) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-zinc-900" />
              )}
            </button>
          </div>

          {/* Integrated Filter Strip */}
          {(showFilters || selectedGenre || selectedPlatform) && (
            <div id="filter-strip" className="mt-3 p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Filter by OTT & Genre
                </span>
                {(selectedGenre || selectedPlatform) && (
                  <button
                    id="reset-filters-btn"
                    type="button"
                    onClick={() => {
                      setSelectedGenre(null);
                      setSelectedPlatform(null);
                    }}
                    className="text-xs text-amber-400 hover:underline font-medium"
                  >
                    Reset all
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {/* All OTTs Pill */}
                <button
                  type="button"
                  onClick={() => setSelectedPlatform(null)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                    selectedPlatform === null
                      ? "bg-amber-500 text-zinc-950 border-amber-500 font-semibold"
                      : "bg-zinc-900 border-zinc-800 text-amber-400 hover:border-zinc-700"
                  }`}
                >
                  All OTTs
                </button>

                {/* List Platform Pills */}
                {allPlatforms.map((p) => {
                  const active = selectedPlatform === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPlatform(active ? null : p)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                        active
                          ? "bg-amber-500 text-zinc-950 border-amber-500 font-semibold shadow-sm"
                          : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                      }`}
                    >
                      <OttIcon platform={p} className="w-3.5 h-3.5" />
                      <span>{p}</span>
                    </button>
                  );
                })}

                {/* Genre Selector Pill */}
                {allGenres.length > 0 && (
                  <button
                    id="genre-picker-btn"
                    type="button"
                    onClick={() => setGenreModalOpen(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                      selectedGenre
                        ? "bg-amber-500 text-zinc-950 border-amber-500 font-semibold"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                    }`}
                  >
                    Genre: {selectedGenre || "All"} ▾
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Search Results Dropdown */}
          {searchOpen && (
            <div
              id="search-dropdown-menu"
              className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-96 overflow-y-auto z-50"
            >
              {searchLoading ? (
                <div className="flex items-center justify-center p-6 text-amber-500 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm text-zinc-400">Searching titles...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-sm text-zinc-500">
                  No titles found for "{query}"
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {searchResults.map((item) => {
                    const poster = getPosterUrl(item.poster_path);
                    const isAdded = existingTmdbIds.has(item.tmdb_id);
                    const isTv = item.media_type === "tv";
                    return (
                      <div
                        key={item.tmdb_id}
                        className="flex items-center gap-3.5 p-3 hover:bg-zinc-800/50 transition-colors"
                      >
                        <img
                          src={poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=100&auto=format&fit=crop&q=60"}
                          alt={item.title}
                          className="w-11 h-16 object-cover rounded-md bg-zinc-800 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-zinc-100 truncate">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                isTv
                                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                  : "bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                              }`}
                            >
                              {isTv ? "TV Series" : "Movie"}
                            </span>
                            {item.release_year && (
                              <span className="text-xs text-zinc-400">
                                {item.release_year}
                              </span>
                            )}
                          </div>
                          {item.platforms.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {item.platforms.slice(0, 3).map((p) => (
                                <span
                                  key={p}
                                  className="text-[10px] font-medium text-amber-300/90 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.2 rounded shadow-2xs whitespace-nowrap"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          id={`add-btn-${item.tmdb_id}`}
                          type="button"
                          disabled={isAdded || addingId === item.tmdb_id}
                          onClick={() => handleAdd(item)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                            isAdded
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-default"
                              : "bg-zinc-100 text-zinc-950 hover:bg-amber-400 active:scale-95"
                          }`}
                        >
                          {addingId === item.tmdb_id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Movie List with Responsive Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-amber-500">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm text-zinc-400">Loading your watchlist...</p>
          </div>
        ) : (
          <div id="movie-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {(tab === "towatch" ? displayMovies : displayWatched).length === 0 ? (
              <div
                id="empty-state"
                className="col-span-full py-16 flex flex-col items-center justify-center text-center px-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-600">
                  <Film className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-zinc-300 mb-1">
                  {selectedGenre || selectedPlatform
                    ? "No matching titles found"
                    : tab === "towatch"
                    ? "Your watchlist is empty"
                    : "No watched titles yet"}
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm">
                  {selectedGenre || selectedPlatform
                    ? "Try adjusting or resetting your active OTT and Genre filters above."
                    : tab === "towatch"
                    ? "Search for any movie or TV show above to build your personal bucket list."
                    : "When you finish watching a title, tap 'Mark as Watched' to review and rate it!"}
                </p>
              </div>
            ) : (
              (tab === "towatch" ? displayMovies : displayWatched).map((item) => {
                const poster = getPosterUrl(item.poster_path);
                const isTv = isItemTv(item);
                const progressData = tvProgressMap[item.tmdb_id];
                const watchedEpCount = progressData?.watchedEpisodes?.length || 0;
                const totalEpCount = progressData?.totalEpisodes;
                const progressPercent =
                  totalEpCount && totalEpCount > 0
                    ? Math.min(100, Math.round((watchedEpCount / totalEpCount) * 100))
                    : watchedEpCount > 0
                    ? 25
                    : 0;

                return (
                  <div
                    key={item.id}
                    id={`movie-card-${item.id}`}
                    onClick={() => setDetailMovie(item)}
                    className="group bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800/80 hover:border-amber-500/35 rounded-2xl p-3.5 sm:p-4 flex gap-3.5 sm:gap-4 transition-all duration-200 shadow-sm hover:shadow-xl cursor-pointer relative"
                  >
                    {/* Big Prominent Thumbnail */}
                    <div className="relative w-22 sm:w-26 md:w-28 h-34 sm:h-38 md:h-40 rounded-xl overflow-hidden bg-zinc-800 shrink-0 shadow-md border border-zinc-800/80">
                      <img
                        src={poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=60"}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-105 transition-all duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        {/* Header: Title & Delete */}
                        <div className="flex items-start justify-between gap-1.5">
                          <h3
                            className="text-sm sm:text-base font-bold text-zinc-100 line-clamp-1 group-hover:text-amber-400 transition-colors"
                            title={item.title}
                          >
                            {item.title}
                          </h3>
                          <button
                            id={`delete-btn-${item.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 p-1 -mr-1 rounded-lg transition-colors shrink-0"
                            title="Delete title"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Metadata Tag Row (Amber/Zinc) */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span
                            className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                              isTv
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : "bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                            }`}
                          >
                            {isTv ? "TV Series" : "Movie"}
                          </span>
                          {item.release_year && (
                            <span className="text-xs text-zinc-400 font-medium">
                              {item.release_year}
                            </span>
                          )}
                        </div>

                        {/* Clean Text-Only OTT Platforms (No Icons) */}
                        {(item.platforms || []).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {item.platforms.map((p) => (
                              <span
                                key={p}
                                className="text-[10px] sm:text-[11px] font-medium text-amber-300/90 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Bottom Action / Episode Tracker / Rating */}
                      <div className="mt-3 pt-2.5 border-t border-zinc-800/70">
                        {!item.watched ? (
                          isTv ? (
                            /* Premium Amber TV Episode Tracker Widget */
                            <button
                              id={`track-episodes-btn-${item.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTvDrawerMovie({ ...item, media_type: "tv" });
                              }}
                              className="w-full text-left bg-zinc-950/90 hover:bg-zinc-950 border border-zinc-800/90 hover:border-amber-500/40 p-2 sm:p-2.5 rounded-xl transition-all duration-200 group/tracker active:scale-[0.99] shadow-sm"
                            >
                              <div className="flex items-center justify-between gap-1 mb-1.5">
                                <div className="flex items-center gap-1.5 text-zinc-200 text-xs font-semibold group-hover/tracker:text-amber-400 transition-colors whitespace-nowrap min-w-0">
                                  <ListOrdered className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span className="truncate">Track Episodes</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[11px] font-medium text-zinc-300 whitespace-nowrap">
                                    {watchedEpCount}{totalEpCount ? `/${totalEpCount}` : ""} Ep
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded whitespace-nowrap ${
                                      progressPercent === 100
                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                        : progressPercent > 0
                                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                        : "bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                                    }`}
                                  >
                                    {progressPercent}%
                                  </span>
                                </div>
                              </div>

                              {/* Progress Track with Amber Glow */}
                              <div className="w-full bg-zinc-800/90 h-1.5 sm:h-2 rounded-full overflow-hidden p-[1px]">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    progressPercent === 100
                                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                                      : progressPercent > 0
                                      ? "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 shadow-[0_0_8px_rgba(245,158,11,0.35)]"
                                      : "bg-transparent"
                                  }`}
                                  style={{ width: `${Math.max(progressPercent, 0)}%` }}
                                />
                              </div>
                            </button>
                          ) : (
                            <button
                              id={`mark-watched-btn-${item.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setWatchedModalMovie(item);
                                setUserRating(5);
                              }}
                              className="w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-amber-400 text-zinc-950 py-2 sm:py-2.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-98 shadow-sm"
                            >
                              <Check className="w-4 h-4 stroke-[2.5] shrink-0" />
                              <span className="whitespace-nowrap">Mark as Watched</span>
                            </button>
                          )
                        ) : (
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <div className="flex items-center gap-1">
                              <StarRating
                                value={item.rating || 0}
                                readOnly={true}
                                size="xs"
                                allowHalf={true}
                                showValueText={true}
                              />
                            </div>
                            {isTv ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTvDrawerMovie({ ...item, media_type: "tv" });
                                }}
                                className="text-[11px] text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                              >
                                <Tv className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>{watchedEpCount}{totalEpCount ? `/${totalEpCount}` : ""} Ep</span>
                              </button>
                            ) : item.watched_date ? (
                              <span className="text-xs text-zinc-500 truncate max-w-[110px] whitespace-nowrap">
                                {item.watched_date}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Floating Bottom Nav */}
        <div id="floating-navigation" className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-40">
          <div className="flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 p-1.5 rounded-2xl shadow-2xl max-w-sm w-full">
            <button
              id="nav-tab-towatch"
              type="button"
              onClick={() => setTab("towatch")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                tab === "towatch"
                  ? "bg-zinc-100 text-zinc-950 shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Film className="w-4 h-4" />
              <span>To Watch ({movies.length})</span>
            </button>

            <button
              id="nav-tab-watched"
              type="button"
              onClick={() => setTab("watched")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                tab === "watched"
                  ? "bg-zinc-100 text-zinc-950 shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Watched ({watched.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mark Watched Modal */}
      {/* Rate & Mark Watched Modal / Bottom Sheet */}
      {watchedModalMovie && (
        <div
          id="mark-watched-modal-backdrop"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 transition-opacity duration-200"
          onClick={() => setWatchedModalMovie(null)}
        >
          <div
            id="mark-watched-modal"
            className="w-full max-w-md mx-auto bg-zinc-950 sm:bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-6 text-center shadow-2xl relative animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-100">Rate & Mark Watched</h3>
            <p className="text-sm text-zinc-400 mt-1 mb-6 font-medium truncate">
              {watchedModalMovie.title}
            </p>

            <div className="flex flex-col items-center justify-center gap-3 mb-6">
              <StarRating
                value={userRating}
                onChange={setUserRating}
                size="xl"
                allowHalf={true}
                showValueText={true}
              />

              {/* Quick Half-Star Rating Chips */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
                {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setUserRating(val)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      userRating === val
                        ? "bg-amber-500 text-zinc-950 font-bold shadow-sm scale-105"
                        : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
                    }`}
                  >
                    {val}★
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                id="save-rating-btn"
                type="button"
                onClick={handleSaveWatched}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm transition-colors shadow-md shadow-amber-500/20"
              >
                Save to Watched ({userRating}★)
              </button>
              <button
                type="button"
                onClick={() => setWatchedModalMovie(null)}
                className="w-full py-2 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movie & TV Details Bottom Drawer */}
      {detailMovie && (
        <div
          id="detail-modal-backdrop"
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col justify-end transition-opacity duration-200"
          onClick={() => setDetailMovie(null)}
        >
          <div
            id="detail-modal"
            className="w-full max-w-xl mx-auto bg-zinc-950 border-t border-x border-zinc-800/80 rounded-t-3xl max-h-[90vh] h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Scrollable Drawer Content */}
            <div className="flex-1 overflow-y-auto relative">
              {/* Backdrop Header - Fully seamlessly blended from top to bottom */}
              {detailExtra?.backdropPath && (
                <div className="relative h-44 sm:h-56 w-full overflow-hidden bg-zinc-950 shrink-0">
                  <img
                    src={getBackdropUrl(detailExtra.backdropPath) || ""}
                    alt={detailMovie.title}
                    className="w-full h-full object-cover opacity-75"
                    referrerPolicy="no-referrer"
                  />
                  {/* Seamless Multi-Stop Gradients: blends top rounded edge, sides, and bottom seamlessly into zinc-950 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/30" />
                  <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/70 via-transparent to-zinc-950" />
                </div>
              )}

              {/* Floating Top Drag Handle & Close Button Overlay */}
              <div className="absolute top-0 inset-x-0 pt-2.5 pb-2 px-4 flex items-center justify-between pointer-events-none z-30">
                <div className="w-8" />
                <div className="w-12 h-1.5 bg-white/40 hover:bg-white/60 backdrop-blur-md rounded-full pointer-events-auto cursor-pointer transition-colors shadow-sm" />
                <button
                  id="close-detail-modal-btn"
                  type="button"
                  onClick={() => setDetailMovie(null)}
                  className="p-1.5 rounded-full bg-zinc-950/80 hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-700/60 backdrop-blur-md transition-colors pointer-events-auto shadow-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className={`p-4 sm:p-6 ${detailExtra?.backdropPath ? "-mt-16 sm:-mt-20 relative z-10" : "pt-8 relative z-10"}`}>
                {/* Header Info */}
                <div className="flex gap-3.5 sm:gap-4 items-start mb-4">
                  <img
                    src={getPosterUrl(detailMovie.poster_path) || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=60"}
                    alt={detailMovie.title}
                    className="w-18 sm:w-24 h-26 sm:h-36 object-cover rounded-xl bg-zinc-800 shadow-xl border border-zinc-800 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          isItemTv(detailMovie)
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                        }`}
                      >
                        {isItemTv(detailMovie) ? "TV Series" : "Movie"}
                      </span>
                      {detailMovie.release_year && (
                        <span className="text-xs text-zinc-400 font-medium">
                          {detailMovie.release_year}
                        </span>
                      )}
                      {detailExtra?.runtime && (
                        <span className="text-xs text-zinc-400 font-medium">
                          • {detailExtra.runtime}
                        </span>
                      )}
                    </div>

                    <h2 className="text-base sm:text-xl font-bold text-zinc-100 leading-tight">
                      {detailMovie.title}
                    </h2>

                    {/* Rating */}
                    {detailExtra?.voteAverage && detailExtra.voteAverage > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-bold text-amber-400">
                          {detailExtra.voteAverage} / 10
                        </span>
                        {detailExtra.voteCount && (
                          <span className="text-[11px] text-zinc-500">
                            ({detailExtra.voteCount.toLocaleString()} votes)
                          </span>
                        )}
                      </div>
                    )}

                    {"watched" in detailMovie && detailMovie.watched && (
                      <div className="flex items-center gap-1.5 mt-2 text-emerald-400 text-xs font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span>Watched {detailMovie.rating ? `(${detailMovie.rating}★)` : ""}</span>
                      </div>
                    )}

                    {/* Open TV Seasons & Episode Drawer button */}
                    {isItemTv(detailMovie) && (
                      <button
                        id="detail-open-episode-drawer-btn"
                        type="button"
                        onClick={() => {
                          const target = { ...detailMovie, media_type: "tv" as const };
                          setDetailMovie(null);
                          setActiveTvDrawerMovie(target);
                        }}
                        className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors active:scale-98 shadow-sm"
                      >
                        <Tv className="w-3.5 h-3.5 text-amber-400" />
                        <span>Track Seasons & Episodes Drawer →</span>
                      </button>
                    )}
                  </div>
                </div>

                {detailExtraLoading ? (
                  <div className="flex items-center justify-center py-8 text-amber-500 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-xs text-zinc-400">Loading details...</span>
                  </div>
                ) : (
                  <div className="space-y-4 pr-1 pb-6">
                    {/* Tagline */}
                    {detailExtra?.tagline && (
                      <p className="text-xs text-amber-400/90 italic border-l-2 border-amber-500/50 pl-3">
                        "{detailExtra.tagline}"
                      </p>
                    )}

                    {/* Synopsis */}
                    <div>
                      <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        Synopsis
                      </h4>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {detailExtra?.overview ||
                          (detailMovie && "overview" in detailMovie ? detailMovie.overview : null) ||
                          "No synopsis available for this title."}
                      </p>
                    </div>

                    {/* Director & Cast */}
                    {(detailExtra?.director || (detailExtra?.cast && detailExtra.cast.length > 0)) && (
                      <div className="space-y-2">
                        {detailExtra.director && (
                          <div>
                            <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                              Director / Creator
                            </h4>
                            <span className="inline-block text-xs text-zinc-200 bg-zinc-800/80 px-2.5 py-1 rounded-md">
                              {detailExtra.director}
                            </span>
                          </div>
                        )}

                        {detailExtra.cast && detailExtra.cast.length > 0 && (
                          <div>
                            <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                              Cast
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {detailExtra.cast.map((actor) => (
                                <span
                                  key={actor}
                                  className="text-[11px] text-zinc-300 bg-zinc-800/70 px-2 py-0.5 rounded-md"
                                >
                                  {actor}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Genres */}
                    {detailMovie.genres && detailMovie.genres.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                          Genres
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {detailMovie.genres.map((g) => (
                            <span
                              key={g}
                              className="text-xs text-zinc-300 bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-700/50"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stream On Platforms */}
                    {detailMovie.platforms && detailMovie.platforms.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Tv className="w-3.5 h-3.5" />
                          <span>Available to Stream On</span>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {detailMovie.platforms.map((p) => (
                            <OttBadge key={p} platform={p} size="md" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Watch Official Trailer Button */}
                    {detailExtra?.trailerKey && (
                      <div className="pt-2">
                        <a
                          id="watch-trailer-btn"
                          href={`https://www.youtube.com/watch?v=${detailExtra.trailerKey}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-600/30 text-red-400 text-xs font-bold transition-colors w-full justify-center"
                        >
                          <PlayCircle className="w-4 h-4 text-red-500" />
                          <span>Watch Official Trailer on YouTube</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Genre Dropdown Picker Modal */}
      {genreModalOpen && (
        <div
          id="genre-modal-backdrop"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setGenreModalOpen(false)}
        >
          <div
            id="genre-modal"
            className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <h3 className="text-sm font-bold text-zinc-100">Filter by Genre</h3>
              <button
                type="button"
                onClick={() => setGenreModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-1 pr-1 flex-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedGenre(null);
                  setGenreModalOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  selectedGenre === null
                    ? "bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30"
                    : "text-zinc-300 hover:bg-zinc-800/60"
                }`}
              >
                <span>All Genres</span>
                {selectedGenre === null && <Check className="w-4 h-4 text-amber-400" />}
              </button>

              {allGenres.map((g) => {
                const isSelected = selectedGenre === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setSelectedGenre(g);
                      setGenreModalOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30"
                        : "text-zinc-300 hover:bg-zinc-800/60"
                    }`}
                  >
                    <span>{g}</span>
                    {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TV Series Episode & Season Drawer */}
      <EpisodeDrawer
        movie={activeTvDrawerMovie}
        isOpen={Boolean(activeTvDrawerMovie)}
        onClose={() => setActiveTvDrawerMovie(null)}
        onMarkSeriesWatched={handleMarkSeriesWatched}
        onProgressUpdated={handleTvProgressUpdated}
        onRatingUpdated={handleRatingUpdated}
      />
    </div>
  );
}
