import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Shuffle,
  CheckCircle2,
  Clock,
  Star,
  Film,
  Users,
} from "lucide-react";
import type { Blend, BlendMovie, WatchlistMovie } from "../types";
import { pickTonightMovie } from "../lib/blend";
import { getPosterUrl, getBackdropUrl } from "../lib/api";
import { OttBadge } from "./OttBadge";

interface PickTonightModalProps {
  isOpen: boolean;
  onClose: () => void;
  blend: Blend;
  watchlist: WatchlistMovie[];
  onOpenWatchedTogether: (movie: BlendMovie) => void;
}

export function PickTonightModal({
  isOpen,
  onClose,
  blend,
  watchlist,
  onOpenWatchedTogether,
}: PickTonightModalProps) {
  const [selectedMovie, setSelectedMovie] = useState<BlendMovie | null>(null);
  const [recommendationReason, setRecommendationReason] = useState<string>("");
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [isShuffling, setIsShuffling] = useState(false);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [maxRuntime, setMaxRuntime] = useState<number | null>(null);

  // Extract all available genres from unwatched blend movies
  const availableGenres = Array.from(
    new Set(
      blend.movies
        .filter((m) => !m.watchedTogether)
        .flatMap((m) => m.genres || [])
    )
  ).slice(0, 5);

  const doPick = (currentExcluded: string[] = excludedIds) => {
    setIsShuffling(true);
    setTimeout(() => {
      const result = pickTonightMovie(blend, watchlist, {
        excludeIds: currentExcluded,
        genreFilter,
        maxRuntimeMinutes: maxRuntime,
      });

      if (result.selectedMovie) {
        setSelectedMovie(result.selectedMovie);
        setRecommendationReason(result.reason);
        setExcludedIds([...currentExcluded, result.selectedMovie.id]);
      } else {
        setSelectedMovie(null);
        setRecommendationReason(result.reason);
      }
      setIsShuffling(false);
    }, 180);
  };

  useEffect(() => {
    if (isOpen) {
      setExcludedIds([]);
      doPick([]);
    }
  }, [isOpen, blend.id, genreFilter, maxRuntime]);

  if (!isOpen) return null;

  const posterUrl = selectedMovie ? getPosterUrl(selectedMovie.poster_path) : null;
  const backdropUrl = selectedMovie ? getBackdropUrl(selectedMovie.backdrop_path) : null;

  return (
    <div
      id="pick-tonight-modal-backdrop"
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="pick-tonight-modal"
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden relative text-zinc-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 bg-zinc-950/80 backdrop-blur-md text-zinc-400 hover:text-zinc-100 p-1.5 rounded-full border border-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-100">
                Pick Something Tonight
              </h3>
              <p className="text-[11px] text-zinc-400">
                Collaborative recommendation for {blend.name}
              </p>
            </div>
          </div>

          {/* Quick Filters */}
          {availableGenres.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-3 text-[11px]">
              <button
                type="button"
                onClick={() => setGenreFilter(null)}
                className={`py-1 px-2.5 rounded-lg font-semibold shrink-0 transition-colors cursor-pointer ${
                  genreFilter === null
                    ? "bg-white text-zinc-950 font-bold"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                All Genres
              </button>
              {availableGenres.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenreFilter(genreFilter === g ? null : g)}
                  className={`py-1 px-2.5 rounded-lg font-semibold shrink-0 transition-colors cursor-pointer ${
                    genreFilter === g
                      ? "bg-white text-zinc-950 font-bold"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {g}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setMaxRuntime(maxRuntime ? null : 120)}
                className={`py-1 px-2.5 rounded-lg font-semibold shrink-0 transition-colors flex items-center gap-1 cursor-pointer ${
                  maxRuntime
                    ? "bg-white text-zinc-950 font-bold"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>&lt; 2h</span>
              </button>
            </div>
          )}
        </div>

        {/* Candidate Card Content */}
        {selectedMovie ? (
          <div className={`p-4 sm:p-5 transition-opacity duration-200 ${isShuffling ? "opacity-30" : "opacity-100"}`}>
            {/* Backdrop & Poster Hero */}
            <div className="relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 aspect-video sm:aspect-21/9 mb-4">
              {backdropUrl ? (
                <img
                  src={backdropUrl}
                  alt={selectedMovie.title}
                  className="w-full h-full object-cover brightness-60"
                  referrerPolicy="no-referrer"
                />
              ) : posterUrl ? (
                <img
                  src={posterUrl}
                  alt={selectedMovie.title}
                  className="w-full h-full object-cover blur-sm brightness-40"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                  <Film className="w-12 h-12" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

              {/* Floating Content Over Backdrop */}
              <div className="absolute bottom-3 left-3 right-3 flex items-end gap-3">
                <div className="w-14 sm:w-16 aspect-2/3 rounded-lg overflow-hidden shrink-0 border border-zinc-700/80 shadow-lg bg-zinc-900">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={selectedMovie.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      <Film className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-base sm:text-lg font-bold text-zinc-100 truncate drop-shadow-md">
                    {selectedMovie.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-300 drop-shadow-sm mt-0.5">
                    {selectedMovie.release_year && <span>{selectedMovie.release_year}</span>}
                    {selectedMovie.runtime && <span>• {selectedMovie.runtime}</span>}
                    {selectedMovie.vote_average && (
                      <span className="flex items-center gap-0.5 text-zinc-200 font-semibold">
                        <Star className="w-3 h-3 fill-zinc-200 text-zinc-200" />
                        {selectedMovie.vote_average.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Why This Pick Badge */}
            {recommendationReason && (
              <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium mb-3.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                <span>{recommendationReason}</span>
              </div>
            )}

            {/* Member Want Badges */}
            <div className="mb-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3 h-3 text-zinc-400" />
                <span>Group Interest</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {blend.members.map((mem) => {
                  const wants = selectedMovie.wantedByMemberIds.includes(mem.id);
                  const initial = (mem.name || "U").charAt(0).toUpperCase();
                  return (
                    <div
                      key={mem.id}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        wants
                          ? "bg-rose-500/15 border border-rose-500/30 text-rose-300"
                          : "bg-zinc-900 border border-zinc-800 text-zinc-500"
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-zinc-800 text-[9px] font-bold inline-flex items-center justify-center text-zinc-300">
                        {initial}
                      </span>
                      <span>{mem.name}:</span>
                      <span className="font-bold">{wants ? "Wants to watch" : "Unmarked"}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Genres & Platforms */}
            <div className="flex flex-wrap items-center gap-1.5 mb-5">
              {(selectedMovie.genres || []).map((g) => (
                <span
                  key={g}
                  className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400"
                >
                  {g}
                </span>
              ))}
              {(selectedMovie.platforms || []).map((p) => (
                <OttBadge key={p} platform={p} />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => doPick()}
                className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Shuffle className={`w-4 h-4 text-zinc-300 ${isShuffling ? "animate-spin" : ""}`} />
                <span>Pick Another</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWatchedTogether(selectedMovie);
                }}
                className="py-2.5 px-3 bg-amber-400 hover:bg-amber-300 text-zinc-950 rounded-xl text-xs font-bold transition-all shadow-sm shadow-amber-950/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Watch This</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-500">
              <Film className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-200 mb-1">
              No recommendations available
            </h4>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-4">
              Add more movies to this Blend to unlock intelligent recommendations for your movie nights.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
