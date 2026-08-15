import { useState, useEffect } from "react";
import { Star, X, Calendar, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { WatchlistMovie } from "@/lib/api";

interface WatchedModalProps {
  movie: WatchlistMovie | null;
  isEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function getTodayLocalDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function WatchedModal({ movie, isEdit, onClose, onSaved }: WatchedModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [date, setDate] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const todayStr = getTodayLocalDateString();

  useEffect(() => {
    if (movie) {
      setRating(movie.rating || 0);
      if (movie.watched_date) {
        setDate(movie.watched_date);
      } else {
        setDate(todayStr);
      }
    }
  }, [movie, todayStr]);

  if (!movie) return null;

  async function handleSave() {
    if (!movie) return;
    setSaving(true);
    try {
      await supabase
        .from("watchlist")
        .update({
          watched: true,
          watched_date: date || null,
          rating: rating > 0 ? rating : null,
        })
        .eq("id", movie.id);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleUnmarkWatched() {
    if (!movie) return;
    setSaving(true);
    try {
      await supabase
        .from("watchlist")
        .update({
          watched: false,
          watched_date: null,
          rating: null,
        })
        .eq("id", movie.id);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const displayRating = hoverRating || rating;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">
              {isEdit ? "Edit Watched Movie" : "Mark as Watched"}
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5 truncate max-w-[240px]">{movie.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-zinc-400 flex items-center gap-1.5 mb-3">
            <Calendar className="w-4 h-4" /> When did you watch it?
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayStr}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-[15px] text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors [color-scheme:dark]"
          />
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-zinc-400 block mb-3">Your rating</label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star === rating ? 0 : star)}
                className="p-1 transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= displayRating
                      ? "fill-amber-400 text-amber-400"
                      : "text-zinc-700"
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-sm text-zinc-400">{rating}/5</span>
            )}
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-2.5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-zinc-100 text-zinc-900 rounded-xl py-3.5 text-[15px] font-semibold hover:bg-white transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Update" : "Save"}
          </button>

          {isEdit && (
            <button
              onClick={handleUnmarkWatched}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 rounded-xl py-2.5 text-xs font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Move back to To Watch
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
