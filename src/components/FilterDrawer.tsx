import React, { useState } from "react";
import {
  X,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Film,
  Tv,
  Sparkles,
  Calendar,
  CalendarRange,
  CalendarDays,
} from "lucide-react";
import {
  PriorityLevel,
  PRIORITY_CONFIGS,
  PRIORITY_ORDER,
  WatchedCategory,
  TimelinePeriod,
  AppMode,
} from "../types";
import { getPlatformAccentTheme } from "./OttBadge";

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tab: "towatch" | "watched" | "blend" | "settings";
  selectedPriorityFilter: PriorityLevel | "all";
  onSelectPriority: (priority: PriorityLevel | "all") => void;
  priorityCounts: {
    all: number;
    must_watch: number;
    very_interested: number;
    wanna_see: number;
    maybe_later: number;
  };
  toWatchSortBy: "priority" | "newest" | "release" | "title";
  onChangeToWatchSortBy: (sort: "priority" | "newest" | "release" | "title") => void;
  watchedSortBy?: "newest" | "rating" | "priority" | "release" | "title";
  onChangeWatchedSortBy?: (sort: "newest" | "rating" | "priority" | "release" | "title") => void;
  watchedCategory?: WatchedCategory;
  onSelectWatchedCategory?: (category: WatchedCategory) => void;
  watchedCounts?: {
    all: number;
    movies: number;
    series: number;
    anime: number;
  };
  timelinePeriod?: TimelinePeriod;
  onChangeTimelinePeriod?: (period: TimelinePeriod) => void;
  allPlatforms: string[];
  selectedPlatform: string | null;
  onSelectPlatform: (platform: string | null) => void;
  allGenres: string[];
  selectedGenre: string | null;
  onSelectGenre: (genre: string | null) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  appMode?: AppMode;
}

