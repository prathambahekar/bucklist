import React, { useMemo, useState } from "react";
import {
  Clock,
  Film,
  Sparkles,
  Star,
  Award,
  Flame,
  ChevronDown,
  ChevronUp,
  BarChart2,
} from "lucide-react";
import type { WatchlistMovie } from "../types";
import type { TvProgressMap } from "../lib/storage";

interface StatsViewProps {
  watched: WatchlistMovie[];
  movies: WatchlistMovie[];
  tvProgressMap: TvProgressMap;
  onNavigateToWatchlist?: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  Movies: "#f59e0b", // Amber 500
  "TV Series": "#3b82f6", // Blue 500
  Anime: "#ec4899", // Pink 500
};

export const StatsView: React.FC<StatsViewProps> = ({
  watched,
  tvProgressMap,
  onNavigateToWatchlist,
}) => {
  const [timeFilter, setTimeFilter] = useState<"all" | "year" | "month" | "week">("all");
  const [chartsExpanded, setChartsExpanded] = useState<boolean>(false);
  const [hoveredDonutIdx, setHoveredDonutIdx] = useState<number | null>(null);

  const isItemAnime = (item: WatchlistMovie) => {
    return (
      (item.genres || []).some(
        (g) =>
          g.toLowerCase().includes("anime") ||
          g.toLowerCase().includes("animation")
      ) ||
      (item.platforms || []).some((p) => p.toLowerCase().includes("crunchy"))
    );
  };

  const isItemTv = (item: WatchlistMovie) => {
    return item.media_type === "tv";
  };

  // Filter watched items by time if selected
  const filteredWatched = useMemo(() => {
    if (timeFilter === "all") return watched;
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    return watched.filter((m) => {
      const date = m.watched_date || "";
      if (timeFilter === "week") {
        return date >= sevenDaysAgoStr;
      }
      if (timeFilter === "month") {
        return date.startsWith(currentMonth);
      }
      if (timeFilter === "year") {
        if (date) return date.startsWith(currentYear);
        return m.release_year === currentYear;
      }
      return true;
    });
  }, [watched, timeFilter]);

  // Calculate Summary Stats
  const statsSummary = useMemo(() => {
    let movieCount = 0;
    let seriesCount = 0;
    let animeCount = 0;
    let totalEpisodesLogged = 0;
    let totalEstimatedMinutes = 0;
    let totalRatingSum = 0;
    let ratedCount = 0;

    const genreScores: Record<string, { totalRating: number; count: number }> = {};
    const platformCounts: Record<string, number> = {};
    const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const monthlyActivity: Record<string, number> = {};

    filteredWatched.forEach((item) => {
      const isAnime = isItemAnime(item);
      const isTv = isItemTv(item);

      if (isAnime) {
        animeCount += 1;
      } else if (isTv) {
        seriesCount += 1;
      } else {
        movieCount += 1;
      }

      if (isTv || isAnime) {
        const progress = tvProgressMap[item.tmdb_id];
        const epCount = progress?.watchedEpisodes?.length || 0;
        if (epCount > 0) {
          totalEpisodesLogged += epCount;
          totalEstimatedMinutes += epCount * (isAnime ? 24 : 45);
        } else {
          const fallbackEpisodes = 10;
          totalEpisodesLogged += fallbackEpisodes;
          totalEstimatedMinutes += fallbackEpisodes * (isAnime ? 24 : 45);
        }
      } else {
        totalEstimatedMinutes += 110;
      }

      if (item.rating && item.rating > 0) {
        totalRatingSum += item.rating;
        ratedCount += 1;
        const rounded = Math.round(item.rating);
        if (rounded >= 1 && rounded <= 5) {
          ratingDist[rounded] = (ratingDist[rounded] || 0) + 1;
        }
      }

      (item.genres || []).forEach((g) => {
        if (!genreScores[g]) {
          genreScores[g] = { totalRating: 0, count: 0 };
        }
        genreScores[g].count += 1;
        if (item.rating) {
          genreScores[g].totalRating += item.rating;
        }
      });

      const venue = item.watched_source || "ott";
      let venueKey = "OTT";
      if (venue === "theatre") {
        venueKey = "Theatre";
      } else if (venue === "other") {
        venueKey = item.watched_platform || "Other";
      } else {
        venueKey = item.watched_platform || "OTT";
      }
      platformCounts[venueKey] = (platformCounts[venueKey] || 0) + 1;

      if (item.watched_date) {
        const monthKey = item.watched_date.slice(0, 7);
        monthlyActivity[monthKey] = (monthlyActivity[monthKey] || 0) + 1;
      }
    });

    const totalHours = Math.round(totalEstimatedMinutes / 60);
    const avgRating = ratedCount > 0 ? (totalRatingSum / ratedCount).toFixed(1) : "—";

    const genreArray = Object.entries(genreScores).map(([name, data]) => ({
      name,
      count: data.count,
      avgRating: data.count > 0 && data.totalRating > 0 ? parseFloat((data.totalRating / data.count).toFixed(1)) : 0,
    }));

    const topRatedGenres = [...genreArray]
      .filter((g) => g.avgRating > 0)
      .sort((a, b) => b.avgRating - a.avgRating || b.count - a.count)
      .slice(0, 5);

    const mostWatchedGenres = [...genreArray]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const typeDistribution = [
      { name: "Movies", value: movieCount, color: TYPE_COLORS.Movies },
      { name: "TV Series", value: seriesCount, color: TYPE_COLORS["TV Series"] },
      { name: "Anime", value: animeCount, color: TYPE_COLORS.Anime },
    ].filter((t) => t.value > 0);

    const ratingHistogram = [
      { stars: "5★", count: ratingDist[5], color: "#10b981" },
      { stars: "4★", count: ratingDist[4], color: "#3b82f6" },
      { stars: "3★", count: ratingDist[3], color: "#f59e0b" },
      { stars: "2★", count: ratingDist[2], color: "#f97316" },
      { stars: "1★", count: ratingDist[1], color: "#ef4444" },
    ];

    return {
      totalWatchedCount: filteredWatched.length,
      movieCount,
      seriesCount,
      animeCount,
      totalEpisodesLogged,
      totalHours,
      avgRating,
      ratedCount,
      topRatedGenres,
      mostWatchedGenres,
      typeDistribution,
      ratingHistogram,
    };
  }, [filteredWatched, tvProgressMap]);

  if (watched.length === 0) {
    return (
      <div id="stats-empty-state" className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 text-center max-w-sm mx-auto my-2 space-y-2.5 shadow-lg">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Award className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-zinc-100">No Watched History Yet</h3>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Mark movies and series as watched to unlock viewing stats.
          </p>
        </div>
        {onNavigateToWatchlist && (
          <button
            type="button"
            onClick={onNavigateToWatchlist}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Film className="w-3 h-3" />
            <span>Go to Watchlist</span>
          </button>
        )}
      </div>
    );
  }

  // Calculate SVG Donut Segments
  const totalTypeCount = statsSummary.typeDistribution.reduce((acc, curr) => acc + curr.value, 0);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  const maxHistCount = Math.max(1, ...statsSummary.ratingHistogram.map((h) => h.count));
  const maxGenreCount = Math.max(1, ...statsSummary.mostWatchedGenres.map((g) => g.count));

  return (
    <div id="stats-dashboard" className="w-full space-y-2.5 animate-in fade-in duration-200">
      {/* Streamlined Watch Time Hero Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-[#18181b] to-zinc-900 border border-zinc-800/90 rounded-2xl p-3 sm:p-3.5 shadow-md flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-extrabold text-zinc-100 tracking-tight leading-none">
                {statsSummary.totalHours}
              </span>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Hours Watched
              </span>
              <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
                (~{(statsSummary.totalHours / 24).toFixed(1)} days)
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Across <span className="text-zinc-200 font-semibold">{statsSummary.totalWatchedCount} titles</span>
              {statsSummary.movieCount > 0 && ` (${statsSummary.movieCount} movies`}
              {statsSummary.seriesCount > 0 && `, ${statsSummary.seriesCount} shows`}
              {statsSummary.animeCount > 0 && `, ${statsSummary.animeCount} anime`}
              {")"}
              {statsSummary.avgRating !== "—" && (
                <> • <span className="text-amber-400 font-semibold">{statsSummary.avgRating}★ avg</span></>
              )}
            </p>
          </div>
        </div>

        {/* Time Filter Pill */}
        <div className="flex items-center gap-0.5 bg-zinc-950 border border-zinc-800 p-0.5 rounded-lg text-[11px] shrink-0 flex-wrap">
          <button
            type="button"
            id="stats-filter-all"
            onClick={() => setTimeFilter("all")}
            className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              timeFilter === "all"
                ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All Time
          </button>
          <button
            type="button"
            id="stats-filter-year"
            onClick={() => setTimeFilter("year")}
            className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              timeFilter === "year"
                ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {new Date().getFullYear()}
          </button>
          <button
            type="button"
            id="stats-filter-month"
            onClick={() => setTimeFilter("month")}
            className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              timeFilter === "month"
                ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Month
          </button>
          <button
            type="button"
            id="stats-filter-week"
            onClick={() => setTimeFilter("week")}
            className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              timeFilter === "week"
                ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Collapsible Charts Toggle Button */}
      <button
        type="button"
        id="stats-toggle-charts-btn"
        onClick={() => setChartsExpanded(!chartsExpanded)}
        className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-zinc-100 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-2 text-xs font-bold">
          <BarChart2 className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
          <span>{chartsExpanded ? "Hide Visual Charts & Graphs" : "View Visual Charts & Breakdown"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
          <span>{chartsExpanded ? "Collapse" : "Expand"}</span>
          {chartsExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          )}
        </div>
      </button>

      {/* COLLAPSIBLE CHARTS SECTION */}
      {chartsExpanded && (
        <div className="space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Row 1: Format Donut + Top Rated Genres */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {/* Chart 1: Media Format Donut */}
            <div className="bg-[#18181b] border border-zinc-800/90 rounded-2xl p-3 sm:p-3.5 shadow-md space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-amber-400" />
                  <h3 className="text-xs font-bold text-zinc-200">
                    Movies vs. Series
                  </h3>
                </div>
                <span className="text-[9.5px] text-zinc-500">Breakdown</span>
              </div>

              <div className="h-44 w-full flex flex-col items-center justify-center">
                {statsSummary.typeDistribution.length > 0 ? (
                  <div className="w-full flex items-center justify-around gap-2">
                    {/* Native SVG Donut */}
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {statsSummary.typeDistribution.map((item, idx) => {
                          const percent = item.value / totalTypeCount;
                          const dashLength = percent * circumference;
                          const offset = accumulatedOffset;
                          accumulatedOffset += dashLength;
                          const isHovered = hoveredDonutIdx === idx;

                          return (
                            <circle
                              key={item.name}
                              cx="50"
                              cy="50"
                              r={radius}
                              fill="transparent"
                              stroke={item.color}
                              strokeWidth={isHovered ? "14" : "11"}
                              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                              strokeDashoffset={-offset}
                              className="transition-all duration-200 cursor-pointer"
                              onMouseEnter={() => setHoveredDonutIdx(idx)}
                              onMouseLeave={() => setHoveredDonutIdx(null)}
                            />
                          );
                        })}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                        <span className="text-base font-extrabold text-zinc-100 leading-none">
                          {totalTypeCount}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-semibold uppercase">
                          Titles
                        </span>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-1.5 text-xs">
                      {statsSummary.typeDistribution.map((item, idx) => {
                        const pct = Math.round((item.value / totalTypeCount) * 100);
                        return (
                          <div
                            key={item.name}
                            onMouseEnter={() => setHoveredDonutIdx(idx)}
                            onMouseLeave={() => setHoveredDonutIdx(null)}
                            className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                              hoveredDonutIdx === idx ? "bg-zinc-800/80" : ""
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-zinc-300 font-medium">{item.name}</span>
                            <span className="text-zinc-500 font-semibold ml-auto">{item.value} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No data available</p>
                )}
              </div>
            </div>

            {/* Chart 2: Top Rated Genres */}
            <div className="bg-[#18181b] border border-zinc-800/90 rounded-2xl p-3 sm:p-3.5 shadow-md space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <h3 className="text-xs font-bold text-zinc-200">
                    Top-Rated Genres
                  </h3>
                </div>
                <span className="text-[9.5px] text-zinc-500">Average Stars</span>
              </div>

              <div className="h-44 w-full flex flex-col justify-center gap-2 px-1">
                {statsSummary.topRatedGenres.length > 0 ? (
                  statsSummary.topRatedGenres.map((genre) => {
                    const widthPct = Math.min(100, Math.max(10, (genre.avgRating / 5) * 100));
                    return (
                      <div key={genre.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-300 font-medium truncate max-w-[130px]">
                            {genre.name}
                          </span>
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            {genre.avgRating}★ <span className="text-[10px] text-zinc-500 font-normal">({genre.count})</span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-300"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                    Rate items to view top genres
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Most Watched Genres + Rating Histogram */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {/* Most Watched Genres */}
            <div className="bg-[#18181b] border border-zinc-800/90 rounded-2xl p-3 sm:p-3.5 shadow-md space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <h3 className="text-xs font-bold text-zinc-200">
                    Most Watched Genres
                  </h3>
                </div>
                <span className="text-[9.5px] text-zinc-500">By Count</span>
              </div>

              <div className="h-40 w-full flex flex-col justify-center gap-2 px-1">
                {statsSummary.mostWatchedGenres.length > 0 ? (
                  statsSummary.mostWatchedGenres.map((genre) => {
                    const widthPct = Math.min(100, Math.max(12, (genre.count / maxGenreCount) * 100));
                    return (
                      <div key={genre.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-300 font-medium truncate max-w-[150px]">
                            {genre.name}
                          </span>
                          <span className="text-blue-400 font-bold text-[11px]">
                            {genre.count} {genre.count === 1 ? "title" : "titles"}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-300"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                    No genre data available
                  </div>
                )}
              </div>
            </div>

            {/* Ratings Histogram */}
            <div className="bg-[#18181b] border border-zinc-800/90 rounded-2xl p-3 sm:p-3.5 shadow-md space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <h3 className="text-xs font-bold text-zinc-200">
                    Rating Curve (1★ - 5★)
                  </h3>
                </div>
                <span className="text-[9.5px] text-zinc-500">Distribution</span>
              </div>

              <div className="h-40 w-full flex items-end justify-between gap-3 pt-4 pb-1 px-4">
                {statsSummary.ratingHistogram.map((item) => {
                  const heightPct = item.count > 0 ? Math.max(15, (item.count / maxHistCount) * 100) : 4;
                  return (
                    <div key={item.stars} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                      <span className="text-[10px] font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">
                        {item.count}
                      </span>
                      <div className="w-full max-w-[28px] h-24 bg-zinc-800/40 rounded-t-md flex items-end overflow-hidden">
                        <div
                          className="w-full rounded-t-md transition-all duration-300 group-hover:brightness-125"
                          style={{
                            height: `${heightPct}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-zinc-300">
                        {item.stars}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
