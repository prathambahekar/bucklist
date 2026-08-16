import React, { useState, useMemo } from "react";
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Film,
  Tv,
  Sparkles,
  Star,
  Trash2,
  BookmarkMinus,
  ArrowUpDown,
  ListOrdered,
} from "lucide-react";
import type { WatchlistMovie, TimelinePeriod } from "../types";
import type { TvProgressMap } from "../lib/storage";
import { getPosterUrl } from "../lib/api";
import { OttBadge } from "./OttBadge";
import { DatePickerPopover } from "./DatePickerPopover";

function checkIsAnime(item: WatchlistMovie): boolean {
  const genres = item.genres || [];
  const hasAnimation = genres.some((g) => g.toLowerCase().includes("anim"));
  const onCrunchyroll = (item.platforms || []).some((p) => p.toLowerCase().includes("crunchy"));
  return (hasAnimation && item.media_type === "tv") || onCrunchyroll;
}

interface WatchedTimelineViewProps {
  items: WatchlistMovie[];
  timelinePeriod: TimelinePeriod;
  onPeriodChange: (period: TimelinePeriod) => void;
  onItemClick: (item: WatchlistMovie) => void;
  onRateClick: (item: WatchlistMovie, rating: number) => void;
  onDeleteClick: (id: string) => void;
  onMoveToWatchlistClick: (item: WatchlistMovie) => void;
  onUpdateWatchedDate: (item: WatchlistMovie, newDate: string) => void;
  onOpenTvDrawer: (item: WatchlistMovie) => void;
  tvProgressMap: TvProgressMap;
}

interface TimelineGroup {
  key: string;
  label: string;
  sublabel?: string;
  items: WatchlistMovie[];
  avgRating: number | null;
  movieCount: number;
  tvCount: number;
  sortTimestamp: number;
}

// Helper to get ISO date string from item
function getItemDateString(item: WatchlistMovie): string {
  if (item.watched_date) {
    return item.watched_date.split("T")[0];
  }
  if (item.created_at) {
    return item.created_at.split("T")[0];
  }
  return "";
}

