import React, { useEffect } from "react";
import { X, Flame, Star, Film, Coffee, Check, BookmarkPlus, Gamepad2 } from "lucide-react";
import type { PriorityLevel, SearchResult, WatchlistMovie, AppMode } from "../types";
import { PRIORITY_ORDER, getPriorityConfig } from "../types";
import { getPosterUrl, handleImageError, DEFAULT_POSTER_FALLBACK, DEFAULT_GAME_POSTER_FALLBACK } from "../lib/api";

interface SetPriorityModalProps {
  movie: SearchResult | WatchlistMovie | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectPriority: (priority: PriorityLevel, movie: SearchResult | WatchlistMovie) => void;
  initialPriority?: PriorityLevel;
  appMode?: AppMode;
}

export const SetPriorityModal: React.FC<SetPriorityModalProps> = ({
  movie,
  isOpen,
  onClose,
  onSelectPriority,
  initialPriority = "wanna_see",
  appMode = "cinema",
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (movie && (e.key === "1" || e.key === "2" || e.key === "3" || e.key === "4")) {
        const index = parseInt(e.key, 10) - 1;
        if (PRIORITY_ORDER[index]) {
          onSelectPriority(PRIORITY_ORDER[index], movie);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, movie, onClose, onSelectPriority]);

  if (!isOpen || !movie) return null;

  const isGames = appMode === "games";
  const fallbackImg = isGames ? DEFAULT_GAME_POSTER_FALLBACK : DEFAULT_POSTER_FALLBACK;
  const poster = getPosterUrl(movie.poster_path) || fallbackImg;

  const getPriorityIcon = (lvl: PriorityLevel) => {
    switch (lvl) {
      case "must_watch":
        return <Flame className="w-4 h-4 text-rose-400" />;
      case "very_interested":
        return <Star className="w-4 h-4 text-amber-400 fill-amber-400/30" />;
      case "wanna_see":
        return isGames ? (
          <Gamepad2 className="w-4 h-4 text-zinc-300" />
        ) : (
          <Film className="w-4 h-4 text-zinc-300" />
        );
      case "maybe_later":
        return <Coffee className="w-4 h-4 text-sky-400" />;
      default:
        return <Star className="w-4 h-4 text-zinc-300" />;
    }
  };

  return (
    <div
      id="set-priority-modal-backdrop"
      className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[120] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="set-priority-modal"
        className="w-full max-w-md mx-auto bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl relative animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <BookmarkPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                {isGames ? "Add to Play-list" : "Add to Watchlist"}
              </h3>
              <p className="text-xs text-zinc-400">Select priority for this title</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Movie Info Card */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 mb-4">
          <div className="w-11 h-15 rounded-lg overflow-hidden bg-zinc-950 shrink-0 border border-zinc-800">
            <img
              src={poster}
              alt={movie.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => handleImageError(e, fallbackImg)}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-zinc-100 truncate">{movie.title}</h4>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
              {movie.release_year && <span>{movie.release_year}</span>}
              {movie.genres && movie.genres.length > 0 && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="truncate max-w-[160px] text-zinc-400">
                    {movie.genres.slice(0, 2).join(", ")}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Priority Options List */}
        <div className="space-y-2 mb-2">
          {PRIORITY_ORDER.map((lvl, idx) => {
            const cfg = getPriorityConfig(lvl, appMode);
            const isSelected = initialPriority === lvl;

            return (
              <button
                key={lvl}
                id={`priority-opt-${lvl}`}
                type="button"
                onClick={() => onSelectPriority(lvl, movie)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer text-left group ${
                  isSelected
                    ? `${cfg.badgeBg} ${cfg.badgeBorder} ring-1 ring-amber-500/30`
                    : "bg-zinc-900/40 hover:bg-zinc-900 border-zinc-800/70 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? `${cfg.badgeBg} ${cfg.badgeBorder}`
                        : "bg-zinc-950 border-zinc-800 group-hover:border-zinc-700"
                    }`}
                  >
                    {getPriorityIcon(lvl)}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className={`text-xs sm:text-sm font-bold leading-tight ${cfg.badgeText}`}>
                      {cfg.label}
                    </span>
                    <span className="text-[11px] text-zinc-500 mt-0.5">
                      {cfg.description}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-zinc-700 group-hover:border-zinc-500" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