export function FilterDrawer({
  isOpen,
  onClose,
  tab,
  selectedPriorityFilter,
  onSelectPriority,
  priorityCounts,
  toWatchSortBy,
  onChangeToWatchSortBy,
  watchedSortBy = "newest",
  onChangeWatchedSortBy,
  watchedCategory = "all",
  onSelectWatchedCategory,
  watchedCounts = { all: 0, movies: 0, series: 0, anime: 0 },
  timelinePeriod = "week",
  onChangeTimelinePeriod,
  allPlatforms,
  selectedPlatform,
  onSelectPlatform,
  allGenres,
  selectedGenre,
  onSelectGenre,
  onResetFilters,
  hasActiveFilters,
  appMode = "cinema",
}: FilterDrawerProps) {
  const isGames = appMode === "games";
  // Section expand/collapse state
  const [isPriorityOpen, setIsPriorityOpen] = useState(true);
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isTimelinePeriodOpen, setIsTimelinePeriodOpen] = useState(true);
  const [isSortOpen, setIsSortOpen] = useState(true);
  const [isPlatformOpen, setIsPlatformOpen] = useState(true);
  const [isGenreOpen, setIsGenreOpen] = useState(true);

  // Mobile "Show more" state for platforms and genres
  const [showAllPlatformsMobile, setShowAllPlatformsMobile] = useState(false);
  const [showAllGenresMobile, setShowAllGenresMobile] = useState(false);

  if (!isOpen) return null;

  // Number of items to show on mobile before "Show more"
  const MOBILE_PLATFORMS_LIMIT = 4;
  const MOBILE_GENRES_LIMIT = 5;

  const visiblePlatformsMobile = showAllPlatformsMobile
    ? allPlatforms
    : allPlatforms.slice(0, MOBILE_PLATFORMS_LIMIT);

  // Ensure if an item is selected on mobile, it remains visible even if outside first 4
  const finalMobilePlatforms = showAllPlatformsMobile
    ? allPlatforms
    : selectedPlatform && !visiblePlatformsMobile.includes(selectedPlatform)
    ? [...visiblePlatformsMobile, selectedPlatform]
    : visiblePlatformsMobile;

  const visibleGenresMobile = showAllGenresMobile
    ? allGenres
    : allGenres.slice(0, MOBILE_GENRES_LIMIT);

  const finalMobileGenres = showAllGenresMobile
    ? allGenres
    : selectedGenre && !visibleGenresMobile.includes(selectedGenre)
    ? [...visibleGenresMobile, selectedGenre]
    : visibleGenresMobile;

  return (
    <div
      id="filter-drawer-backdrop"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[65] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-200"
      onClick={onClose}
    >
      <div
        id="filter-drawer"
        className="w-full max-w-lg bg-zinc-950/95 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[88vh] border border-zinc-800/40 backdrop-blur-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden shrink-0">
          <div className="w-12 h-1.5 bg-zinc-700/60 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-2.5 sm:pt-6 pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-base font-bold text-zinc-100 tracking-tight">
              Filters & Sorting
            </h3>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                id="reset-all-filters-btn"
                onClick={onResetFilters}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors font-medium cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
            <button
              type="button"
              id="apply-filter-drawer-btn"
              onClick={onClose}
              className="px-4 py-1.5 rounded-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs sm:text-xs transition-colors cursor-pointer ml-1 shadow-sm"
            >
              Done
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-5 sm:px-6 py-3.5 space-y-4 sm:space-y-5 overflow-y-auto">
          {/* Priority Section */}
          {tab === "towatch" && (
            <div id="drawer-priority-group" className="space-y-2">
              <button
                type="button"
                id="toggle-priority-collapse-btn"
                onClick={() => setIsPriorityOpen(!isPriorityOpen)}
                className="w-full flex items-center justify-between text-[11px] font-semibold tracking-wider text-zinc-400 uppercase hover:text-zinc-200 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Priority</span>
                  {selectedPriorityFilter !== "all" && (
                    <span className="text-[10px] lowercase bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full font-medium">
                      {PRIORITY_CONFIGS[selectedPriorityFilter].shortLabel}
                    </span>
                  )}
                </div>
                <div className="text-zinc-500 group-hover:text-zinc-300 transition-transform">
                  {isPriorityOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>

              {isPriorityOpen && (
                <div className="flex flex-wrap gap-2 animate-in fade-in duration-150">
                  {/* All Option */}
                  <button
                    type="button"
                    id="drawer-filter-priority-all"
                    onClick={() => onSelectPriority("all")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      selectedPriorityFilter === "all"
                        ? "bg-amber-400 text-zinc-950 font-bold shadow-xs"
                        : "bg-zinc-900/90 hover:bg-zinc-850 text-zinc-300 border border-zinc-800/50"
                    }`}
                  >
                    <span>All</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      selectedPriorityFilter === "all" ? "bg-zinc-950/20 text-zinc-950" : "bg-zinc-800 text-zinc-400"
                    }`}>
                      {priorityCounts.all}
                    </span>
                  </button>

                  {/* Priority Levels */}
                  {PRIORITY_ORDER.map((lvl) => {
                    const cfg = PRIORITY_CONFIGS[lvl];
                    const count = priorityCounts[lvl];
                    const isSelected = selectedPriorityFilter === lvl;

                    return (
                      <button
                        key={lvl}
                        type="button"
                        id={`drawer-filter-priority-${lvl}`}
                        onClick={() => onSelectPriority(isSelected ? "all" : lvl)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? `${cfg.badgeBg} ${cfg.badgeText} ring-1 ring-current/40 shadow-xs font-bold`
                            : "bg-zinc-900/90 hover:bg-zinc-850 text-zinc-300 border border-zinc-800/50"
                        }`}
                      >
                        <span>{cfg.shortLabel}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? "bg-zinc-950/30 text-current" : "bg-zinc-800 text-zinc-400"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Watched Tab: Category Selection (All / Movies / Series / Anime) - Cinema mode only */}
          {!isGames && tab === "watched" && onSelectWatchedCategory && (
            <div id="drawer-watched-category-group" className="space-y-2">
              <button
                type="button"
                id="toggle-category-collapse-btn"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="w-full flex items-center justify-between text-[11px] font-semibold tracking-wider text-zinc-400 uppercase hover:text-zinc-200 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Media Type</span>
                  {watchedCategory !== "all" && (
                    <span className="text-[10px] capitalize bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full font-medium">
                      {watchedCategory}
                    </span>
                  )}
                </div>
                <div className="text-zinc-500 group-hover:text-zinc-300 transition-transform">
                  {isCategoryOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>

              {isCategoryOpen && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in duration-150">
                  <button
                    type="button"
                    id="drawer-watched-category-all"
                    onClick={() => onSelectWatchedCategory("all")}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      watchedCategory === "all"
                        ? "bg-amber-400 text-zinc-950 font-bold shadow-xs"
                        : "bg-zinc-900/90 hover:bg-zinc-850 text-zinc-300 border border-zinc-800/50"
                    }`}
                  >
                    <span>All</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        watchedCategory === "all"
                          ? "bg-zinc-950/20 text-zinc-950"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {watchedCounts.all}
                    </span>
                  </button>

                  <button
                    type="button"
                    id="drawer-watched-category-movies"
                    onClick={() => onSelectWatchedCategory("movies")}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      watchedCategory === "movies"
                        ? "bg-amber-400 text-zinc-950 font-bold shadow-xs"
                        : "bg-zinc-900/90 hover:bg-zinc-850 text-zinc-300 border border-zinc-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 shrink-0" />
                      <span>Movies</span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        watchedCategory === "movies"
                          ? "bg-zinc-950/20 text-zinc-950"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {watchedCounts.movies}
                    </span>
                  </button>

                  <button
                    type="button"
                    id="drawer-watched-category-series"
                    onClick={() => onSelectWatchedCategory("series")}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      watchedCategory === "series"
                        ? "bg-amber-400 text-zinc-950 font-bold shadow-xs"
                        : "bg-zinc-900/90 hover:bg-zinc-850 text-zinc-300 border border-zinc-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Tv className="w-3.5 h-3.5 shrink-0" />
                      <span>Series</span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        watchedCategory === "series"
                          ? "bg-zinc-950/20 text-zinc-950"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {watchedCounts.series}
                    </span>
                  </button>

                  <button
                    type="button"
                    id="drawer-watched-category-anime"
                    onClick={() => onSelectWatchedCategory("anime")}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      watchedCategory === "anime"
                        ? "bg-amber-400 text-zinc-950 font-bold shadow-xs"
                        : "bg-zinc-900/90 hover:bg-zinc-850 text-zinc-300 border border-zinc-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Anime</span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        watchedCategory === "anime"
                          ? "bg-zinc-950/20 text-zinc-950"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {watchedCounts.anime}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Watched Tab: Timeline Grouping Period */}
          {tab === "watched" && onChangeTimelinePeriod && (
            <div id="drawer-timeline-period-group" className="space-y-2">
              <button
                type="button"
                id="toggle-timeline-period-collapse-btn"
                onClick={() => setIsTimelinePeriodOpen(!isTimelinePeriodOpen)}
                className="w-full flex items-center justify-between text-[11px] font-semibold tracking-wider text-zinc-400 uppercase hover:text-zinc-200 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Timeline Grouping</span>
                  <span className="text-[10px] capitalize text-zinc-500 font-normal">
                    {timelinePeriod}
                  </span>
                </div>
                <div className="text-zinc-500 group-hover:text-zinc-300 transition-transform">
                  {isTimelinePeriodOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>

              {isTimelinePeriodOpen && (
                <div className="grid grid-cols-3 gap-2 animate-in fade-in duration-150">
                  <button
                    type="button"
                    id="drawer-timeline-period-month"
                    onClick={() => onChangeTimelinePeriod("month")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      timelinePeriod === "month"
                        ? "bg-zinc-100 text-zinc-950 font-bold shadow-xs"
                        : "bg-zinc-900/90 hover:bg-zinc-850 text-zinc-300 border border-zinc-800/50"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Month</span>
                  </button>

                  <button
                    type="button"
                    id="drawer-timeline-period-week"
                    onClick={() => onChangeTimelinePeriod("week")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      timelinePeriod === "week"
                        ? "bg-zinc-100 text-zinc-950 font-bold shadow-xs"
                        : "bg-zinc-900/90 hover:bg-zinc-850 text-zinc-300 border border-zinc-800/50"
                    }`}
                  >
                    <CalendarRange className="w-3.5 h-3.5" />
                    <span>Week</span>
                  </button>

                  <button
                    type="button"
                    id="drawer-timeline-period-year"
                    onClick={() => onChangeTimelinePeriod("year")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      timelinePeriod === "year"
                        ? "bg-zinc-100 text-zinc-950 font-bold shadow-xs"
                        : "bg-zinc-900/90 hover:bg-zinc-850 text-zinc-300 border border-zinc-800/50"
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Year</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sort Selection (Available for both To-Watch and Watched tabs) */}
          {(tab === "towatch" || tab === "watched") && (
            <div id="drawer-sort-group" className="space-y-2">
              <button
                type="button"
                id="toggle-sort-collapse-btn"
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="w-full flex items-center justify-between text-[11px] font-semibold tracking-wider text-zinc-400 uppercase hover:text-zinc-200 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-1.5">
                  <span>SORT BY</span>
                  <span className="text-[10px] lowercase text-zinc-500 font-normal">
                    {tab === "towatch"
                      ? toWatchSortBy === "priority"
                        ? "priority"
                        : toWatchSortBy === "newest"
                        ? "recently added"
                        : toWatchSortBy === "release"
                        ? "release year"
                        : "title"
                      : watchedSortBy === "priority"
                      ? "priority"
                      : watchedSortBy === "rating"
                      ? "rating"
                      : watchedSortBy === "newest"
                      ? "recently watched"
                      : watchedSortBy === "release"
                      ? "release year"
                      : "title"}
                  </span>
                </div>
                <div className="text-zinc-500 group-hover:text-zinc-300 transition-transform">
                  {isSortOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>

              {isSortOpen && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in duration-150">
                  {tab === "towatch"
                    ? [
                        { id: "priority", label: "Priority (High → Low)" },
                        { id: "newest", label: "Recently Added" },
                        { id: "release", label: "Release Year" },
                        { id: "title", label: "Title (A - Z)" },
                      ].map((s) => {
                        const active = toWatchSortBy === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            id={`drawer-sort-${s.id}`}
                            onClick={() => onChangeToWatchSortBy(s.id as any)}
                            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all text-center cursor-pointer ${
                              active
                                ? "bg-zinc-100 text-zinc-950 font-bold shadow-xs"
                                : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/50"
                            }`}
                          >
                            {s.label}
                          </button>
                        );
                      })
                    : [
                        { id: "priority", label: "Priority (High → Low)" },
                        { id: "newest", label: "Recently Added" },
                        { id: "rating", label: "Rating (High → Low)" },
                        { id: "release", label: "Release Year" },
                        { id: "title", label: "Title (A - Z)" },
                      ].map((s) => {
                        const active = watchedSortBy === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            id={`drawer-watched-sort-${s.id}`}
                            onClick={() => onChangeWatchedSortBy && onChangeWatchedSortBy(s.id as any)}
                            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all text-center cursor-pointer ${
                              active
                                ? "bg-zinc-100 text-zinc-950 font-bold shadow-xs"
                                : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/50"
                            }`}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                </div>
              )}
            </div>
          )}

          {/* Platforms Filter */}
          {allPlatforms.length > 0 && (
            <div id="drawer-platform-group" className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  id="toggle-platform-collapse-btn"
                  onClick={() => setIsPlatformOpen(!isPlatformOpen)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase hover:text-zinc-200 transition-colors cursor-pointer group"
                >
                  <span>{isGames ? "Gaming Platform" : "Streaming Platform"}</span>
                  {selectedPlatform && (
                    <span className="text-[10px] lowercase bg-zinc-800 text-zinc-200 px-1.5 py-0.2 rounded-full font-medium">
                      {selectedPlatform}
                    </span>
                  )}
                  <span className="text-zinc-500 group-hover:text-zinc-300">
                    {isPlatformOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </button>

                {selectedPlatform && (
                  <button
                    type="button"
                    onClick={() => onSelectPlatform(null)}
                    className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {isPlatformOpen && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  {/* Desktop view: show all platforms */}
                  <div className="hidden sm:flex sm:flex-wrap sm:gap-2">
                    <button
                      type="button"
                      id="drawer-platform-all"
                      onClick={() => onSelectPlatform(null)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        selectedPlatform === null
                          ? "bg-zinc-100 text-zinc-950 font-bold shadow-xs"
                          : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/50"
                      }`}
                    >
                      All
                    </button>
                    {allPlatforms.map((p) => {
                      const active = selectedPlatform === p;
                      const theme = getPlatformAccentTheme(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          id={`drawer-platform-${p.replace(/\s+/g, '-').toLowerCase()}`}
                          onClick={() => onSelectPlatform(active ? null : p)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                            active
                              ? `${theme.bg} ${theme.text} ring-1.5 ring-current shadow-xs font-bold`
                              : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800/50"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  {/* Mobile view: top badges + "show more" */}
                  <div className="flex sm:hidden flex-wrap gap-2">
                    <button
                      type="button"
                      id="drawer-platform-all-mobile"
                      onClick={() => onSelectPlatform(null)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        selectedPlatform === null
                          ? "bg-zinc-100 text-zinc-950 font-bold shadow-xs"
                          : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/50"
                      }`}
                    >
                      All
                    </button>
                    {finalMobilePlatforms.map((p) => {
                      const active = selectedPlatform === p;
                      const theme = getPlatformAccentTheme(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          id={`drawer-platform-mobile-${p.replace(/\s+/g, '-').toLowerCase()}`}
                          onClick={() => onSelectPlatform(active ? null : p)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                            active
                              ? `${theme.bg} ${theme.text} ring-1.5 ring-current shadow-xs font-bold`
                              : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800/50"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}

                    {allPlatforms.length > MOBILE_PLATFORMS_LIMIT && (
                      <button
                        type="button"
                        id="toggle-more-platforms-mobile-btn"
                        onClick={() => setShowAllPlatformsMobile(!showAllPlatformsMobile)}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer"
                      >
                        {showAllPlatformsMobile ? "Show less" : `+${allPlatforms.length - finalMobilePlatforms.length} more`}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Genre Filter */}
          {allGenres.length > 0 && (
            <div id="drawer-genre-group" className="space-y-2 pb-4 sm:pb-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  id="toggle-genre-collapse-btn"
                  onClick={() => setIsGenreOpen(!isGenreOpen)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase hover:text-zinc-200 transition-colors cursor-pointer group"
                >
                  <span>Genre</span>
                  {selectedGenre && (
                    <span className="text-[10px] lowercase bg-zinc-800 text-zinc-200 px-1.5 py-0.2 rounded-full font-medium">
                      {selectedGenre}
                    </span>
                  )}
                  <span className="text-zinc-500 group-hover:text-zinc-300">
                    {isGenreOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </button>

                {selectedGenre && (
                  <button
                    type="button"
                    onClick={() => onSelectGenre(null)}
                    className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {isGenreOpen && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  {/* Desktop view: full wrapped badge list */}
                  <div className="hidden sm:flex sm:flex-wrap sm:gap-2 max-h-36 overflow-y-auto pr-1 scrollbar-none">
                    <button
                      type="button"
                      id="drawer-genre-all"
                      onClick={() => onSelectGenre(null)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        selectedGenre === null
                          ? "bg-zinc-100 text-zinc-950 font-bold shadow-xs"
                          : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/50"
                      }`}
                    >
                      All
                    </button>
                    {allGenres.map((g) => {
                      const active = selectedGenre === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          id={`drawer-genre-${g.replace(/\s+/g, '-').toLowerCase()}`}
                          onClick={() => onSelectGenre(active ? null : g)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                            active
                              ? "bg-amber-400 text-zinc-950 font-bold shadow-xs"
                              : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800/50"
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>

                  {/* Mobile view: top badges + "show more" */}
                  <div className="flex sm:hidden flex-wrap gap-2">
                    <button
                      type="button"
                      id="drawer-genre-all-mobile"
                      onClick={() => onSelectGenre(null)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        selectedGenre === null
                          ? "bg-zinc-100 text-zinc-950 font-bold shadow-xs"
                          : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/50"
                      }`}
                    >
                      All
                    </button>
                    {finalMobileGenres.map((g) => {
                      const active = selectedGenre === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          id={`drawer-genre-mobile-${g.replace(/\s+/g, '-').toLowerCase()}`}
                          onClick={() => onSelectGenre(active ? null : g)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                            active
                              ? "bg-amber-400 text-zinc-950 font-bold shadow-xs"
                              : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800/50"
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}

                    {allGenres.length > MOBILE_GENRES_LIMIT && (
                      <button
                        type="button"
                        id="toggle-more-genres-mobile-btn"
                        onClick={() => setShowAllGenresMobile(!showAllGenresMobile)}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer"
                      >
                        {showAllGenresMobile ? "Show less" : `+${allGenres.length - finalMobileGenres.length} more`}
                      </button>
                    )}
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
