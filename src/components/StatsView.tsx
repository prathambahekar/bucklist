import React, { useMemo, useState } from "react";
import {
  Clock,
  Film,
  Sparkles,
  Star,
  Layers,
  Award,
  Flame,
  ChevronDown,
  ChevronUp,
  BarChart2,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import type { WatchlistMovie } from "../types";
import type { TvProgressMap } from "../lib/storage";

interface StatsViewProps {
  watched: WatchlistMovie[];
  movies: WatchlistMovie[];
  tvProgressMap: TvProgressMap;
  onNavigateToWatchlist?: () => void;
}

const TYPE_COLORS = {
  movies: "#f59e0b", // Amber 500
  series: "#3b82f6", // Blue 500
  anime: "#ec4899", // Pink 500
};

export const StatsView: React.FC<StatsViewProps> = ({
  watched,
  movies,
  tvProgressMap,
  onNavigateToWatchlist,
}) => {
  const [timeFilter, setTimeFilter] = useState<"all" | "year" | "month" | "week">("all");
  const [chartsExpanded, setChartsExpanded] = useState<boolean>(false);

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
    
    // 7 days cutoff (YYYY-MM-DD)
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

      // Time estimation:
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

      // Ratings
      if (item.rating && item.rating > 0) {
        totalRatingSum += item.rating;
        ratedCount += 1;
        const rounded = Math.round(item.rating);
        if (rounded >= 1 && rounded <= 5) {
          ratingDist[rounded] = (ratingDist[rounded] || 0) + 1;
        }
      }

      // Genres
      (item.genres || []).forEach((g) => {
        if (!genreScores[g]) {
          genreScores[g] = { totalRating: 0, count: 0 };
        }
        genreScores[g].count += 1;
        if (item.rating) {
          genreScores[g].totalRating += item.rating;
        }
      });

      // Venue / Platform
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

      // Monthly Activity
      if (item.watched_date) {
        const monthKey = item.watched_date.slice(0, 7);
        monthlyActivity[monthKey] = (monthlyActivity[monthKey] || 0) + 1;
      }
    });

    const totalHours = Math.round(totalEstimatedMinutes / 60);
    const avgRating = ratedCount > 0 ? (totalRatingSum / ratedCount).toFixed(1) : "—";

    // Top genres by average rating
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
      .slice(0, 6);

    const typeDistribution = [
      { name: "Movies", value: movieCount, color: TYPE_COLORS.movies },
      { name: "TV Series", value: seriesCount, color: TYPE_COLORS.series },
      { name: "Anime", value: animeCount, color: TYPE_COLORS.anime },
    ].filter((t) => t.value > 0);

    const ratingHistogram = [
      { stars: "5★", count: ratingDist[5] },
      { stars: "4★", count: ratingDist[4] },
      { stars: "3★", count: ratingDist[3] },
      { stars: "2★", count: ratingDist[2] },
      { stars: "1★", count: ratingDist[1] },
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

              <div className="h-44 w-full flex items-center justify-center">
                {statsSummary.typeDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statsSummary.typeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statsSummary.typeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#18181b" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        cursor={{ fill: "transparent" }}
                        contentStyle={{
                          backgroundColor: "#09090b",
                          borderColor: "#27272a",
                          borderRadius: "8px",
                          fontSize: "11px",
                          color: "#f4f4f5",
                          padding: "4px 8px",
                        }}
                        formatter={(value: any, name: any) => [`${value} titles`, name]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={28}
                        formatter={(value) => (
                          <span className="text-[11px] text-zinc-300 font-medium">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
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

              <div className="h-44 w-full">
                {statsSummary.topRatedGenres.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statsSummary.topRatedGenres}
                      layout="vertical"
                      margin={{ top: 2, right: 20, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                      <XAxis type="number" domain={[0, 5]} tick={{ fill: "#71717a", fontSize: 9 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: "#d4d4d8", fontSize: 10 }}
                        width={65}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                        contentStyle={{
                          backgroundColor: "#09090b",
                          borderColor: "#27272a",
                          borderRadius: "8px",
                          fontSize: "11px",
                          color: "#f4f4f5",
                          padding: "4px 8px",
                        }}
                        formatter={(value: any, _: any, item: any) => [
                          `${value} ★ (${item.payload.count} titles)`,
                          "Avg Rating",
                        ]}
                      />
                      <Bar dataKey="avgRating" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12}>
                        {statsSummary.topRatedGenres.map((_, index) => (
                          <Cell
                            key={`genre-cell-${index}`}
                            fill={index === 0 ? "#fbbf24" : index === 1 ? "#f59e0b" : "#d97706"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
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

              <div className="h-40 w-full">
                {statsSummary.mostWatchedGenres.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statsSummary.mostWatchedGenres}
                      margin={{ top: 5, right: 5, left: -25, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#a1a1aa", fontSize: 9 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis tick={{ fill: "#71717a", fontSize: 9 }} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                        contentStyle={{
                          backgroundColor: "#09090b",
                          borderColor: "#27272a",
                          borderRadius: "8px",
                          fontSize: "11px",
                          color: "#f4f4f5",
                          padding: "4px 8px",
                        }}
                        formatter={(value: any) => [`${value} titles`, "Count"]}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
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

              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statsSummary.ratingHistogram}
                    margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="stars" tick={{ fill: "#e4e4e7", fontSize: 10, fontWeight: "bold" }} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 9 }} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                      contentStyle={{
                        backgroundColor: "#09090b",
                        borderColor: "#27272a",
                        borderRadius: "8px",
                        fontSize: "11px",
                        color: "#f4f4f5",
                        padding: "4px 8px",
                      }}
                      formatter={(value: any) => [`${value} ratings`, "Titles"]}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20}>
                      {statsSummary.ratingHistogram.map((entry, idx) => (
                        <Cell
                          key={`hist-${idx}`}
                          fill={
                            entry.stars.startsWith("5")
                              ? "#10b981"
                              : entry.stars.startsWith("4")
                              ? "#3b82f6"
                              : entry.stars.startsWith("3")
                              ? "#f59e0b"
                              : entry.stars.startsWith("2")
                              ? "#f97316"
                              : "#ef4444"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
