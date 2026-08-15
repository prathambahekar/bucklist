import { useState, useEffect, useCallback, useMemo } from "react";
import { Film, Bookmark, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { WatchlistMovie } from "@/lib/api";
import { SearchBar } from "@/components/SearchBar";
import { MovieCard, WatchedCard } from "@/components/MovieCard";
import { WatchedModal } from "@/components/WatchedModal";
import { MovieDetailsModal } from "@/components/MovieDetailsModal";
import { FilterBar } from "@/components/FilterBar";
import { StatsHeader } from "@/components/StatsHeader";

type Tab = "towatch" | "watched";

export default function App() {
  const [tab, setTab] = useState<Tab>("towatch");
  const [movies, setMovies] = useState<WatchlistMovie[]>([]);
  const [watched, setWatched] = useState<WatchlistMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMovie, setModalMovie] = useState<WatchlistMovie | null>(null);
  const [detailMovie, setDetailMovie] = useState<WatchlistMovie | null>(null);
  const [isEdit, setIsEdit] = useState(false);

  // Filters & Sorting state
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "rating" | "release">("newest");

  const fetchAll = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load watchlist:", error);
      return;
    }

    const all = (data || []) as WatchlistMovie[];
    setMovies(all.filter((m) => !m.watched));
    setWatched(
      all
        .filter((m) => m.watched)
        .sort((a, b) => (b.watched_date || "").localeCompare(a.watched_date || ""))
    );
  }, []);

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  function openWatchedModal(movie: WatchlistMovie) {
    setIsEdit(false);
    setModalMovie(movie);
  }

  function openEditModal(movie: WatchlistMovie) {
    setIsEdit(true);
    setModalMovie(movie);
  }

  function closeModal() {
    setModalMovie(null);
  }

  function onModalSaved() {
    setModalMovie(null);
    fetchAll();
  }

  const existingTmdbIds = useMemo(
    () => new Set<number>([...movies.map((m) => m.tmdb_id), ...watched.map((m) => m.tmdb_id)]),
    [movies, watched]
  );

  // Extract all unique genres across all items
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    [...movies, ...watched].forEach((m) => (m.genres || []).forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [movies, watched]);

  // Extract all unique OTT platforms across all items
  const allPlatforms = useMemo(() => {
    const set = new Set<string>();
    [...movies, ...watched].forEach((m) => (m.platforms || []).forEach((p) => set.add(p)));
    return Array.from(set).sort();
  }, [movies, watched]);

  // Helper to filter and sort list
  const processList = useCallback(
    (list: WatchlistMovie[]) => {
      let filtered = list;

      if (selectedGenre) {
        filtered = filtered.filter((m) => (m.genres || []).includes(selectedGenre));
      }

      if (selectedPlatform) {
        filtered = filtered.filter((m) => (m.platforms || []).includes(selectedPlatform));
      }

      return [...filtered].sort((a, b) => {
        if (sortBy === "rating") {
          return (b.rating || 0) - (a.rating || 0);
        }
        if (sortBy === "release") {
          return (b.release_year || "").localeCompare(a.release_year || "");
        }
        // newest default
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
    },
    [selectedGenre, selectedPlatform, sortBy]
  );

  const displayMovies = useMemo(() => processList(movies), [movies, processList]);
  const displayWatched = useMemo(() => processList(watched), [watched, processList]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {!isSupabaseConfigured && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-300 flex items-center justify-center gap-2 text-center">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Connect Supabase by adding <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong> to your <code>.env</code> file.
          </span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-900">
        <div className="max-w-md mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Bookmark className="w-5 h-5 text-zinc-900 fill-zinc-900" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Bucklist</h1>
          </div>
          <SearchBar onAdded={fetchAll} existingTmdbIds={existingTmdbIds} />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 pb-28">
        {/* Watch Statistics Header */}
        <StatsHeader movies={movies} watched={watched} />

        {/* Filter and Sort Bar */}
        {(allGenres.length > 0 || allPlatforms.length > 0) && (
          <FilterBar
            genres={allGenres}
            selectedGenre={selectedGenre}
            onSelectGenre={setSelectedGenre}
            platforms={allPlatforms}
            selectedPlatform={selectedPlatform}
            onSelectPlatform={setSelectedPlatform}
            sortBy={sortBy}
            onSelectSort={setSortBy}
            activeTab={tab}
          />
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading your watchlist...</p>
          </div>
        ) : tab === "towatch" ? (
          displayMovies.length === 0 ? (
            <EmptyState
              icon={<Search className="w-10 h-10" />}
              title={movies.length === 0 ? "Your watchlist is empty" : "No matching items"}
              message={
                movies.length === 0
                  ? "Search for a movie or TV series above to start building your list."
                  : "Try clearing your genre or platform filters."
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {displayMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onWatched={openWatchedModal}
                  onChanged={fetchAll}
                  onViewDetails={setDetailMovie}
                />
              ))}
            </div>
          )
        ) : displayWatched.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-10 h-10" />}
            title={watched.length === 0 ? "Nothing watched yet" : "No matching watched items"}
            message={
              watched.length === 0
                ? "Movies and series you mark as watched will show up here with your ratings."
                : "Try clearing your genre or platform filters."
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {displayWatched.map((movie) => (
              <WatchedCard
                key={movie.id}
                movie={movie}
                onChanged={fetchAll}
                onEdit={openEditModal}
                onViewDetails={setDetailMovie}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation Bar */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm">
        <nav className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/90 rounded-2xl p-1.5 shadow-2xl shadow-black/80 flex gap-1">
          <button
            onClick={() => setTab("towatch")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
              tab === "towatch"
                ? "bg-zinc-100 text-zinc-900 shadow-md font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Film className="w-4 h-4" />
            <span>To Watch</span>
            {movies.length > 0 && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  tab === "towatch" ? "bg-zinc-900 text-zinc-100" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {movies.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab("watched")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
              tab === "watched"
                ? "bg-zinc-100 text-zinc-900 shadow-md font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Watched</span>
            {watched.length > 0 && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  tab === "watched" ? "bg-zinc-900 text-zinc-100" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {watched.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Edit/Mark Watched Modal */}
      <WatchedModal
        movie={modalMovie}
        isEdit={isEdit}
        onClose={closeModal}
        onSaved={onModalSaved}
      />

      {/* Movie Details Modal */}
      <MovieDetailsModal
        movie={detailMovie}
        onClose={() => setDetailMovie(null)}
        onMarkWatched={openWatchedModal}
      />
    </div>
  );
}

function EmptyState({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-4">
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold text-zinc-300">{title}</h3>
      <p className="text-sm text-zinc-600 mt-1.5 max-w-[240px]">{message}</p>
    </div>
  );
}