// Helper to get start and end of week (Monday to Sunday)
function getWeekBounds(d: Date): { start: Date; end: Date } {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function WatchedTimelineView({
  items,
  timelinePeriod,
  onPeriodChange,
  onItemClick,
  onRateClick,
  onDeleteClick,
  onMoveToWatchlistClick,
  onUpdateWatchedDate,
  onOpenTvDrawer,
  tvProgressMap,
}: WatchedTimelineViewProps) {
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Calculate overall stats
  const totalItemsCount = items.length;
  const avgOverallRating = useMemo(() => {
    const rated = items.filter((i) => typeof i.rating === "number" && i.rating > 0);
    if (rated.length === 0) return null;
    const sum = rated.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    return (sum / rated.length).toFixed(1);
  }, [items]);

  // Group items according to selected period
  const groupedTimeline = useMemo(() => {
    const groupMap: Record<
      string,
      { label: string; sublabel?: string; items: WatchlistMovie[]; sortTimestamp: number }
    > = {};
    const today = new Date();
    const currentWeekBounds = getWeekBounds(today);

    items.forEach((item) => {
      const dateStr = getItemDateString(item);
      let key = "undated";
      let label = "Earlier / Undated";
      let sublabel = undefined;
      let sortTimestamp = 0;

      if (dateStr) {
        const [y, m, d] = dateStr.split("-").map(Number);
        if (y && m && d) {
          const itemDate = new Date(y, m - 1, d);

          if (timelinePeriod === "year") {
            key = `year-${y}`;
            label = `${y}`;
            sortTimestamp = new Date(y, 11, 31).getTime();
          } else if (timelinePeriod === "month") {
            const monthName = itemDate.toLocaleDateString("en-US", { month: "long" });
            key = `month-${y}-${String(m).padStart(2, "0")}`;
            label = `${monthName} ${y}`;
            sortTimestamp = new Date(y, m - 1, 1).getTime();
          } else {
            // Week grouping
            const { start, end } = getWeekBounds(itemDate);
            const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
            key = `week-${startStr}`;
            sortTimestamp = start.getTime();

            if (start.getTime() === currentWeekBounds.start.getTime()) {
              label = `This Week`;
              sublabel = `${formatDateShort(start)} – ${formatDateShort(end)}`;
            } else {
              const lastWeek = new Date(today);
              lastWeek.setDate(today.getDate() - 7);
              const lastWeekBounds = getWeekBounds(lastWeek);
              if (start.getTime() === lastWeekBounds.start.getTime()) {
                label = `Last Week`;
                sublabel = `${formatDateShort(start)} – ${formatDateShort(end)}`;
              } else {
                label = `${formatDateShort(start)} – ${formatDateShort(end)}`;
                sublabel = `${start.getFullYear()}`;
              }
            }
          }
        }
      }

      if (!groupMap[key]) {
        groupMap[key] = {
          label,
          sublabel,
          items: [],
          sortTimestamp,
        };
      }
      groupMap[key].items.push(item);
    });

    // Convert to array and calculate stats for each group
    const groups: TimelineGroup[] = Object.entries(groupMap).map(([key, group]) => {
      const sortedGroupItems = [...group.items].sort((a, b) => {
        const dateA = getItemDateString(a);
        const dateB = getItemDateString(b);
        return sortOrder === "desc"
          ? dateB.localeCompare(dateA)
          : dateA.localeCompare(dateB);
      });

      const rated = sortedGroupItems.filter((i) => typeof i.rating === "number" && i.rating > 0);
      const avgRating =
        rated.length > 0
          ? Number((rated.reduce((acc, curr) => acc + (curr.rating || 0), 0) / rated.length).toFixed(1))
          : null;

      const tvCount = sortedGroupItems.filter((i) => i.media_type === "tv").length;
      const movieCount = sortedGroupItems.length - tvCount;

      return {
        key,
        label: group.label,
        sublabel: group.sublabel,
        items: sortedGroupItems,
        avgRating,
        movieCount,
        tvCount,
        sortTimestamp: group.sortTimestamp,
      };
    });

    groups.sort((a, b) => {
      if (a.key === "undated") return 1;
      if (b.key === "undated") return -1;
      return sortOrder === "desc"
        ? b.sortTimestamp - a.sortTimestamp
        : a.sortTimestamp - b.sortTimestamp;
    });

    return groups;
  }, [items, timelinePeriod, sortOrder]);

  if (items.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center px-4">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-amber-500/70">
          <CalendarDays className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-1">
          No titles in timeline
        </h3>
        <p className="text-xs text-zinc-500 max-w-xs">
          Mark movies and series as watched with their date to see your chronological watch history.
        </p>
      </div>
    );
  }

  return (
    <div id="watched-timeline-container" className="w-full space-y-4 animate-in fade-in duration-200">
      {/* Streamlined Timeline Controls Row (Flat & Compact, No Nested Card Boxes) */}
      <div className="flex items-center justify-between gap-2 py-1 flex-wrap">
        {/* Period Selector (Month / Week / Year) */}
        <div
          id="timeline-period-tabs"
          className="inline-flex items-center gap-0.5 bg-zinc-900 border border-zinc-800/80 p-0.5 rounded-xl"
        >
          <button
            type="button"
            id="timeline-group-month-btn"
            onClick={() => onPeriodChange("month")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              timelinePeriod === "month"
                ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
            title="Group by Month"
          >
            <Calendar className="w-3 h-3" />
            <span>Month</span>
          </button>

          <button
            type="button"
            id="timeline-group-week-btn"
            onClick={() => onPeriodChange("week")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              timelinePeriod === "week"
                ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
            title="Group by Week"
          >
            <CalendarRange className="w-3 h-3" />
            <span>Week</span>
          </button>

          <button
            type="button"
            id="timeline-group-year-btn"
            onClick={() => onPeriodChange("year")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              timelinePeriod === "year"
                ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
            title="Group by Year"
          >
            <CalendarDays className="w-3 h-3" />
            <span>Year</span>
          </button>
        </div>

        {/* Right: Sort Button & Summary stats */}
        <div className="flex items-center gap-1.5 ml-auto">
          {avgOverallRating && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
              <Star className="w-3 h-3 fill-amber-400" />
              {avgOverallRating} avg ({totalItemsCount})
            </span>
          )}

          <button
            type="button"
            id="timeline-sort-order-toggle"
            onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
            className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1 rounded-xl text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title={`Sort order: ${sortOrder === "desc" ? "Newest First" : "Oldest First"}`}
          >
            <ArrowUpDown className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{sortOrder === "desc" ? "Newest" : "Oldest"}</span>
          </button>
        </div>
      </div>

      {/* Vertical Spine Layout (Mobile-friendly, no wasted horizontal margin) */}
      <div className="relative pl-3.5 sm:pl-6 space-y-6 before:absolute before:left-1.5 sm:before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
        {groupedTimeline.map((group) => {
          return (
            <div key={group.key} className="relative space-y-2.5">
              {/* Group Milestone Header */}
              <div className="relative flex items-center gap-2 pt-1">
                {/* Small indicator on spine */}
                <div className="absolute -left-3.5 sm:-left-6 top-2.5 w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-zinc-950 border-2 border-amber-500 flex items-center justify-center shrink-0 shadow-xs shadow-amber-500/30">
                  <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-amber-400" />
                </div>

                {/* Milestone Title & Counts */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-100 tracking-tight">
                    {group.label}
                  </h3>
                  {group.sublabel && (
                    <span className="text-[11px] text-zinc-400 font-normal">
                      ({group.sublabel})
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-zinc-800/80 text-zinc-400">
                    {group.items.length} {group.items.length === 1 ? "title" : "titles"}
                  </span>
                  {group.avgRating !== null && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-amber-400" />
                      {group.avgRating}★
                    </span>
                  )}
                </div>
              </div>

              {/* Group Items (Compact Mobile Cards) */}
              <div className="space-y-2">
                {group.items.map((item) => {
                  const poster = getPosterUrl(item.poster_path);
                  const isTv = item.media_type === "tv";
                  const isAnime = checkIsAnime(item);
                  const progressData = tvProgressMap[item.tmdb_id];
                  const watchedEpCount = progressData?.watchedEpisodes?.length || 0;
                  const totalEpCount = progressData?.totalEpisodes;
                  const itemDateStr = getItemDateString(item);

                  return (
                    <div
                      key={item.id}
                      id={`timeline-card-${item.id}`}
                      className="group relative bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-2.5 sm:p-3 transition-all duration-150 flex gap-2.5 sm:gap-3"
                    >
                      {/* Left: Poster Thumbnail */}
                      <div
                        onClick={() => onItemClick(item)}
                        className="relative w-14 sm:w-16 aspect-[2/3] shrink-0 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-800 cursor-pointer shadow-xs"
                      >
                        <img
                          src={
                            poster ||
                            "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=60"
                          }
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Right: Content details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          {/* Row 1: Title & Rating Badge */}
                          <div className="flex items-start justify-between gap-1.5">
                            <h4
                              onClick={() => onItemClick(item)}
                              className="text-xs sm:text-sm font-bold text-zinc-100 hover:text-amber-400 transition-colors cursor-pointer line-clamp-1 leading-snug"
                            >
                              {item.title}
                            </h4>

                            {/* Rating Button */}
                            <button
                              type="button"
                              onClick={() => onRateClick(item, item.rating || 5)}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                              title="Rate"
                            >
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{item.rating ? `${item.rating}★` : "Rate"}</span>
                            </button>
                          </div>

                          {/* Row 2: Metadata (Media Type, Year, Genres) */}
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[11px] text-zinc-400">
                            <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-zinc-800/90 text-zinc-300 font-semibold text-[10px]">
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
                              <span className="text-zinc-500">{item.release_year}</span>
                            )}

                            {item.genres && item.genres.length > 0 && (
                              <span className="text-zinc-500 truncate hidden xs:inline max-w-[140px] text-[10px]">
                                {item.genres.slice(0, 2).join(" • ")}
                              </span>
                            )}

                            {/* OTT Badges */}
                            {item.platforms && item.platforms.length > 0 && (
                              <div className="hidden sm:flex items-center gap-1 ml-1">
                                {item.platforms.slice(0, 2).map((plat) => (
                                  <OttBadge key={plat} platform={plat} />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Row 3: Watched Date + Quick Actions */}
                        <div className="pt-2 mt-1.5 border-t border-zinc-800/50 flex items-center justify-between gap-1.5 flex-wrap">
                          {/* Watched Date Picker */}
                          <div className="flex items-center gap-1.5">
                            <DatePickerPopover
                              value={item.watched_date || itemDateStr}
                              onChange={(newDate) => onUpdateWatchedDate(item, newDate)}
                              compact={true}
                            />

                            {/* TV Episode Quick Tracker */}
                            {isTv && (
                              <button
                                type="button"
                                onClick={() => onOpenTvDrawer(item)}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-semibold transition-colors cursor-pointer"
                              >
                                <ListOrdered className="w-3 h-3 text-amber-400" />
                                <span>
                                  {watchedEpCount > 0
                                    ? `${watchedEpCount}${totalEpCount ? `/${totalEpCount}` : ""} Ep`
                                    : "Episodes"}
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Quick Action Icons */}
                          <div className="flex items-center gap-1 ml-auto">
                            <button
                              type="button"
                              onClick={() => onMoveToWatchlistClick(item)}
                              className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Move back to watchlist"
                            >
                              <BookmarkMinus className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteClick(item.id)}
                              className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
