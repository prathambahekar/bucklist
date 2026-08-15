import { getPosterUrl, type WatchlistMovie } from "@/lib/api";
import { Star, Trash2, Calendar, Check } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface MovieCardProps {
  movie: WatchlistMovie;
  onWatched: (movie: WatchlistMovie) => void;
  onChanged: () => void;
  onViewDetails?: (movie: WatchlistMovie) => void;
}

export function MovieCard({ movie, onWatched, onChanged, onViewDetails }: MovieCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const poster = getPosterUrl(movie.poster_path);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    try {
      await supabase.from("watchlist").delete().eq("id", movie.id);
      onChanged();
    } finally {
      setDeleting(false);
    }
  }

  const genres = movie.genres || [];
  const platforms = movie.platforms || [];
  const isTv = movie.media_type === "tv";

  return (
    <div
      onClick={() => onViewDetails && onViewDetails(movie)}
      className="flex gap-3.5 bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-3 hover:border-zinc-700 transition-all cursor-pointer group active:scale-[0.99]"
    >
      <div className="w-[68px] h-[102px] rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 relative">
        {poster ? (
          <img src={poster} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px] text-center px-1">
            No image
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-zinc-100 truncate group-hover:text-amber-400 transition-colors">
              {movie.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isTv && (
                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
                  TV Series
                </span>
              )}
              {movie.release_year && (
                <p className="text-xs text-zinc-500">{movie.release_year}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
              confirmDelete
                ? "bg-red-500/15 text-red-400"
                : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {genres.map((g) => (
              <span
                key={g}
                className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {platforms.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {platforms.map((p) => (
              <span
                key={p}
                className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/90 font-medium"
              >
                {p}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-2.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onWatched(movie);
            }}
            className="w-full flex items-center justify-center gap-1.5 bg-zinc-100 text-zinc-900 rounded-xl py-2 text-sm font-medium hover:bg-white transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark as Watched
          </button>
        </div>
      </div>
    </div>
  );
}

interface WatchedCardProps {
  movie: WatchlistMovie;
  onChanged: () => void;
  onEdit: (movie: WatchlistMovie) => void;
  onViewDetails?: (movie: WatchlistMovie) => void;
}

export function WatchedCard({ movie, onChanged, onEdit, onViewDetails }: WatchedCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const poster = getPosterUrl(movie.poster_path);
  const genres = movie.genres || [];
  const isTv = movie.media_type === "tv";

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    try {
      await supabase.from("watchlist").delete().eq("id", movie.id);
      onChanged();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      onClick={() => onViewDetails && onViewDetails(movie)}
      className="flex gap-3.5 bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-3 hover:border-zinc-700 transition-all cursor-pointer group active:scale-[0.99]"
    >
      <div className="w-[68px] h-[102px] rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
        {poster ? (
          <img src={poster} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px] text-center px-1">
            No image
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-zinc-100 truncate group-hover:text-amber-400 transition-colors">
              {movie.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isTv && (
                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
                  TV Series
                </span>
              )}
              {movie.release_year && (
                <p className="text-xs text-zinc-500">{movie.release_year}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
              confirmDelete
                ? "bg-red-500/15 text-red-400"
                : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {genres.map((g) => (
              <span
                key={g}
                className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-2.5 flex items-center gap-3">
          {movie.watched_date && (
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(movie.watched_date)}
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(movie);
            }}
            className="flex items-center gap-1 ml-auto px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-3.5 h-3.5 ${
                    s <= (movie.rating || 0)
                      ? "fill-amber-400 text-amber-400"
                      : "text-zinc-700"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-zinc-400 ml-1">Edit</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
