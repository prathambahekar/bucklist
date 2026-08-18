import React, { useState } from "react";
import {
  X,
  Star,
  Calendar,
  CheckCircle2,
  Users,
  Film,
} from "lucide-react";
import type { Blend, BlendMovie } from "../types";
import {
  getPosterUrl,
  handleImageError,
  DEFAULT_POSTER_FALLBACK,
} from "../lib/api";

interface WatchedTogetherModalProps {
  isOpen: boolean;
  onClose: () => void;
  blend: Blend;
  movie: BlendMovie | null;
  onSaveWatchedTogether: (
    blendMovieId: string,
    memberRatings: Record<string, number>,
    watchedDate: string,
    notes?: string
  ) => void;
}

export function WatchedTogetherModal({
  isOpen,
  onClose,
  blend,
  movie,
  onSaveWatchedTogether,
}: WatchedTogetherModalProps) {
  if (!isOpen || !movie) return null;

  const todayStr = new Date().toISOString().split("T")[0];
  const [watchedDate, setWatchedDate] = useState(movie.watchedDate || todayStr);
  const [notes, setNotes] = useState(movie.notes || "");

  // Initialize ratings from existing movie.ratings or defaults
  const initialRatings: Record<string, number> = {};
  blend.members.forEach((mem) => {
    if (movie.ratings && movie.ratings[mem.id]) {
      initialRatings[mem.id] = movie.ratings[mem.id].rating;
    } else {
      initialRatings[mem.id] = 8.0;
    }
  });

  const [ratings, setRatings] = useState<Record<string, number>>(initialRatings);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(blend.members.map((m) => m.id))
  );

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        if (next.size > 1) next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handleRatingChange = (memberId: string, value: number) => {
    setRatings((prev) => ({
      ...prev,
      [memberId]: value,
    }));
  };

  // Calculate Average Blend Score for active ratings
  const activeRatings = Object.entries(ratings)
    .filter(([id]) => selectedMembers.has(id))
    .map(([, r]) => r);
  const avgRating =
    activeRatings.length > 0
      ? Number(
          (
            activeRatings.reduce((sum, val) => sum + val, 0) / activeRatings.length
          ).toFixed(1)
        )
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRatings: Record<string, number> = {};
    selectedMembers.forEach((id) => {
      finalRatings[id] = ratings[id] || 8.0;
    });

    onSaveWatchedTogether(movie.id, finalRatings, watchedDate, notes);
    onClose();
  };

  const posterUrl = getPosterUrl(movie.poster_path);

  return (
    <div
      id="watched-together-modal-backdrop"
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="watched-together-modal"
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-5 sm:p-6 relative text-zinc-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-zinc-800/80">
          <div className="w-12 h-16 rounded-lg bg-zinc-900 overflow-hidden shrink-0 border border-zinc-800">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={movie.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => handleImageError(e, DEFAULT_POSTER_FALLBACK)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                <Film className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className="min-w-0 pr-6">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold mb-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mark Watched Together</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-100 truncate">
              {movie.title}
            </h3>
            <p className="text-xs text-zinc-400">
              {movie.release_year || "Unknown"} • {movie.genres.slice(0, 2).join(", ")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Watched Date */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Watched Date</span>
            </label>
            <input
              type="date"
              value={watchedDate}
              onChange={(e) => setWatchedDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            />
          </div>

          {/* Members who watched */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>Who Watched This Together?</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {blend.members.map((mem) => {
                const isSelected = selectedMembers.has(mem.id);
                const initial = (mem.name || "U").charAt(0).toUpperCase();
                return (
                  <button
                    key={mem.id}
                    type="button"
                    onClick={() => toggleMember(mem.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-zinc-800 border border-zinc-600 text-white shadow-sm"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-zinc-800 text-[9px] font-bold inline-flex items-center justify-center text-zinc-300">
                      {initial}
                    </span>
                    <span>{mem.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Individual Member Ratings */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-zinc-300 fill-zinc-300" />
                <span>Member Ratings</span>
              </label>
              {avgRating !== null && (
                <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                  <span className="text-[11px] text-zinc-400">Average:</span>
                  <span className="text-xs font-bold text-zinc-100">{avgRating}/10</span>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              {blend.members
                .filter((mem) => selectedMembers.has(mem.id))
                .map((mem) => {
                  const currentScore = ratings[mem.id] ?? 8.0;
                  const initial = (mem.name || "U").charAt(0).toUpperCase();
                  return (
                    <div
                      key={mem.id}
                      className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-zinc-800 text-[10px] font-bold inline-flex items-center justify-center text-zinc-200">
                            {initial}
                          </span>
                          <span className="text-xs font-bold text-zinc-200">
                            {mem.name}'s Rating
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-zinc-100">
                          {currentScore.toFixed(1)} / 10
                        </span>
                      </div>

                      {/* Range slider for smooth rating */}
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1.0"
                          max="10.0"
                          step="0.5"
                          value={currentScore}
                          onChange={(e) =>
                            handleRatingChange(mem.id, parseFloat(e.target.value))
                          }
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                      </div>

                      {/* Quick Rating Presets */}
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-800/40 text-[10px]">
                        {[6, 7, 8, 9, 10].map((quick) => (
                          <button
                            key={quick}
                            type="button"
                            onClick={() => handleRatingChange(mem.id, quick)}
                            className={`py-0.5 px-2 rounded font-mono font-semibold transition-colors cursor-pointer ${
                              currentScore === quick
                                ? "bg-white text-zinc-950 font-bold"
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            {quick}★
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Quick Notes */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Watched on Friday night, highly recommended"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              maxLength={120}
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Save to Watched History</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
