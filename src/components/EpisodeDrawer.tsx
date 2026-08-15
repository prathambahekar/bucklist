import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  X,
  Tv,
  CheckCircle2,
  Circle,
  Loader2,
  Check,
  Star,
  Sparkles,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CheckCheck,
  Film,
} from "lucide-react";
import {
  fetchTvSeriesDetails,
  fetchTvSeasonEpisodes,
  getPosterUrl,
  getBackdropUrl,
  getStillUrl,
} from "../lib/api";
import {
  getSeriesWatchedEpisodes,
  updateSeriesWatchedEpisodes,
  getSeriesSeasonRatings,
  updateSeriesSeasonRating,
} from "../lib/supabase";
import { StarRating } from "./StarRating";
import type {
  WatchlistMovie,
  SearchResult,
  TvSeason,
  TvEpisode,
  TvSeriesDetails,
} from "../types";

interface EpisodeDrawerProps {
  movie: WatchlistMovie | SearchResult | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkSeriesWatched?: (movie: WatchlistMovie, rating?: number) => void;
  onProgressUpdated?: (tmdbId: number, watchedCount: number, totalCount: number) => void;
  onRatingUpdated?: (tmdbId: number, rating: number) => void;
}

export const EpisodeDrawer: React.FC<EpisodeDrawerProps> = ({
  movie,
  isOpen,
  onClose,
  onMarkSeriesWatched,
  onProgressUpdated,
  onRatingUpdated,
}) => {
  const [details, setDetails] = useState<TvSeriesDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [seasonEpisodes, setSeasonEpisodes] = useState<Record<number, TvEpisode[]>>({});
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());
  const [seasonRatings, setSeasonRatings] = useState<Record<number, number>>({});
  const [expandedEpisodeId, setExpandedEpisodeId] = useState<number | null>(null);
  const [seriesRating, setSeriesRating] = useState<number>(5);

  // Load series details & initial progress
  useEffect(() => {
    if (!isOpen || !movie) {
      setDetails(null);
      setSeasonEpisodes({});
      setLoadError(null);
      return;
    }

    // Load saved progress & season ratings from storage
    const saved = getSeriesWatchedEpisodes(movie.tmdb_id);
    setWatchedEpisodes(new Set(saved));

    const savedRatings = getSeriesSeasonRatings(movie.tmdb_id);
    setSeasonRatings(savedRatings);

    // If there are existing season ratings, pre-calculate series rating
    const ratedVals = Object.values(savedRatings).filter((r) => typeof r === "number" && r > 0);
    if (ratedVals.length > 0) {
      const avg = Math.round((ratedVals.reduce((a, b) => a + b, 0) / ratedVals.length) * 2) / 2;
      setSeriesRating(avg);
    } else if ("rating" in movie && movie.rating) {
      setSeriesRating(movie.rating);
    }

    let isMounted = true;
    setLoadingDetails(true);
    setLoadError(null);

    fetchTvSeriesDetails(movie.tmdb_id)
      .then((data) => {
        if (!isMounted) return;
        setDetails(data);
        // Default to season 1, or the first available regular season
        const regularSeasons = (data.seasons || []).filter(
          (s: TvSeason) => s.season_number > 0
        );
        const firstSeason = regularSeasons[0] || data.seasons?.[0];
        if (firstSeason) {
          setSelectedSeasonNumber(firstSeason.season_number);
        }
      })
      .catch((err) => {
        console.warn("Failed to load TV details, might be a standalone movie:", err);
        if (isMounted) {
          setLoadError("Could not find seasons/episodes for this title. It might be a standalone movie.");
        }
      })
      .finally(() => {
        if (isMounted) setLoadingDetails(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, movie]);

  // Load episodes when selected season changes
  useEffect(() => {
    if (!isOpen || !movie || selectedSeasonNumber === undefined || loadError) return;

    if (seasonEpisodes[selectedSeasonNumber] && seasonEpisodes[selectedSeasonNumber].length > 0) {
      return; // already cached
    }

    let isMounted = true;
    setLoadingEpisodes(true);

    fetchTvSeasonEpisodes(movie.tmdb_id, selectedSeasonNumber)
      .then((data) => {
        if (!isMounted) return;
        setSeasonEpisodes((prev) => ({
          ...prev,
          [selectedSeasonNumber]: data?.episodes || [],
        }));
      })
      .catch((err) => {
        console.warn(`Failed to load season ${selectedSeasonNumber} episodes:`, err);
      })
      .finally(() => {
        if (isMounted) setLoadingEpisodes(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, movie, selectedSeasonNumber, seasonEpisodes, loadError]);

  // Regular seasons (ignoring Specials season 0 unless it's the only one)
  const regularSeasons = useMemo(() => {
    if (!details?.seasons) return [];
    const valid = details.seasons.filter((s) => s.season_number > 0);
    return valid.length > 0 ? valid : details.seasons;
  }, [details]);

  // Current active season metadata
  const currentSeasonMeta = useMemo(() => {
    return regularSeasons.find((s) => s.season_number === selectedSeasonNumber);
  }, [regularSeasons, selectedSeasonNumber]);

  // Active season episodes with synthetic fallback if TMDB has rate limit or network error
  const currentEpisodes = useMemo(() => {
    const fetched = seasonEpisodes[selectedSeasonNumber];
    if (fetched && fetched.length > 0) return fetched;
    const count = currentSeasonMeta?.episode_count || 0;
    if (count > 0 && !loadingEpisodes) {
      return Array.from({ length: count }, (_, idx) => ({
        id: selectedSeasonNumber * 1000 + (idx + 1),
        episode_number: idx + 1,
        name: `Episode ${idx + 1}`,
        overview: null,
        still_path: null,
        air_date: null,
        vote_average: 0,
        runtime: null,
      }));
    }
    return fetched || [];
  }, [seasonEpisodes, selectedSeasonNumber, currentSeasonMeta, loadingEpisodes]);
  const totalEpisodesCount = useMemo(() => {
    if (!regularSeasons || regularSeasons.length === 0) {
      return details?.number_of_episodes || 0;
    }
    return regularSeasons.reduce((acc, s) => acc + (s.episode_count || 0), 0);
  }, [regularSeasons, details]);

  // Calculate watched count across regular seasons
  const totalWatchedCount = useMemo(() => {
    return watchedEpisodes.size;
  }, [watchedEpisodes]);

  const progressPercentage = useMemo(() => {
    if (totalEpisodesCount === 0) return 0;
    return Math.min(100, Math.round((totalWatchedCount / totalEpisodesCount) * 100));
  }, [totalWatchedCount, totalEpisodesCount]);

  // Calculate auto overall series rating across all rated seasons
  const ratedSeasonEntries = useMemo(() => {
    return Object.entries(seasonRatings)
      .map(([sNum, r]) => ({ seasonNumber: Number(sNum), rating: Number(r) }))
      .filter((entry) => typeof entry.rating === "number" && entry.rating > 0);
  }, [seasonRatings]);

  const autoOverallRating = useMemo(() => {
    if (ratedSeasonEntries.length === 0) return null;
    const sum = ratedSeasonEntries.reduce((acc, curr) => acc + curr.rating, 0);
    const avg = sum / ratedSeasonEntries.length;
    return Math.round(avg * 2) / 2; // round to nearest 0.5
  }, [ratedSeasonEntries]);

  // Helper to persist updates
  const saveProgress = useCallback(
    (newSet: Set<string>) => {
      setWatchedEpisodes(newSet);
      if (movie) {
        const arr = Array.from(newSet);
        updateSeriesWatchedEpisodes(movie.tmdb_id, arr, totalEpisodesCount);
        onProgressUpdated?.(movie.tmdb_id, arr.length, totalEpisodesCount);

        // Auto mark series as watched if all episodes are completed
        if (totalEpisodesCount > 0 && arr.length >= totalEpisodesCount) {
          const ratingToUse = autoOverallRating || seriesRating || 5;
          onMarkSeriesWatched?.(movie as WatchlistMovie, ratingToUse);
        }
      }
    },
    [movie, totalEpisodesCount, onProgressUpdated, autoOverallRating, seriesRating, onMarkSeriesWatched]
  );

  // Rate a specific season & auto-calculate overall series rating
  const handleRateSeason = (seasonNum: number, rating: number) => {
    const nextRatings = {
      ...seasonRatings,
      [seasonNum]: rating,
    };
    setSeasonRatings(nextRatings);
    if (movie) {
      updateSeriesSeasonRating(movie.tmdb_id, seasonNum, rating);

      // Auto calculate overall series rating from all rated seasons
      const validRatings = Object.values(nextRatings).filter(
        (r) => typeof r === "number" && r > 0
      );
      if (validRatings.length > 0) {
        const sum = validRatings.reduce((acc, curr) => acc + curr, 0);
        const avg = Math.round((sum / validRatings.length) * 2) / 2; // round to nearest 0.5
        setSeriesRating(avg);
        onRatingUpdated?.(movie.tmdb_id, avg);
      }
    }
  };

  // Toggle single episode
  const handleToggleEpisode = (seasonNum: number, episodeNum: number) => {
    const key = `S${seasonNum}E${episodeNum}`;
    const next = new Set(watchedEpisodes);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    saveProgress(next);
  };

  // Mark all up to a specific episode in current season
  const handleMarkUpToEpisode = (seasonNum: number, episodeNum: number) => {
    const next = new Set(watchedEpisodes);
    for (let i = 1; i <= episodeNum; i++) {
      next.add(`S${seasonNum}E${i}`);
    }
    saveProgress(next);
  };

  // Mark entire active season as watched
  const handleToggleSeason = (season: TvSeason) => {
    const next = new Set(watchedEpisodes);
    const count = season.episode_count || currentEpisodes.length;
    let allSeasonWatched = true;

    for (let i = 1; i <= count; i++) {
      if (!next.has(`S${season.season_number}E${i}`)) {
        allSeasonWatched = false;
        break;
      }
    }

    for (let i = 1; i <= count; i++) {
      const key = `S${season.season_number}E${i}`;
      if (allSeasonWatched) {
        next.delete(key);
      } else {
        next.add(key);
      }
    }
    saveProgress(next);
  };

  // Mark all seasons & episodes watched
  const handleMarkAllEpisodes = () => {
    const next = new Set<string>();
    regularSeasons.forEach((season) => {
      const count = season.episode_count || 1;
      for (let i = 1; i <= count; i++) {
        next.add(`S${season.season_number}E${i}`);
      }
    });
    saveProgress(next);
  };

  // Reset all progress
  const handleResetAllEpisodes = () => {
    saveProgress(new Set());
  };

  // Check how many are watched in a specific season
  const getSeasonProgress = (season: TvSeason) => {
    let count = 0;
    const total = season.episode_count || 0;
    for (let i = 1; i <= total; i++) {
      if (watchedEpisodes.has(`S${season.season_number}E${i}`)) {
        count++;
      }
    }
    return { count, total, isAll: total > 0 && count === total };
  };

  if (!isOpen || !movie) return null;

  const currentSeasonProgress = currentSeasonMeta
    ? getSeasonProgress(currentSeasonMeta)
    : { count: 0, total: 0, isAll: false };

  const isWatchlistRecord = "id" in movie && Boolean((movie as WatchlistMovie).id);

  return (
    <div
      id="episode-drawer-backdrop"
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col justify-end sm:justify-center items-center sm:p-4 transition-all duration-300"
      onClick={onClose}
    >
      <div
        id="episode-bottom-drawer"
        className="w-full max-w-3xl h-[100dvh] sm:h-[92vh] max-h-[100dvh] sm:max-h-[92vh] bg-zinc-950 border-t sm:border border-zinc-800/90 rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header Banner with single unified background */}
        <div className="relative bg-zinc-950 shrink-0">
          {/* Grab Handle */}
          <div className="pt-2.5 pb-1 flex justify-center relative z-10 sm:hidden">
            <div className="w-10 h-1 bg-zinc-800 rounded-full" />
          </div>

          {/* Top Info Bar */}
          <div className="relative z-10 px-4 sm:px-6 pt-2 sm:pt-4 pb-3">
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 text-xs font-semibold px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                  <Tv className="w-3.5 h-3.5" />
                  <span>TV Series</span>
                </span>
                {details && (
                  <span className="text-xs text-zinc-400 font-medium">
                    {regularSeasons.length} Seasons • {totalEpisodesCount} Episodes
                  </span>
                )}
              </div>

              <button
                id="close-episode-drawer-btn"
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800/80 transition-colors"
                title="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Series Main Info */}
            <div className="flex gap-3.5 sm:gap-4 items-center">
              <img
                src={
                  getPosterUrl(movie.poster_path) ||
                  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=120&auto=format&fit=crop&q=60"
                }
                alt={movie.title}
                className="w-14 h-20 sm:w-16 sm:h-24 object-cover rounded-xl bg-zinc-900 shadow-md shrink-0 border border-zinc-800/80"
                referrerPolicy="no-referrer"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-zinc-100 truncate">{movie.title}</h2>
                  {autoOverallRating !== null && (
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{autoOverallRating}</span>
                    </span>
                  )}
                </div>

                {movie.platforms && movie.platforms.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {movie.platforms.map((p) => (
                      <span
                        key={p}
                        className="text-[10px] font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                {/* Progress bar */}
                <div className="mt-2">
                  <div className="flex justify-between items-center text-xs text-zinc-400 mb-1">
                    <span>
                      <strong className="text-zinc-200 font-semibold">{totalWatchedCount}</strong> / {totalEpisodesCount} Watched
                    </span>
                    <span className="font-semibold text-zinc-300">{progressPercentage}%</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800/80">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        progressPercentage === 100
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-zinc-800/60">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllEpisodes}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mark All</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetAllEpisodes}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Reset</span>
                </button>
              </div>

              {progressPercentage === 100 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Completed</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Season Selector Tabs & Clean Single-Row Season Controls */}
        {loadingDetails ? (
          <div className="flex flex-col items-center justify-center py-16 text-amber-500 gap-2.5">
            <Loader2 className="w-7 h-7 animate-spin" />
            <span className="text-xs text-zinc-400">Loading series seasons...</span>
          </div>
        ) : loadError ? (
          <div className="p-8 text-center">
            <Film className="w-9 h-9 text-zinc-600 mx-auto mb-2.5" />
            <p className="text-xs text-zinc-400 mb-2">{loadError}</p>
          </div>
        ) : (
          <div className="bg-zinc-950 border-y border-zinc-800/80 px-4 sm:px-6 py-2.5 shrink-0 space-y-2.5">
            {/* Season Tabs Carousel */}
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {regularSeasons.map((season) => {
                const isActive = season.season_number === selectedSeasonNumber;
                const stat = getSeasonProgress(season);
                const sRating = seasonRatings[season.season_number];
                return (
                  <button
                    key={season.id || season.season_number}
                    id={`season-tab-${season.season_number}`}
                    type="button"
                    onClick={() => setSelectedSeasonNumber(season.season_number)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? "bg-amber-500 text-zinc-950 border-amber-500 font-bold"
                        : stat.isAll
                        ? "bg-zinc-900 text-zinc-200 border-zinc-700/80"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span>{season.name || `Season ${season.season_number}`}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        isActive
                          ? "bg-zinc-950/20 text-zinc-950"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {stat.count}/{season.episode_count}
                    </span>
                    {sRating ? (
                      <span
                        className={`text-[10px] font-bold ${
                          isActive ? "text-zinc-950" : "text-amber-400"
                        }`}
                      >
                        ★{sRating}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Clean Season Action Bar (Rating + Mark Season on 1 single row) */}
            {currentSeasonMeta && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Rate:</span>
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800/80 px-2 py-1 rounded-lg">
                    <StarRating
                      value={seasonRatings[selectedSeasonNumber] || 0}
                      onChange={(val) => handleRateSeason(selectedSeasonNumber, val)}
                      size="sm"
                      allowHalf={true}
                      showValueText={true}
                    />
                  </div>
                </div>

                <button
                  id="season-mark-all-btn"
                  type="button"
                  onClick={() => handleToggleSeason(currentSeasonMeta)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    currentSeasonProgress.isAll
                      ? "bg-zinc-900 border-zinc-700 text-amber-400"
                      : "bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300"
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 ${currentSeasonProgress.isAll ? "text-amber-400 stroke-[2.5]" : "text-zinc-500"}`} />
                  <span>{currentSeasonProgress.isAll ? `S${selectedSeasonNumber} Watched` : `Mark S${selectedSeasonNumber}`}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Episodes Scrollable List */}
        <div id="episodes-container" className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 bg-zinc-950">
          {loadingEpisodes ? (
            <div className="flex flex-col items-center justify-center py-20 text-amber-500 gap-2.5">
              <Loader2 className="w-7 h-7 animate-spin" />
              <p className="text-xs text-zinc-400">Loading episodes for Season {selectedSeasonNumber}...</p>
            </div>
          ) : currentEpisodes.length === 0 && !loadError && !loadingDetails ? (
            <div className="py-20 text-center text-zinc-500 text-xs">
              No episode details available for this season.
            </div>
          ) : (
            currentEpisodes.map((ep) => {
              const epKey = `S${selectedSeasonNumber}E${ep.episode_number}`;
              const isWatched = watchedEpisodes.has(epKey);
              const isExpanded = expandedEpisodeId === ep.id;
              const stillUrl = getStillUrl(ep.still_path);

              return (
                <div
                  key={ep.id}
                  id={`episode-card-${epKey}`}
                  className={`group border rounded-2xl p-3.5 sm:p-4 transition-all duration-200 ${
                    isWatched
                      ? "bg-zinc-900/90 border-zinc-800/90 hover:border-zinc-700 shadow-sm"
                      : "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700/80 hover:bg-zinc-900/80"
                  }`}
                >
                  <div className="flex gap-3.5 sm:gap-4 items-start">
                    {/* Episode Thumbnail */}
                    <div className="relative w-22 sm:w-28 h-16 sm:h-18 rounded-xl bg-zinc-800/90 overflow-hidden shrink-0 border border-zinc-800 shadow-inner flex items-center justify-center">
                      {stillUrl ? (
                        <img
                          src={stillUrl}
                          alt={ep.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Film className="w-6 h-6 text-zinc-600" />
                      )}
                      <span className="absolute bottom-1 left-1 bg-black/85 backdrop-blur-xs text-[10px] font-bold text-zinc-200 px-1.5 py-0.5 rounded-md border border-white/10">
                        E{ep.episode_number}
                      </span>
                    </div>

                    {/* Middle Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-sm sm:text-base font-bold leading-tight line-clamp-1 text-zinc-100">
                          {ep.name || `Episode ${ep.episode_number}`}
                        </h4>
                      </div>

                      {/* Episode Meta */}
                      <div className="flex items-center gap-2.5 mt-1.5 text-xs text-zinc-400 font-medium flex-wrap">
                        {ep.air_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                            {ep.air_date}
                          </span>
                        )}
                        {ep.runtime && ep.runtime > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            {ep.runtime}m
                          </span>
                        )}
                        {ep.vote_average > 0 && (
                          <span className="flex items-center gap-1 text-amber-400 font-bold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {ep.vote_average.toFixed(1)}
                          </span>
                        )}
                      </div>

                      {/* Overview */}
                      {ep.overview && (
                        <div className="mt-1.5">
                          <p
                            className={`text-xs text-zinc-400 leading-relaxed transition-all ${
                              isExpanded ? "" : "line-clamp-2"
                            }`}
                          >
                            {ep.overview}
                          </p>
                          {ep.overview.length > 80 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedEpisodeId(isExpanded ? null : ep.id)
                              }
                              className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold mt-1 inline-flex items-center gap-1 transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <span>Show less</span>
                                  <ChevronUp className="w-3 h-3" />
                                </>
                              ) : (
                                <>
                                  <span>Read more</span>
                                  <ChevronDown className="w-3 h-3" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Checkbox & Quick Multi-Mark */}
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <button
                        id={`check-episode-${epKey}`}
                        type="button"
                        onClick={() =>
                          handleToggleEpisode(
                            selectedSeasonNumber,
                            ep.episode_number
                          )
                        }
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
                          isWatched
                            ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/30 scale-105"
                            : "bg-zinc-800/90 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100 border border-zinc-700/60"
                        }`}
                        title={isWatched ? "Mark unwatched" : "Mark watched"}
                      >
                        {isWatched ? (
                          <Check className="w-5 h-5 stroke-[3]" />
                        ) : (
                          <Circle className="w-5 h-5 stroke-[1.5]" />
                        )}
                      </button>

                      {!isWatched && ep.episode_number > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            handleMarkUpToEpisode(
                              selectedSeasonNumber,
                              ep.episode_number
                            )
                          }
                          className="text-[10px] font-medium text-zinc-400 hover:text-amber-300 bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 px-2 py-0.5 rounded-md transition-colors whitespace-nowrap"
                          title={`Mark episodes 1 through ${ep.episode_number} as watched`}
                        >
                          Up to E{ep.episode_number}
                        </button>
                      )}
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
};

