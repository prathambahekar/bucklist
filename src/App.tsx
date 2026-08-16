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
  Edit3,
  LayoutGrid,
  LayoutList,
  List,
  Sparkles,
  Clapperboard,
  FileJson,
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  Settings,
} from "lucide-react";
import {
  getLocalWatchlist,
  saveLocalWatchlist,
  getLocalTvProgress,
  getSeriesSeasonRatings,
  getLocalWatchedViewMode,
  saveLocalWatchedViewMode,
  getLocalToWatchViewMode,
  saveLocalToWatchViewMode,
  getLocalTimelinePeriod,
  saveLocalTimelinePeriod,
  ViewMode,
  WatchedViewMode,
  ToWatchViewMode,
  TimelinePeriod,
  getLocalWatchedCategory,
  saveLocalWatchedCategory,
  WatchedCategory,
  TvProgressMap,
} from "./lib/storage";
import {
  searchMovies,
  getPosterUrl,
  getBackdropUrl,
  getTmdbApiKey,
  detectMediaType,
  normalizePlatformsList,
} from "./lib/api";
import { EpisodeDrawer } from "./components/EpisodeDrawer";
import { StarRating } from "./components/StarRating";
import { OttBadge, OttIcon } from "./components/OttBadge";
import { DatePickerPopover } from "./components/DatePickerPopover";
import { SettingsView } from "./components/SettingsView";
import { WatchedTimelineView } from "./components/WatchedTimelineView";
import { SearchAddDrawer } from "./components/SearchAddDrawer";
import type {
  WatchlistMovie,
  SearchResult,
  MovieDetailExtra,
  TabType,
} from "./types";

function getLocalTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

  // Search & Add Drawer state
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);

  // Modal states
  const [watchedModalMovie, setWatchedModalMovie] = useState<WatchlistMovie | null>(null);
  const [userRating, setUserRating] = useState<number>(5);
  const [userWatchedDate, setUserWatchedDate] = useState<string>(() =>
    getLocalTodayString()
  );
  const [detailMovie, setDetailMovie] = useState<WatchlistMovie | SearchResult | null>(null);
  const [genreModalOpen, setGenreModalOpen] = useState(false);
  const [detailExtraLoading, setDetailExtraLoading] = useState(false);
  const [detailExtra, setDetailExtra] = useState<MovieDetailExtra | null>(null);

  // Filter & Sort
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [sortBy] = useState<"newest" | "rating" | "release">("newest");
  const [toWatchViewMode, setToWatchViewMode] = useState<ToWatchViewMode>(() =>
    getLocalToWatchViewMode()
  );
  const [watchedViewMode, setWatchedViewMode] = useState<WatchedViewMode>(() =>
    getLocalWatchedViewMode()
  );
  const [timelinePeriod, setTimelinePeriod] = useState<TimelinePeriod>(() =>
    getLocalTimelinePeriod()
  );
  const [watchedCategory, setWatchedCategory] = useState<WatchedCategory>(() =>
    getLocalWatchedCategory()
  );

  const handleSetToWatchViewMode = useCallback((mode: ToWatchViewMode) => {
    setToWatchViewMode(mode);
    saveLocalToWatchViewMode(mode);
  }, []);

  const handleSetWatchedViewMode = useCallback((mode: WatchedViewMode) => {
    setWatchedViewMode(mode);
    saveLocalWatchedViewMode(mode);
  }, []);

  const handleSetTimelinePeriod = useCallback((period: TimelinePeriod) => {
    setTimelinePeriod(period);
    saveLocalTimelinePeriod(period);
  }, []);

  const handleSetWatchedCategory = useCallback((cat: WatchedCategory) => {
    setWatchedCategory(cat);
    saveLocalWatchedCategory(cat);
  }, []);

  // Load TV progress
  useEffect(() => {
    setTvProgressMap(getLocalTvProgress());
  }, []);

  const isItemAnime = useCallback(
    (item: WatchlistMovie | SearchResult | null | undefined): boolean => {
      if (!item) return false;
      const genres = item.genres || [];
      const hasAnimationGenre = genres.some(
        (g) =>
          g.toLowerCase().includes("animation") ||
          g.toLowerCase().includes("anime")
      );
      const platforms = item.platforms || [];
      const onCrunchyroll = platforms.some((p) =>
        p.toLowerCase().includes("crunchyroll")
      );
      const titleLower = (item.title || "").toLowerCase();
      const animeKeywords = [
        "anime",
        "naruto",
        "bleach",
        "one piece",
        "attack on titan",
        "shingeki",
        "jujutsu kaisen",
        "demon slayer",
        "kimetsu",
        "dragon ball",
        "death note",
        "my hero academia",
        "boku no hero",
        "chainsaw man",
        "hunter x hunter",
        "solo leveling",
        "fullmetal alchemist",
        "vinland saga",
        "spy x family",
        "tokyo ghoul",
        "steins;gate",
        "sword art online",
        "evangelion",
        "haikyuu",
        "frieren",
        "dandadan",
        "spirited away",
        "princess mononoke",
        "your name",
        "suzume",
        "weathering with you",
      ];
      const matchAnimeTitle = animeKeywords.some((k) => titleLower.includes(k));
      return (hasAnimationGenre && (onCrunchyroll || matchAnimeTitle)) || (hasAnimationGenre && item.media_type === "tv") || onCrunchyroll || matchAnimeTitle;
    },
    []
  );

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
      const all = getLocalWatchlist();

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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
    await handleAddToWatchlist(item);
  }

  const handleAddToWatchlist = useCallback(async (item: SearchResult) => {
    setAddingId(item.tmdb_id);
    const newRecord: WatchlistMovie = {
      id: "wl_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
      tmdb_id: item.tmdb_id,
      title: item.title,
      poster_path: item.poster_path,
      release_year: item.release_year,
      media_type: item.media_type,
      genres: item.genres || [],
      platforms: normalizePlatformsList(item.platforms || []),
      watched: false,
      watched_date: null,
      rating: null,
      created_at: new Date().toISOString(),
    };

    const current = getLocalWatchlist();
    if (!current.some((m) => m.tmdb_id === item.tmdb_id)) {
      const updated = [newRecord, ...current];
      saveLocalWatchlist(updated);
      setMovies((prev) => [newRecord, ...prev]);
    }
    setAddingId(null);
  }, []);

  const handleOpenWatchedModal = useCallback(
    (movie: WatchlistMovie, defaultRating?: number) => {
      setWatchedModalMovie(movie);
      setUserRating(defaultRating ?? movie.rating ?? 5);
      setUserWatchedDate(movie.watched_date || getLocalTodayString());
    },
    []
  );

  const handleAddToWatched = useCallback(
    (item: SearchResult) => {
      const existingInMovies = movies.find((m) => m.tmdb_id === item.tmdb_id);
      const existingInWatched = watched.find((m) => m.tmdb_id === item.tmdb_id);
      const existing = existingInMovies || existingInWatched;

      if (existing) {
        handleOpenWatchedModal(existing, existing.rating ?? 5);
      } else {
        const todayDate = getLocalTodayString();
        const newRecord: WatchlistMovie = {
          id: "wl_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
          tmdb_id: item.tmdb_id,
          title: item.title,
          poster_path: item.poster_path,
          release_year: item.release_year,
          media_type: item.media_type,
          genres: item.genres || [],
          platforms: normalizePlatformsList(item.platforms || []),
          watched: false,
          watched_date: todayDate,
          rating: 5,
          created_at: new Date().toISOString(),
        };
        handleOpenWatchedModal(newRecord, 5);
      }
    },
    [movies, watched, handleOpenWatchedModal]
  );

  async function handleSaveWatched() {
    if (!watchedModalMovie) return;
    const watchedDate = userWatchedDate || watchedModalMovie.watched_date || getLocalTodayString();

    const updatedMovie: WatchlistMovie = {
      ...watchedModalMovie,
      watched: true,
      watched_date: watchedDate,
      rating: userRating,
    };

    setMovies((prev) => prev.filter((m) => m.tmdb_id !== watchedModalMovie.tmdb_id));
    setWatched((prev) => [
      updatedMovie,
      ...prev.filter((m) => m.tmdb_id !== watchedModalMovie.tmdb_id),
    ]);

    setWatchedModalMovie(null);

    // Save to local storage
    const current = getLocalWatchlist();
    const filtered = current.filter((m) => m.tmdb_id !== watchedModalMovie.tmdb_id);
    const updatedList = [updatedMovie, ...filtered];
    saveLocalWatchlist(updatedList);
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
          (r): r is number => typeof r === "number" && r > 0
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
      }
    } else if (totalCount > 0 && watchedCount < totalCount) {
      // Revert if user unchecks an episode from 100%
      const targetWatched = watched.find((m) => m.tmdb_id === tmdbId);
      if (targetWatched && targetWatched.watched) {
        const unwatchedMovie: WatchlistMovie = {
          ...targetWatched,
          watched: false,
          watched_date: null,
        };

        setWatched((prev) => prev.filter((m) => m.tmdb_id !== tmdbId));
        setMovies((prev) => [unwatchedMovie, ...prev.filter((m) => m.tmdb_id !== tmdbId)]);

        const current = getLocalWatchlist();
        const updatedList = current.map((m) => (m.tmdb_id === tmdbId ? unwatchedMovie : m));
        saveLocalWatchlist(updatedList);
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
  }

  async function handleDelete(id: string) {
    setMovies((prev) => prev.filter((m) => m.id !== id));
    setWatched((prev) => prev.filter((m) => m.id !== id));

    const current = getLocalWatchlist();
    saveLocalWatchlist(current.filter((m) => m.id !== id));
  }

  const handleMoveToWatchlist = useCallback((item: WatchlistMovie) => {
    const unwatchedMovie: WatchlistMovie = {
      ...item,
      watched: false,
      watched_date: null,
    };
    setWatched((prev) => prev.filter((m) => m.id !== item.id));
    setMovies((prev) => [unwatchedMovie, ...prev.filter((m) => m.id !== item.id)]);

    const current = getLocalWatchlist();
    const updatedList = current.map((m) => (m.id === item.id ? unwatchedMovie : m));
    saveLocalWatchlist(updatedList);
  }, []);

  const handleUpdateWatchedDate = useCallback((item: WatchlistMovie, newDate: string) => {
    const updatedMovie: WatchlistMovie = {
      ...item,
      watched_date: newDate,
    };
    setWatched((prev) => prev.map((m) => (m.id === item.id ? updatedMovie : m)));
    const current = getLocalWatchlist();
    const updatedList = current.map((m) => (m.id === item.id ? updatedMovie : m));
    saveLocalWatchlist(updatedList);
  }, []);

  const existingTmdbIds = useMemo(
    () => new Set<number>([...movies.map((m) => m.tmdb_id), ...watched.map((m) => m.tmdb_id)]),
    [movies, watched]
  );

  const existingWatchlistIds = useMemo(
    () => new Set<number>(movies.map((m) => m.tmdb_id)),
    [movies]
  );

  const existingWatchedIds = useMemo(
    () => new Set<number>(watched.map((m) => m.tmdb_id)),
    [watched]
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
  
  const processedWatchedAll = useMemo(() => processList(watched), [watched, processList]);

  // Watched category counts
  const watchedCounts = useMemo(() => {
    let moviesCount = 0;
    let seriesCount = 0;
    let animeCount = 0;

    processedWatchedAll.forEach((item) => {
      const isAnime = isItemAnime(item);
      const isTv = isItemTv(item);

      if (isAnime) {
        animeCount++;
      } else if (isTv) {
        seriesCount++;
      } else {
        moviesCount++;
      }
    });

    return {
      all: processedWatchedAll.length,
      movies: moviesCount,
      series: seriesCount,
      anime: animeCount,
    };
  }, [processedWatchedAll, isItemAnime, isItemTv]);

  // Final display list for watched tab based on selected category tab
  const displayWatched = useMemo(() => {
    if (watchedCategory === "all") return processedWatchedAll;
    if (watchedCategory === "anime") {
      return processedWatchedAll.filter((item) => isItemAnime(item));
    }
    if (watchedCategory === "series") {
      return processedWatchedAll.filter((item) => !isItemAnime(item) && isItemTv(item));
    }
    if (watchedCategory === "movies") {
      return processedWatchedAll.filter((item) => !isItemAnime(item) && !isItemTv(item));
    }
    return processedWatchedAll;
  }, [processedWatchedAll, watchedCategory, isItemAnime, isItemTv]);

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

          {/* Top Badges & Actions */}
          <div id="header-stats" className="flex items-center gap-1.5 sm:gap-2">
            <button
              id="open-settings-page-btn"
              type="button"
              onClick={() => setTab(tab === "settings" ? "towatch" : "settings")}
              className={`flex items-center justify-center gap-1.5 h-7 sm:h-8 px-2 sm:px-3 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-sm border ${
                tab === "settings"
                  ? "bg-amber-500 text-zinc-950 border-amber-500 font-bold shadow-amber-500/20"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-700"
              }`}
              title="Settings & Data Management"
            >
              <Settings className={`w-3.5 h-3.5 shrink-0 ${tab === "settings" ? "text-zinc-950" : "text-amber-400"}`} />
              <span className="hidden sm:inline">Settings</span>
            </button>

            <div
              id="stat-to-watch"
              className="flex items-center justify-center gap-1 sm:gap-1.5 h-7 sm:h-8 bg-zinc-900 border border-zinc-800/80 px-2 sm:px-3 rounded-full text-xs font-semibold text-zinc-200"
              title={`${movies.length} To Watch`}
            >
              <Film className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>{movies.length}</span>
              <span className="hidden sm:inline">To Watch</span>
            </div>
            <div
              id="stat-watched"
              className="flex items-center justify-center gap-1 sm:gap-1.5 h-7 sm:h-8 bg-zinc-900 border border-zinc-800/80 px-2 sm:px-3 rounded-full text-xs font-semibold text-zinc-200"
              title={`${watched.length} Watched`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{watched.length}</span>
              <span className="hidden sm:inline">Watched</span>
            </div>
          </div>
        </header>

        {tab === "settings" ? (
          <SettingsView
            onDataUpdated={() => {
              fetchAll();
              setTvProgressMap(getLocalTvProgress());
            }}
            onNavigateToWatchlist={() => setTab("towatch")}
          />
        ) : (
          <>
            {/* Section Header & View Options Toolbar */}
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-zinc-200">
                  {tab === "watched" ? "Watched" : "Watchlist"}
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                  {tab === "watched" ? displayWatched.length : displayMovies.length}
                </span>

                {/* Filter Toggle Button */}
                <button
                  id="filter-toggle-btn"
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    showFilters || selectedGenre || selectedPlatform
                      ? "bg-amber-500/15 border-amber-500/50 text-amber-400"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  }`}
                  title="Filter by OTT & Genre"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Filters</span>
                  {(selectedGenre || selectedPlatform) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                </button>
              </div>

              {/* View mode switcher available on both To Watch & Watched tabs */}
              <div
                id={`${tab}-view-switcher`}
                className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800/80 p-0.5 rounded-xl"
              >
                <button
                  type="button"
                  id="view-opt-detailed"
                  onClick={() =>
                    tab === "towatch"
                      ? handleSetToWatchViewMode("detailed")
                      : handleSetWatchedViewMode("detailed")
                  }
                  className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    (tab === "towatch" ? toWatchViewMode : watchedViewMode) === "detailed"
                      ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  }`}
                  title="Detailed Cards"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Detailed</span>
                </button>

                <button
                  type="button"
                  id="view-opt-compact"
                  onClick={() =>
                    tab === "towatch"
                      ? handleSetToWatchViewMode("compact")
                      : handleSetWatchedViewMode("compact")
                  }
                  className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    (tab === "towatch" ? toWatchViewMode : watchedViewMode) === "compact"
                      ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  }`}
                  title="Compact Cards"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Compact</span>
                </button>

                <button
                  type="button"
                  id="view-opt-grid"
                  onClick={() =>
                    tab === "towatch"
                      ? handleSetToWatchViewMode("grid")
                      : handleSetWatchedViewMode("grid")
                  }
                  className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    (tab === "towatch" ? toWatchViewMode : watchedViewMode) === "grid"
                      ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  }`}
                  title="Poster Grid"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Grid</span>
                </button>

                {tab === "watched" && (
                  <button
                    type="button"
                    id="view-opt-timeline"
                    onClick={() => handleSetWatchedViewMode("timeline")}
                    className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      watchedViewMode === "timeline"
                        ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                    }`}
                    title="Timeline View"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Timeline</span>
                  </button>
                )}
              </div>
            </div>

            {/* Integrated Filter Strip when toggled or active */}
            {(showFilters || selectedGenre || selectedPlatform) && (
              <div id="filter-strip" className="mb-4 p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
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
                      className="text-xs text-amber-400 hover:underline font-medium cursor-pointer"
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
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border cursor-pointer ${
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
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border cursor-pointer ${
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
                      className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border cursor-pointer ${
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

        {/* Watched Section Sub-Tabs: All / Movies / Series / Animes */}
        {tab === "watched" && (
          <div
            id="watched-category-tabs"
            className="flex items-center gap-1.5 pb-1 mb-3 overflow-x-auto scrollbar-none"
          >
            <button
              type="button"
              id="watched-tab-all"
              onClick={() => handleSetWatchedCategory("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                watchedCategory === "all"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                  : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
              }`}
            >
              <span>All</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  watchedCategory === "all"
                    ? "bg-zinc-950/25 text-zinc-950"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {watchedCounts.all}
              </span>
            </button>

            <button
              type="button"
              id="watched-tab-movies"
              onClick={() => handleSetWatchedCategory("movies")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                watchedCategory === "movies"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                  : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Movies</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  watchedCategory === "movies"
                    ? "bg-zinc-950/25 text-zinc-950"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {watchedCounts.movies}
              </span>
            </button>

            <button
              type="button"
              id="watched-tab-series"
              onClick={() => handleSetWatchedCategory("series")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                watchedCategory === "series"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                  : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Series</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  watchedCategory === "series"
                    ? "bg-zinc-950/25 text-zinc-950"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {watchedCounts.series}
              </span>
            </button>

            <button
              type="button"
              id="watched-tab-anime"
              onClick={() => handleSetWatchedCategory("anime")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                watchedCategory === "anime"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                  : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Anime</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  watchedCategory === "anime"
                    ? "bg-zinc-950/25 text-zinc-950"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {watchedCounts.anime}
              </span>
            </button>
          </div>
        )}

        {/* Main Movie List or Timeline View */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-amber-500">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm text-zinc-400">Loading your watchlist...</p>
          </div>
        ) : tab === "watched" && watchedViewMode === "timeline" ? (
          <WatchedTimelineView
            items={displayWatched}
            timelinePeriod={timelinePeriod}
            onPeriodChange={handleSetTimelinePeriod}
            onItemClick={(item) => setDetailMovie(item)}
            onRateClick={(item, rating) => handleOpenWatchedModal(item, rating)}
            onDeleteClick={handleDelete}
            onMoveToWatchlistClick={handleMoveToWatchlist}
            onUpdateWatchedDate={handleUpdateWatchedDate}
            onOpenTvDrawer={(item) => setActiveTvDrawerMovie({ ...item, media_type: "tv" })}
            tvProgressMap={tvProgressMap}
          />
        ) : (
          <div
            id="movie-grid"
            className={`grid gap-3 sm:gap-4 ${
              (tab === "towatch" ? toWatchViewMode : watchedViewMode) === "detailed"
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5"
                : (tab === "towatch" ? toWatchViewMode : watchedViewMode) === "compact"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5"
                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
            }`}
          >
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
                    : watchedCategory === "movies"
                    ? "No watched movies yet"
                    : watchedCategory === "series"
                    ? "No watched series yet"
                    : watchedCategory === "anime"
                    ? "No watched animes yet"
                    : "No watched titles yet"}
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm">
                  {selectedGenre || selectedPlatform
                    ? "Try adjusting or resetting your active OTT and Genre filters above."
                    : tab === "towatch"
                    ? "Search for any movie or TV show above to build your personal bucket list."
                    : watchedCategory === "movies"
                    ? "Movies you mark as watched will be organized here."
                    : watchedCategory === "series"
                    ? "TV shows & series you mark as watched will appear here."
                    : watchedCategory === "anime"
                    ? "Anime series & films you mark as watched will appear here."
                    : "When you finish watching a title, tap 'Mark as Watched' to review and rate it!"}
                </p>
              </div>
            ) : (
              (tab === "towatch" ? displayMovies : displayWatched).map((item) => {
                const poster = getPosterUrl(item.poster_path);
                const isTv = isItemTv(item);
                const isWatchedTab = tab === "watched";
                const progressData = tvProgressMap[item.tmdb_id];
                const watchedEpCount = progressData?.watchedEpisodes?.length || 0;
                const totalEpCount = progressData?.totalEpisodes;
                const progressPercent =
                  totalEpCount && totalEpCount > 0
                    ? Math.min(100, Math.round((watchedEpCount / totalEpCount) * 100))
                    : watchedEpCount > 0
                    ? 25
                    : 0;

                const activeViewMode = tab === "towatch" ? toWatchViewMode : watchedViewMode;

                /* OPTION 1: Poster Grid View Mode (Both To Watch & Watched) */
                if (activeViewMode === "grid") {
                  return (
                    <div
                      key={item.id}
                      id={`movie-card-${item.id}`}
                      onClick={() => setDetailMovie(item)}
                      className="group bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800/80 hover:border-amber-500/40 rounded-2xl p-2 sm:p-2.5 flex flex-col transition-all duration-200 shadow-sm hover:shadow-xl cursor-pointer relative"
                    >
                      {/* Poster Aspect Container */}
                      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-800 shadow-md border border-zinc-800/80">
                        <img
                          src={poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=60"}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-105 transition-all duration-300"
                          referrerPolicy="no-referrer"
                        />

                        {/* Top Left Badge: Star Rating (Watched) OR Type/Anime Badge (To Watch) */}
                        {isWatchedTab ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenWatchedModal(item, item.rating || 5);
                            }}
                            className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-zinc-950/85 backdrop-blur-md px-1.5 sm:px-2 py-0.5 rounded-lg border border-amber-500/35 text-amber-300 text-[11px] sm:text-xs font-bold shadow-md hover:bg-amber-500 hover:text-zinc-950 hover:border-amber-400 transition-colors group/rate"
                            title="Click to edit rating"
                          >
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400 group-hover/rate:fill-zinc-950 group-hover/rate:text-zinc-950 transition-colors" />
                            <span>{item.rating ? `${item.rating}★` : "Rate"}</span>
                          </button>
                        ) : (
                          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-zinc-950/85 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-amber-500/35 text-amber-300 text-[10px] font-bold shadow-md">
                            {isItemAnime(item) ? (
                              <span className="flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Anime</span>
                              </span>
                            ) : (
                              <span>{isTv ? "TV" : "Movie"}</span>
                            )}
                          </div>
                        )}

                        {/* Top Right: Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="absolute top-1.5 right-1.5 bg-zinc-950/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 p-1.5 rounded-lg border border-zinc-800/80 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-xs shadow-md"
                          title="Delete title"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>

                        {/* Bottom Overlay for Quick Actions */}
                        {isWatchedTab ? (
                          isTv && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTvDrawerMovie({ ...item, media_type: "tv" });
                              }}
                              className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between bg-zinc-950/85 backdrop-blur-md px-2 py-0.5 rounded-lg border border-amber-500/30 text-amber-300 text-[10px] font-semibold shadow-md hover:bg-amber-500 hover:text-zinc-950 transition-colors"
                            >
                              <span className="flex items-center gap-1">
                                <Tv className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                <span>TV</span>
                              </span>
                              <span>{watchedEpCount}{totalEpCount ? `/${totalEpCount}` : ""} Ep</span>
                            </button>
                          )
                        ) : isTv ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTvDrawerMovie({ ...item, media_type: "tv" });
                            }}
                            className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between bg-zinc-950/90 backdrop-blur-md px-2 py-1 rounded-lg border border-zinc-700/80 hover:border-amber-500/50 text-zinc-100 hover:text-amber-300 text-[10px] font-semibold shadow-md transition-colors group/trackbtn"
                          >
                            <span className="flex items-center gap-1">
                              <ListOrdered className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>Track Ep</span>
                            </span>
                            <span className="text-zinc-400 group-hover/trackbtn:text-amber-300">
                              {watchedEpCount}{totalEpCount ? `/${totalEpCount}` : ""} Ep
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenWatchedModal(item, 5);
                            }}
                            className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-center gap-1.5 bg-zinc-100/95 hover:bg-amber-400 text-zinc-950 backdrop-blur-md px-2 py-1 rounded-lg text-[11px] font-bold shadow-md transition-all active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Watched</span>
                          </button>
                        )}
                      </div>

                      {/* Info below Poster */}
                      <div className="mt-2 px-0.5">
                        <h3
                          className="font-bold text-xs sm:text-sm text-zinc-100 line-clamp-1 group-hover:text-amber-400 transition-colors"
                          title={item.title}
                        >
                          {item.title}
                        </h3>
                        <div className="flex items-center justify-between mt-1 text-[10px] sm:text-[11px] text-zinc-500">
                          <span>{item.release_year || (isTv ? "TV Series" : "Movie")}</span>
                          {isWatchedTab ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenWatchedModal(item, item.rating || 5);
                              }}
                              className="text-zinc-400 hover:text-amber-300 flex items-center gap-0.5 transition-colors font-medium"
                              title="Edit rating & date"
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                              <span>Edit</span>
                            </button>
                          ) : (
                            (item.platforms || []).length > 0 && (
                              <span className="text-[10px] text-amber-300 font-medium truncate max-w-[80px]">
                                {item.platforms[0]}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                /* OPTION 2 & 3: Detailed & Compact Horizontal Cards */
                const isCompact = activeViewMode === "compact";

                return (
                  <div
                    key={item.id}
                    id={`movie-card-${item.id}`}
                    onClick={() => setDetailMovie(item)}
                    className={`group bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800/80 hover:border-amber-500/35 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-xl cursor-pointer relative ${
                      isCompact
                        ? "p-3 flex gap-3"
                        : "p-3.5 sm:p-4 flex gap-3.5 sm:gap-4"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div
                      className={`relative rounded-xl overflow-hidden bg-zinc-800 shrink-0 shadow-md border border-zinc-800/80 ${
                        isCompact
                          ? "w-16 sm:w-20 h-24 sm:h-28"
                          : "w-22 sm:w-26 md:w-28 h-34 sm:h-38 md:h-40"
                      }`}
                    >
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
                            className={`font-bold text-zinc-100 line-clamp-1 group-hover:text-amber-400 transition-colors ${
                              isCompact ? "text-xs sm:text-sm" : "text-sm sm:text-base"
                            }`}
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
                            className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 p-1 -mr-1 -mt-0.5 rounded-lg transition-colors shrink-0"
                            title="Delete title"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Metadata Tag Row */}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {isItemAnime(item) ? (
                            <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>{isTv ? "Anime Series" : "Anime Movie"}</span>
                            </span>
                          ) : (
                            <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              {isTv ? "TV Series" : "Movie"}
                            </span>
                          )}
                          {item.release_year && (
                            <span className="text-[11px] text-zinc-400 font-medium">
                              {item.release_year}
                            </span>
                          )}
                          {isWatchedTab && item.watched_date && (
                            <span className="text-[10px] text-zinc-500 font-medium ml-auto hidden xs:inline">
                              {item.watched_date}
                            </span>
                          )}
                        </div>

                        {/* Clean Text-Only OTT Platforms (Shown in detailed mode or To Watch) */}
                        {!isCompact && (item.platforms || []).length > 0 && (
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
                      <div
                        className={`border-t border-zinc-800/70 ${
                          isCompact ? "mt-2 pt-1.5" : "mt-3 pt-2.5"
                        }`}
                      >
                        {!item.watched ? (
                          isTv ? (
                            /* TV Episode Tracker Button (Simplified clean layout) */
                            <button
                              id={`track-episodes-btn-${item.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTvDrawerMovie({ ...item, media_type: "tv" });
                              }}
                              className={`w-full flex items-center justify-between gap-2 bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/40 rounded-xl text-xs font-semibold text-zinc-100 transition-all duration-200 active:scale-[0.99] shadow-sm group/tracker ${
                                isCompact ? "py-1.5 px-2.5" : "py-2 sm:py-2.5 px-3"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <ListOrdered className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span className="truncate group-hover/tracker:text-amber-300 transition-colors">
                                  Track Ep
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[11px] font-medium text-zinc-400">
                                  {watchedEpCount}{totalEpCount ? `/${totalEpCount}` : ""} Ep
                                </span>
                                {progressPercent > 0 && (
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                      progressPercent === 100
                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    }`}
                                  >
                                    {progressPercent}%
                                  </span>
                                )}
                              </div>
                            </button>
                          ) : (
                            <button
                              id={`mark-watched-btn-${item.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenWatchedModal(item, 5);
                              }}
                              className={`w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-98 shadow-sm ${
                                isCompact ? "py-1.5 px-2.5" : "py-2 sm:py-2.5 px-3"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                              <span className="whitespace-nowrap">Mark as Watched</span>
                            </button>
                          )
                        ) : (
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            {/* Star Rating with quick-edit trigger */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenWatchedModal(item, item.rating || 5);
                              }}
                              className="flex items-center gap-1 hover:bg-zinc-800/80 px-1.5 py-0.5 rounded-md transition-colors group/rate"
                              title="Click to edit rating & date"
                            >
                              <StarRating
                                value={item.rating || 0}
                                readOnly={true}
                                size="xs"
                                allowHalf={true}
                                showValueText={true}
                              />
                              <Edit3 className="w-2.5 h-2.5 text-zinc-500 group-hover/rate:text-amber-400 ml-0.5 opacity-60 group-hover/rate:opacity-100 transition-all" />
                            </button>

                            <div className="flex items-center gap-1.5">
                              {isTv ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTvDrawerMovie({ ...item, media_type: "tv" });
                                  }}
                                  className="text-[10px] sm:text-[11px] text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2 py-0.5 rounded-lg font-semibold transition-colors flex items-center gap-1 shadow-2xs whitespace-nowrap"
                                >
                                  <Tv className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>{watchedEpCount}{totalEpCount ? `/${totalEpCount}` : ""} Ep</span>
                                </button>
                              ) : null}

                              {/* Edit Rating Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenWatchedModal(item, item.rating || 5);
                                }}
                                className="text-[10px] text-zinc-400 hover:text-amber-300 hover:bg-zinc-800/90 px-1.5 py-0.5 rounded-md border border-zinc-800 hover:border-amber-500/30 transition-colors flex items-center gap-1 shrink-0"
                                title="Edit rating & date"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span className="hidden xs:inline">Edit</span>
                              </button>
                            </div>
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
          </>
        )}

        {/* Floating Bottom Nav */}
        <div id="floating-navigation" className="fixed bottom-5 sm:bottom-6 left-0 right-0 flex justify-center px-4 z-40 pointer-events-none">
          <div className="flex items-center gap-1 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 p-1.5 rounded-2xl shadow-2xl max-w-sm w-full pointer-events-auto">
            <button
              id="nav-tab-towatch"
              type="button"
              onClick={() => setTab("towatch")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                tab === "towatch"
                  ? "bg-zinc-100 text-zinc-950 shadow-md font-bold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Film className="w-4 h-4 shrink-0" />
              <span>To Watch ({movies.length})</span>
            </button>

            <button
              id="nav-tab-watched"
              type="button"
              onClick={() => setTab("watched")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                tab === "watched"
                  ? "bg-zinc-100 text-zinc-950 shadow-md font-bold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 transition-opacity duration-200"
          onClick={() => setWatchedModalMovie(null)}
        >
          <div
            id="mark-watched-modal"
            className="w-full max-w-md mx-auto bg-zinc-950 sm:bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-6 text-center shadow-2xl relative animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-100">
              {watchedModalMovie.watched ? "Edit Your Rating" : "Rate & Mark Watched"}
            </h3>
            <p className="text-sm text-zinc-400 mt-1 mb-6 font-medium truncate">
              {watchedModalMovie.title}
            </p>

            <div className="flex flex-col items-center justify-center gap-3 mb-5">
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
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                      userRating === val
                        ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                        : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
                    }`}
                  >
                    {val}★
                  </button>
                ))}
              </div>
            </div>

            {/* Simple Date Selector Button / Floating Popover */}
            <div className="flex items-center justify-center mb-6">
              <DatePickerPopover
                value={userWatchedDate}
                onChange={setUserWatchedDate}
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                id="save-rating-btn"
                type="button"
                onClick={handleSaveWatched}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm transition-colors shadow-md shadow-amber-500/20 cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setWatchedModalMovie(null)}
                className="w-full py-2 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
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
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
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
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            Watched {detailMovie.rating ? `(${detailMovie.rating}★)` : ""}
                            {detailMovie.watched_date ? ` • ${detailMovie.watched_date}` : ""}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleOpenWatchedModal(detailMovie as WatchlistMovie, detailMovie.rating || 5);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/25 transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit Rating & Date</span>
                        </button>
                      </div>
                    )}

                    {"watched" in detailMovie && !detailMovie.watched && !isItemTv(detailMovie) && (
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            handleOpenWatchedModal(detailMovie as WatchlistMovie, 5);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors shadow-sm cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Mark as Watched</span>
                        </button>
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

      {/* Floating Action Button (FAB) - Elevated distinct floating button above nav bar */}
      {tab !== "settings" && (
        <button
          id="open-search-drawer-fab"
          type="button"
          onClick={() => setIsSearchDrawerOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 md:right-8 z-50 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 w-12 h-12 sm:w-auto sm:h-auto sm:px-4 sm:py-3 rounded-full shadow-2xl shadow-amber-500/30 border border-amber-400/60 font-bold text-sm tracking-tight cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 group"
          title="Search & Add to Bucklist (+)"
          aria-label="Add Movie or Series"
        >
          <div className="w-6 h-6 rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform duration-200 shrink-0">
            <Plus className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-xs sm:text-sm hidden sm:inline whitespace-nowrap pr-0.5">
            Add Title
          </span>
        </button>
      )}

      {/* Search & Add Drawer */}
      <SearchAddDrawer
        isOpen={isSearchDrawerOpen}
        onClose={() => setIsSearchDrawerOpen(false)}
        onAddToWatchlist={handleAddToWatchlist}
        onAddToWatched={handleAddToWatched}
        existingWatchlistIds={existingWatchlistIds}
        existingWatchedIds={existingWatchedIds}
        addingId={addingId}
      />
    </div>
  );
}
