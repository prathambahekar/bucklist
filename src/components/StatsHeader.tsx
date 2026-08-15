import { Film, CheckCircle2, Star } from "lucide-react";
import type { WatchlistMovie } from "@/lib/api";

interface StatsHeaderProps {
  movies: WatchlistMovie[];
  watched: WatchlistMovie[];
}

export function StatsHeader({ movies, watched }: StatsHeaderProps) {
  const ratedMovies = watched.filter((m) => m.rating && m.rating > 0);
  const avgRating =
    ratedMovies.length > 0
      ? (
          ratedMovies.reduce((acc, m) => acc + (m.rating || 0), 0) /
          ratedMovies.length
        ).toFixed(1)
      : null;

  if (movies.length === 0 && watched.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2.5 mb-4">
      {/* To Watch Count */}
      <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-1 text-zinc-400 text-[11px] font-medium mb-0.5">
          <Film className="w-3.5 h-3.5 text-blue-400" />
          <span>To Watch</span>
        </div>
        <span className="text-lg font-bold text-zinc-100">{movies.length}</span>
      </div>

      {/* Watched Count */}
      <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-1 text-zinc-400 text-[11px] font-medium mb-0.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          <span>Watched</span>
        </div>
        <span className="text-lg font-bold text-zinc-100">{watched.length}</span>
      </div>

      {/* Average Rating */}
      <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-1 text-zinc-400 text-[11px] font-medium mb-0.5">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>Avg Rating</span>
        </div>
        <span className="text-lg font-bold text-amber-400">
          {avgRating ? `${avgRating}` : "—"}
        </span>
      </div>
    </div>
  );
}
