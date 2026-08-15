import { X, Calendar, Star, Check, Film, Tv, PlayCircle } from "lucide-react";
import { getPosterUrl, type WatchlistMovie, type SearchResult } from "@/lib/api";

type ModalMovie = WatchlistMovie | SearchResult;

interface MovieDetailsModalProps {
  movie: ModalMovie | null;
  isSaved?: boolean;
  onClose: () => void;
  onMarkWatched?: (movie: WatchlistMovie) => void;
}

export function MovieDetailsModal({
  movie,
  isSaved = false,
  onClose,
  onMarkWatched,
}: MovieDetailsModalProps) {
  if (!movie) return null;

  const poster = getPosterUrl(movie.poster_path);
  const isWatchlistMovie = "watched" in movie;
  const isTv = movie.media_type === "tv";
  const genres = movie.genres || [];
  const platforms = movie.platforms || [];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md transition-opacity animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-slide-up max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Backdrop Header */}
        <div className="relative h-56 bg-zinc-950 overflow-hidden flex-shrink-0">
          {poster ? (
            <>
              <img
                src={poster}
                alt={movie.title}
                className="w-full h-full object-cover opacity-40 blur-sm scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700">
              <Film className="w-16 h-16 opacity-30" />
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Poster Card Overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end gap-4">
            <div className="w-24 h-36 rounded-xl overflow-hidden bg-zinc-800 border-2 border-zinc-700 shadow-xl flex-shrink-0">
              {poster ? (
                <img src={poster} alt={movie.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs text-center p-2">
                  No image
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    isTv
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  }`}
                >
                  {isTv ? "TV Series" : "Movie"}
                </span>
                {movie.release_year && (
                  <span className="text-xs text-zinc-400 font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-zinc-500" />
                    {movie.release_year}
                  </span>
                )}
              </div>

              <h2 className="text-lg font-bold text-zinc-100 truncate leading-snug">
                {movie.title}
              </h2>

              {isWatchlistMovie && movie.watched && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">
                    <Check className="w-3 h-3" /> Watched
                  </span>
                  {movie.rating && (
                    <div className="flex items-center gap-0.5 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-400">{movie.rating}/5</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Overview / Synopsis */}
          {"overview" in movie && movie.overview && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Synopsis
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed font-normal">
                {movie.overview}
              </p>
            </div>
          )}

          {/* Genres */}
          {genres.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Genres
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {genres.map((g) => (
                  <span
                    key={g}
                    className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/50"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* OTT Streaming Platforms */}
          {platforms.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <PlayCircle className="w-4 h-4" /> Stream On
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {platforms.map((p) => (
                  <span
                    key={p}
                    className="text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        {isWatchlistMovie && !movie.watched && onMarkWatched && (
          <div className="p-4 bg-zinc-950/80 border-t border-zinc-800/80 flex-shrink-0">
            <button
              onClick={() => {
                onClose();
                onMarkWatched(movie);
              }}
              className="w-full flex items-center justify-center gap-2 bg-zinc-100 text-zinc-900 rounded-xl py-3 text-sm font-semibold hover:bg-white transition-colors"
            >
              <Check className="w-4 h-4" />
              Mark as Watched
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
