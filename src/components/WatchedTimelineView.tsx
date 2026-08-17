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
  ArrowUpDown,
  ListOrdered,
  ChevronDown,
  ChevronsUpDown,
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
  onMoveToWatchlistClick?: (item: WatchlistMovie) => void;
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
  onUpdateWatchedDate,
  onOpenTvDrawer,
  tvProgressMap,
}: WatchedTimelineViewProps) {
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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

  const isAllCollapsed =
    groupedTimeline.length > 0 && groupedTimeline.every((g) => !!collapsedGroups[g.key]);

  const toggleAllGroups = () => {
    if (isAllCollapsed) {
      setCollapsedGroups({});
    } else {
      const nextMap: Record<string, boolean> = {};
      groupedTimeline.forEach((g) => {
        nextMap[g.key] = true;
      });
      setCollapsedGroups(nextMap);
    }
  };

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
    <div id="watched-timeline-container" className="w-full space-y-5 pb-36 sm:pb-24 animate-in fade-in duration-200">
      {/* Streamlined Timeline Controls Row */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 py-0.5 w-full flex-wrap sm:flex-nowrap">
        {/* Left: Grouping Period indicator */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
          <span className="text-zinc-500">Grouped by:</span>
          <span className="capitalize font-semibold text-zinc-200 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-lg">
            {timelinePeriod}
          </span>
        </div>

        {/* Right: Expand/Collapse All + Sort Button & Summary stats */}
        <div className="flex items-center gap-1 sm:gap-1.5 ml-auto shrink-0">
          {avgOverallRating && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
              <Star className="w-3 h-3 fill-amber-400" />
              {avgOverallRating} avg ({totalItemsCount})
            </span>
          )}

          {groupedTimeline.length > 1 && (
            <button
              type="button"
              id="timeline-collapse-all-toggle"
              onClick={toggleAllGroups}
              className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-1.5 sm:px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title={isAllCollapsed ? "Expand all timeline groups" : "Collapse all timeline groups"}
            >
              <ChevronsUpDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
              <span>{isAllCollapsed ? "Expand" : "Collapse"}</span>
            </button>
          )}

          <button
            type="button"
            id="timeline-sort-order-toggle"
            onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
            className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-1.5 sm:px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title={`Sort order: ${sortOrder === "desc" ? "Newest First" : "Oldest First"}`}
          >
            <ArrowUpDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
            <span>{sortOrder === "desc" ? "Newest" : "Oldest"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DESKTOP VIEW: The Classic Spine Timeline Layout (Screen >= sm)         */}
      {/* ========================================================================= */}
      <div className="hidden sm:block relative pl-8 space-y-7 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-[2px] before:bg-zinc-800/90">
        {groupedTimeline.map((group) => {
          const isCollapsed = !!collapsedGroups[group.key];

          return (
            <div key={`desktop-${group.key}`} className="relative space-y-3">
              {/* Spine Node & Milestone Header (Clickable / Collapsible) */}
              <div
                onClick={() => toggleGroupCollapse(group.key)}
                className="relative flex items-center justify-between gap-3 pt-1 pb-1 pr-2 rounded-xl hover:bg-zinc-900/60 cursor-pointer select-none transition-colors group/header"
                title={isCollapsed ? "Click to expand" : "Click to collapse"}
              >
                {/* Node indicator on spine - perfectly centered at X=12px */}
                <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-950 border-2 border-amber-500 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 group-hover/header:border-amber-400 transition-colors">
                  <div
                    className={`w-2 h-2 rounded-full transition-colors ${
                      isCollapsed ? "bg-zinc-600" : "bg-amber-400"
                    }`}
                  />
                </div>

                {/* Milestone Title & Counts */}
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <h3 className="text-sm font-bold text-zinc-100 group-hover/header:text-amber-400 transition-colors tracking-tight">
                    {group.label}
                  </h3>
                  {group.sublabel && (
                    <span className="text-xs text-zinc-400 font-normal">
                      ({group.sublabel})
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-400 border border-zinc-700/40">
                    {group.items.length} {group.items.length === 1 ? "title" : "titles"}
                  </span>
                  {group.avgRating !== null && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/25 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {group.avgRating}★
                    </span>
                  )}
                </div>

                {/* Chevron icon indicator */}
                <div className="flex items-center gap-1.5 text-zinc-500 group-hover/header:text-amber-400 text-xs shrink-0">
                  {isCollapsed && (
                    <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800/80 border border-zinc-700/50 px-2 py-0.5 rounded-md">
                      Collapsed
                    </span>
                  )}
                  <div className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 group-hover/header:border-zinc-700 transition-colors">
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isCollapsed ? "-rotate-90 text-zinc-500" : "rotate-0 text-amber-400"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Group Items: Grid or Cards for Desktop (Hidden if collapsed) */}
              {!isCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-150">
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
                        key={`desktop-item-${item.id}`}
                        id={`timeline-card-desktop-${item.id}`}
                        onClick={() => onItemClick(item)}
                        className="group bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800/80 hover:border-amber-500/35 rounded-2xl p-3.5 flex gap-3.5 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer relative"
                      >
                        {/* Desktop Poster */}
                        <div className="relative w-16 aspect-[2/3] shrink-0 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-800/80 shadow-xs">
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

                        {/* Content Column */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            {/* Row 1: Title & Rating Button */}
                            <div className="flex items-start justify-between gap-2">
                              <h4
                                className="text-sm font-bold text-zinc-100 group-hover:text-amber-400 transition-colors line-clamp-1 leading-snug"
                                title={item.title}
                              >
                                {item.title}
                              </h4>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRateClick(item, item.rating || 5);
                                }}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 text-xs font-bold transition-colors cursor-pointer shrink-0"
                                title="Click to edit rating"
                              >
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span>{item.rating ? `${item.rating}★` : "Rate"}</span>
                              </button>
                            </div>

                            {/* Row 2: Metadata (Media Type, Year, OTT Platforms) */}
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap text-xs text-zinc-400">
                              <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-semibold text-[10px]">
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
                                <span className="text-zinc-400 font-medium">{item.release_year}</span>
                              )}

                              {item.genres && item.genres.length > 0 && (
                                <span className="text-zinc-500 text-[11px] truncate max-w-[160px]">
                                  {item.genres.slice(0, 2).join(" • ")}
                                </span>
                              )}

                              {(() => {
                                const watchedPlat = item.watched_platform || (item.platforms || [])[0];
                                if (!watchedPlat) return null;
                                return (
                                  <div className="flex items-center gap-1 ml-auto">
                                    <OttBadge platform={watchedPlat} size="xs" />
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Row 3: Watched Date + TV episodes + Quick Actions */}
                          <div
                            className="pt-2 mt-2 border-t border-zinc-800/60 flex items-center justify-between gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              <DatePickerPopover
                                value={item.watched_date || itemDateStr}
                                onChange={(newDate) => onUpdateWatchedDate(item, newDate)}
                                compact={true}
                              />

                              {isTv && (
                                <button
                                  type="button"
                                  onClick={() => onOpenTvDrawer(item)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold transition-colors cursor-pointer"
                                >
                                  <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
                                  <span>
                                    {watchedEpCount > 0
                                      ? `${watchedEpCount}${totalEpCount ? `/${totalEpCount}` : ""} Ep`
                                      : "Episodes"}
                                  </span>
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 ml-auto">
                              <button
                                type="button"
                                onClick={() => onDeleteClick(item.id)}
                                className="p-1.5 rounded-lg bg-zinc-950/70 hover:bg-red-950/80 text-zinc-500 hover:text-red-400 border border-zinc-800/80 hover:border-red-500/40 transition-colors cursor-pointer"
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
              )}
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 2. MOBILE VIEW: Dedicated, Sleek Phone-Optimized Timeline (Screen < sm)   */}
      {/* ========================================================================= */}
      <div className="block sm:hidden space-y-6">
        {groupedTimeline.map((group) => {
          const isCollapsed = !!collapsedGroups[group.key];

          return (
            <div key={`mobile-${group.key}`} className="space-y-2.5">
              {/* Mobile Milestone Capsule (Clickable / Collapsible) */}
              <div
                onClick={() => toggleGroupCollapse(group.key)}
                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-900 active:scale-[0.99] border border-zinc-800/90 shadow-2xs cursor-pointer select-none transition-all"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 shadow-xs ${
                      isCollapsed ? "bg-zinc-600" : "bg-amber-400 shadow-amber-400/50"
                    }`}
                  />
                  <span className="text-xs font-bold text-zinc-100 truncate">
                    {group.label}
                  </span>
                  {group.sublabel && (
                    <span className="text-[10px] text-zinc-400 truncate">
                      ({group.sublabel})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400">
                    {group.items.length} {group.items.length === 1 ? "item" : "items"}
                  </span>
                  {group.avgRating !== null && (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      {group.avgRating}★
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                      isCollapsed ? "-rotate-90" : "rotate-0"
                    }`}
                  />
                </div>
              </div>

              {/* Mobile Feed Cards (Hidden if collapsed) */}
              {!isCollapsed && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  {group.items.map((item) => {
                    const poster = getPosterUrl(item.poster_path);
                    const isTv = item.media_type === "tv";
                    const isAnime = checkIsAnime(item);
                    const progressData = tvProgressMap[item.tmdb_id];
                    const watchedEpCount = progressData?.watchedEpisodes?.length || 0;
                    const totalEpCount = progressData?.totalEpisodes;
                    const itemDateStr = getItemDateString(item);
                    const firstOtt = item.watched_platform || (item.platforms || [])[0];

                    return (
                      <div
                        key={`mobile-item-${item.id}`}
                        id={`timeline-card-mobile-${item.id}`}
                        onClick={() => onItemClick(item)}
                        className="group bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800/80 hover:border-amber-500/35 rounded-xl p-2.5 flex items-center gap-2.5 transition-all duration-150 shadow-2xs hover:shadow-md cursor-pointer relative"
                      >
                        {/* Mobile Thumbnail */}
                        <div className="w-12 h-17 rounded-lg overflow-hidden bg-zinc-800 shrink-0 shadow-xs border border-zinc-800/80 relative">
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

                        {/* Mobile Content Column */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5 gap-1.5">
                          {/* Row 1: Title & Rating Button */}
                          <div className="flex items-start justify-between gap-1.5">
                            <h4
                              className="font-semibold text-xs text-zinc-100 truncate group-hover:text-amber-400 transition-colors leading-tight"
                              title={item.title}
                            >
                              {item.title}
                            </h4>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRateClick(item, item.rating || 5);
                              }}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/25 text-[11px] font-bold transition-colors cursor-pointer shrink-0 -mt-0.5"
                              title="Click to edit rating"
                            >
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                              <span>{item.rating ? `${item.rating}★` : "Rate"}</span>
                            </button>
                          </div>

                          {/* Row 2: Metadata (Media Type, Year, OTT Badge, Episode tracker) */}
                          <div className="flex items-center gap-1.5 text-xs flex-wrap">
                            {isAnime ? (
                              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25 shrink-0 flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Anime</span>
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25 shrink-0">
                                {isTv ? "TV" : "Movie"}
                              </span>
                            )}

                            {item.release_year && (
                              <span className="text-[11px] text-zinc-400 font-medium">
                                {item.release_year}
                              </span>
                            )}

                            {firstOtt && (
                              <OttBadge platform={firstOtt} size="xs" />
                            )}

                            {isTv && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenTvDrawer(item);
                                }}
                                className="text-[10px] text-zinc-300 hover:text-amber-300 bg-zinc-800/80 px-1.5 py-0.2 rounded border border-zinc-700/60 font-medium transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                                title="Track episodes"
                              >
                                <Tv className="w-2.5 h-2.5 text-amber-400" />
                                <span>{watchedEpCount}{totalEpCount ? `/${totalEpCount}` : ""} Ep</span>
                              </button>
                            )}
                          </div>

                          {/* Row 3: Watched Date + Quick Actions */}
                          <div
                            className="flex items-center justify-between gap-1.5 pt-1 border-t border-zinc-800/60"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DatePickerPopover
                              value={item.watched_date || itemDateStr}
                              onChange={(newDate) => onUpdateWatchedDate(item, newDate)}
                              compact={true}
                            />

                            {/* Quick Action Icons */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onDeleteClick(item.id)}
                                className="p-1 rounded-lg bg-zinc-950/80 hover:bg-red-950/80 text-zinc-500 hover:text-red-400 border border-zinc-800/80 hover:border-red-500/40 transition-colors cursor-pointer"
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
