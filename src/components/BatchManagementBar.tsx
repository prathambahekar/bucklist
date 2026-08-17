import React, { useState } from "react";
import {
  CheckSquare,
  Square,
  CheckCircle2,
  Trash2,
  BookmarkPlus,
  Tag,
  X,
  Sparkles,
  Star,
  Plus,
  Flame,
} from "lucide-react";
import {
  type WatchlistMovie,
  type PriorityLevel,
  PRIORITY_CONFIGS,
  PRIORITY_ORDER,
} from "../types";

interface BatchManagementBarProps {
  selectedIds: string[];
  totalCount: number;
  isWatchedTab: boolean;
  allGenres: string[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBatchMarkWatched?: (rating: number) => void;
  onBatchMoveToWatchlist?: () => void;
  onBatchDelete: () => void;
  onBatchAddGenre?: (genre: string) => void;
  onBatchSetPriority?: (priority: PriorityLevel) => void;
  onExitBatchMode: () => void;
}

export function BatchManagementBar({
  selectedIds,
  totalCount,
  isWatchedTab,
  allGenres,
  onSelectAll,
  onDeselectAll,
  onBatchMarkWatched,
  onBatchMoveToWatchlist,
  onBatchDelete,
  onBatchAddGenre,
  onBatchSetPriority,
  onExitBatchMode,
}: BatchManagementBarProps) {
  const [showRatingMenu, setShowRatingMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [customTag, setCustomTag] = useState("");

  const count = selectedIds.length;
  const isAllSelected = count > 0 && count === totalCount;

  return (
    <div
      id="batch-management-floating-bar"
      className="fixed bottom-4 sm:bottom-6 inset-x-4 max-w-2xl mx-auto z-50 animate-in slide-in-from-bottom-6 duration-200"
    >
      <div className="bg-zinc-900/95 backdrop-blur-md border border-amber-500/40 rounded-2xl p-3 sm:p-3.5 shadow-2xl flex flex-col gap-2.5">
        {/* Top summary row: Selection Counter & Controls */}
        <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-bold text-zinc-100">
            <span className="w-6 h-6 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center text-xs font-black shadow-xs">
              {count}
            </span>
            <span>{count === 1 ? "1 item selected" : `${count} items selected`}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={isAllSelected ? onDeselectAll : onSelectAll}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
            >
              {isAllSelected ? "Deselect All" : `Select All (${totalCount})`}
            </button>
            <button
              type="button"
              onClick={onExitBatchMode}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Exit selection mode"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/80 flex-wrap sm:flex-nowrap">
          {/* Mark as Watched button (if on towatch tab) */}
          {!isWatchedTab && onBatchMarkWatched && (
            <div className="relative flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => onBatchMarkWatched(5)}
                disabled={count === 0}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none text-zinc-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Mark Watched</span>
              </button>
            </div>
          )}

          {/* Move to Watchlist (if on watched tab) */}
          {isWatchedTab && onBatchMoveToWatchlist && (
            <button
              type="button"
              onClick={onBatchMoveToWatchlist}
              disabled={count === 0}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none text-zinc-200 font-bold text-xs transition-colors cursor-pointer"
            >
              <BookmarkPlus className="w-4 h-4 text-amber-400" />
              <span>To Watchlist</span>
            </button>
          )}

          {/* Batch Priority Setting (if on to watch tab) */}
          {!isWatchedTab && onBatchSetPriority && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowPriorityMenu(!showPriorityMenu);
                  setShowTagMenu(false);
                  setShowRatingMenu(false);
                }}
                disabled={count === 0}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                  showPriorityMenu
                    ? "bg-zinc-800 border-amber-500/50 text-amber-300"
                    : "bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 text-zinc-200"
                } disabled:opacity-40 disabled:pointer-events-none`}
                title="Set priority for selected items"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Priority</span>
              </button>

              {showPriorityMenu && (
                <div className="absolute bottom-full mb-2 left-0 sm:left-auto sm:right-0 w-56 bg-zinc-950 border border-zinc-800 rounded-2xl p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                  <div className="text-xs font-bold text-zinc-300 mb-2 px-1">
                    Set Priority for {count} title{count === 1 ? "" : "s"}:
                  </div>
                  <div className="space-y-1">
                    {PRIORITY_ORDER.map((level) => {
                      const cfg = PRIORITY_CONFIGS[level];
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => {
                            onBatchSetPriority(level);
                            setShowPriorityMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors text-left hover:bg-zinc-850 cursor-pointer ${cfg.badgeText} border border-transparent hover:border-zinc-800`}
                        >
                          <span className="font-bold leading-tight text-zinc-200">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Batch Tag / Genre Popover */}
          {onBatchAddGenre && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowTagMenu(!showTagMenu);
                  setShowRatingMenu(false);
                }}
                disabled={count === 0}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                  showTagMenu
                    ? "bg-zinc-800 border-amber-500/50 text-amber-300"
                    : "bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 text-zinc-200"
                } disabled:opacity-40 disabled:pointer-events-none`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Tag</span>
              </button>

              {showTagMenu && (
                <div className="absolute bottom-full mb-2 left-0 sm:left-auto sm:right-0 w-64 bg-zinc-950 border border-zinc-800 rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                  <div className="text-xs font-bold text-zinc-300 mb-2">
                    Apply Genre / Tag:
                  </div>

                  {/* Input for custom tag */}
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <input
                      type="text"
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      placeholder="e.g. Favorite, Sci-Fi..."
                      className="flex-1 bg-zinc-900 border border-zinc-750 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/60"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customTag.trim()) {
                          onBatchAddGenre(customTag.trim());
                          setCustomTag("");
                          setShowTagMenu(false);
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={!customTag.trim()}
                      onClick={() => {
                        if (customTag.trim()) {
                          onBatchAddGenre(customTag.trim());
                          setCustomTag("");
                          setShowTagMenu(false);
                        }
                      }}
                      className="px-2 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick Suggestions from existing tags */}
                  <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar">
                    {allGenres.slice(0, 10).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          onBatchAddGenre(g);
                          setShowTagMenu(false);
                        }}
                        className="w-full text-left px-2 py-1 rounded-lg text-xs text-zinc-300 hover:bg-zinc-850 hover:text-amber-300 transition-colors flex items-center justify-between"
                      >
                        <span>{g}</span>
                        <Plus className="w-3 h-3 text-zinc-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delete selected */}
          <button
            type="button"
            onClick={onBatchDelete}
            disabled={count === 0}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-900/70 text-red-300 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete ({count})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
