import React, { useState, useMemo } from "react";
import {
  Layers,
  Sparkles,
  Plus,
  Search,
  CheckCircle2,
  Star,
  Clock,
  ChevronRight,
  X,
  Edit2,
  Trash2,
  PlusCircle,
  Film,
  Tv,
  Eye,
  Check,
} from "lucide-react";
import type { WatchlistMovie, MovieCollection } from "../types";
import {
  getAllComputedCollections,
  createCustomCollection,
  updateCustomCollection,
  deleteCustomCollection,
  addMovieToCollection,
  removeMovieFromCollection,
  type ComputedCollection,
} from "../lib/collections";
import { getPosterUrl } from "../lib/api";

interface CollectionsViewProps {
  watchlist: WatchlistMovie[];
  customCollections: MovieCollection[];
  onCollectionsChange: (collections: MovieCollection[]) => void;
  onMovieClick: (movie: WatchlistMovie) => void;
  onMarkWatched: (movie: WatchlistMovie) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  watchlist,
  customCollections,
  onCollectionsChange,
  onMovieClick,
  onMarkWatched,
}) => {
  const [filterTab, setFilterTab] = useState<"all" | "franchises" | "custom">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  // Create / Edit Custom Collection Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<MovieCollection | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalDesc, setModalDesc] = useState("");
  const [selectedMovieIds, setSelectedMovieIds] = useState<string[]>([]);
  const [modalMovieSearch, setModalMovieSearch] = useState("");

  // Add movies to existing collection modal state
  const [isAddMoviesPickerOpen, setIsAddMoviesPickerOpen] = useState(false);

  // Compute all collections
  const computedCollections = useMemo(() => {
    return getAllComputedCollections(watchlist, customCollections);
  }, [watchlist, customCollections]);

  // Filter collections
  const filteredCollections = useMemo(() => {
    return computedCollections.filter((col) => {
      if (filterTab === "franchises" && col.type !== "franchise") return false;
      if (filterTab === "custom" && col.type !== "custom") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = col.name.toLowerCase().includes(q);
        const matchDesc = col.description?.toLowerCase().includes(q);
        const matchMovies = col.movies.some((m) => m.title.toLowerCase().includes(q));
        return matchName || matchDesc || matchMovies;
      }
      return true;
    });
  }, [computedCollections, filterTab, searchQuery]);

  // Selected collection object
  const activeCollection = useMemo(() => {
    if (!selectedCollectionId) return null;
    return computedCollections.find((c) => c.id === selectedCollectionId) || null;
  }, [selectedCollectionId, computedCollections]);

  // Handle open create modal
  const handleOpenCreateModal = () => {
    setEditingCollection(null);
    setModalName("");
    setModalDesc("");
    setSelectedMovieIds([]);
    setModalMovieSearch("");
    setIsCreateModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEditModal = (col: ComputedCollection) => {
    if (!col.rawCollection) return;
    setEditingCollection(col.rawCollection);
    setModalName(col.name);
    setModalDesc(col.description || "");
    setSelectedMovieIds(col.rawCollection.movie_ids);
    setModalMovieSearch("");
    setIsCreateModalOpen(true);
  };

  // Save create/edit modal
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalName.trim()) return;

    if (editingCollection) {
      updateCustomCollection({
        ...editingCollection,
        name: modalName.trim(),
        description: modalDesc.trim() || undefined,
        movie_ids: selectedMovieIds,
      });
    } else {
      createCustomCollection(
        modalName.trim(),
        modalDesc.trim() || undefined,
        selectedMovieIds
      );
    }

    // Refresh custom collections
    const raw = localStorage.getItem("bucklist_collections_v1");
    if (raw) {
      onCollectionsChange(JSON.parse(raw));
    }
    setIsCreateModalOpen(false);
  };

  // Handle delete collection
  const handleDeleteCollection = (id: string) => {
    if (window.confirm("Are you sure you want to delete this collection?")) {
      deleteCustomCollection(id);
      const raw = localStorage.getItem("bucklist_collections_v1");
      if (raw) {
        onCollectionsChange(JSON.parse(raw));
      }
      if (selectedCollectionId === id) {
        setSelectedCollectionId(null);
      }
    }
  };

  // Handle remove movie from active custom collection
  const handleRemoveMovieFromCol = (movieId: string) => {
    if (!activeCollection?.rawCollection) return;
    removeMovieFromCollection(activeCollection.rawCollection.id, movieId);
    const raw = localStorage.getItem("bucklist_collections_v1");
    if (raw) {
      onCollectionsChange(JSON.parse(raw));
    }
  };

  // Handle add movie to active custom collection
  const handleToggleMovieInActiveCol = (movieId: string) => {
    if (!activeCollection?.rawCollection) return;
    const exists = activeCollection.rawCollection.movie_ids.includes(movieId);
    if (exists) {
      removeMovieFromCollection(activeCollection.rawCollection.id, movieId);
    } else {
      addMovieToCollection(activeCollection.rawCollection.id, movieId);
    }
    const raw = localStorage.getItem("bucklist_collections_v1");
    if (raw) {
      onCollectionsChange(JSON.parse(raw));
    }
  };

  const formatDuration = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const m = mins % 60;
    if (hours === 0) return `${m}m`;
    if (m === 0) return `${hours}h`;
    return `${hours}h ${m}m`;
  };

  return (
    <div
      id="collections-view-container"
      className="w-full space-y-6 pb-36 sm:pb-28 animate-in fade-in duration-200"
    >
      {/* Top Header & Actions Bar */}
      <div className="flex flex-row items-center justify-between gap-3 pt-2 mb-2">
        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          Collections
        </h2>

        <button
          type="button"
          id="create-collection-btn"
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        {/* Category Tabs */}
        <div
          id="collection-type-tabs"
          className="flex items-center gap-5 text-sm shrink-0 w-full sm:w-auto overflow-x-auto no-scrollbar"
        >
          <button
            type="button"
            id="tab-col-all"
            onClick={() => setFilterTab("all")}
            className={`font-semibold transition-all cursor-pointer pb-1.5 border-b-2 whitespace-nowrap ${
              filterTab === "all"
                ? "border-amber-500 text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            All Collections
          </button>
          <button
            type="button"
            id="tab-col-franchises"
            onClick={() => setFilterTab("franchises")}
            className={`font-semibold transition-all cursor-pointer pb-1.5 border-b-2 whitespace-nowrap ${
              filterTab === "franchises"
                ? "border-amber-500 text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Franchises
          </button>
          <button
            type="button"
            id="tab-col-custom"
            onClick={() => setFilterTab("custom")}
            className={`font-semibold transition-all cursor-pointer pb-1.5 border-b-2 whitespace-nowrap ${
              filterTab === "custom"
                ? "border-amber-500 text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Custom Lists
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:max-w-xs shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            id="collections-search-input"
            placeholder="Search collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-zinc-900/40 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-amber-500/50 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Collections Grid */}
      {filteredCollections.length === 0 ? (
        <div className="py-14 px-4 text-center bg-zinc-900/30 rounded-2xl border border-zinc-800/80">
          <Layers className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
          <h3 className="text-base font-semibold text-zinc-200">No collections found</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No collections match "${searchQuery}"`
              : "Add famous movies (like Harry Potter, Lord of the Rings, Avengers) to see automatic franchises, or create your own custom collection."}
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs inline-flex items-center gap-1.5 hover:bg-amber-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Custom Collection</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCollections.map((col) => {
            const isCompleted = col.totalMovies > 0 && col.watchedMoviesCount === col.totalMovies;
            return (
              <div
                key={col.id}
                id={`collection-card-${col.id}`}
                onClick={() => setSelectedCollectionId(col.id)}
                className="group relative bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/90 hover:border-zinc-700/90 rounded-2xl p-4 transition-all duration-200 shadow-sm hover:shadow-lg flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Top Poster Deck / Fan-out visual */}
                  <div className="relative h-44 w-full rounded-xl bg-zinc-950 overflow-hidden mb-3.5 border border-zinc-800/80 flex items-center justify-center">
                    {/* Background Ambient Backdrop Blur */}
                    {col.coverPoster && (
                      <img
                        src={getPosterUrl(col.coverPoster) || ""}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover blur-xl opacity-25 scale-110"
                      />
                    )}

                    {/* Stacked Fan-out Posters */}
                    <div className="relative z-10 flex items-center justify-center">
                      {col.posters.slice(0, 4).map((posterPath, idx) => {
                        const posterUrl = getPosterUrl(posterPath);
                        // Fan-out rotations and translations
                        const offsets = [
                          { rotate: "-rotate-6", translate: "-translate-x-6", z: "z-10", scale: "scale-95" },
                          { rotate: "rotate-0", translate: "translate-x-0", z: "z-20", scale: "scale-100" },
                          { rotate: "rotate-6", translate: "translate-x-6", z: "z-15", scale: "scale-95" },
                          { rotate: "rotate-12", translate: "translate-x-10", z: "z-5", scale: "scale-90" },
                        ];
                        const offset = offsets[idx % offsets.length];

                        return (
                          <div
                            key={idx}
                            className={`w-20 h-30 rounded-lg overflow-hidden border border-zinc-700/80 shadow-xl transition-transform duration-300 group-hover:scale-105 ${offset.rotate} ${offset.translate} ${offset.z} shrink-0`}
                          >
                            <img
                              src={
                                posterUrl ||
                                "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=60"
                              }
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        );
                      })}

                      {col.posters.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-zinc-600">
                          <Film className="w-8 h-8 mb-1" />
                          <span className="text-xs font-medium">Empty collection</span>
                        </div>
                      )}
                    </div>

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5">
                      {col.type === "franchise" ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Franchise
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          Custom
                        </span>
                      )}
                    </div>

                    {/* Completion Pill */}
                    <div className="absolute top-2.5 right-2.5 z-20">
                      {isCompleted ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-zinc-950 font-bold text-[10px] flex items-center gap-1 shadow-sm">
                          <CheckCircle2 className="w-3 h-3" />
                          100% Watched
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-zinc-950/80 backdrop-blur-sm text-zinc-300 border border-zinc-700/80 text-[10px] font-semibold">
                          {col.watchedMoviesCount}/{col.totalMovies} Watched
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-zinc-100 group-hover:text-amber-400 transition-colors line-clamp-1">
                    {col.name}
                  </h3>
                  {col.description && (
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                      {col.description}
                    </p>
                  )}
                </div>

                {/* Progress Bar & Stats Footer */}
                <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-2.5">
                  {/* Progress Bar */}
                  <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-800/60">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isCompleted ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${col.progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                    <div className="flex items-center gap-3">
                      {col.avgRating && (
                        <span className="flex items-center gap-1 text-amber-400 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {col.avgRating} avg
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        {formatDuration(col.totalDurationMinutes)}
                      </span>
                    </div>

                    <span className="flex items-center gap-1 text-zinc-300 font-semibold group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all">
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Collection Details Modal / Drawer */}
      {activeCollection && (
        <div
          id="collection-details-modal-backdrop"
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedCollectionId(null)}
        >
          <div
            id="collection-details-modal"
            className="w-full max-w-2xl max-h-[90vh] mx-auto bg-zinc-950 sm:bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Banner */}
            <div className="relative p-5 sm:p-6 bg-gradient-to-b from-zinc-850 to-zinc-900 border-b border-zinc-800">
              <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-3 sm:hidden" />

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    {activeCollection.type === "franchise" ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                        Franchise
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold uppercase tracking-wider">
                        Custom Collection
                      </span>
                    )}
                    {activeCollection.progressPercent === 100 && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        100% Completed
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-bold text-zinc-100">
                    {activeCollection.name}
                  </h2>
                  {activeCollection.description && (
                    <p className="text-xs text-zinc-400 mt-1">
                      {activeCollection.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {activeCollection.isCustom && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(activeCollection)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        title="Edit collection"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCollection(activeCollection.id)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                        title="Delete collection"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedCollectionId(null)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Stats Summary Bar */}
              <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-center">
                <div>
                  <p className="text-xs text-zinc-500">Progress</p>
                  <p className="text-sm font-bold text-zinc-100 mt-0.5">
                    {activeCollection.watchedMoviesCount}/{activeCollection.totalMovies}
                    <span className="text-xs text-amber-400 font-normal ml-1">
                      ({activeCollection.progressPercent}%)
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Avg Rating</p>
                  <p className="text-sm font-bold text-amber-400 mt-0.5 flex items-center justify-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {activeCollection.avgRating ? `${activeCollection.avgRating} / 5` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Total Duration</p>
                  <p className="text-sm font-bold text-zinc-100 mt-0.5">
                    {formatDuration(activeCollection.totalDurationMinutes)}
                  </p>
                </div>
              </div>
            </div>

            {/* Collection Movies List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Titles in Order ({activeCollection.movies.length})
                </span>

                {activeCollection.isCustom && (
                  <button
                    type="button"
                    onClick={() => setIsAddMoviesPickerOpen(true)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add/Remove Titles</span>
                  </button>
                )}
              </div>

              {activeCollection.movies.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <Film className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No movies in this collection yet.</p>
                  {activeCollection.isCustom && (
                    <button
                      type="button"
                      onClick={() => setIsAddMoviesPickerOpen(true)}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs"
                    >
                      Add Movies
                    </button>
                  )}
                </div>
              ) : (
                activeCollection.movies.map((movie, index) => {
                  const posterUrl = getPosterUrl(movie.poster_path);
                  return (
                    <div
                      key={movie.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 transition-all gap-3 group"
                    >
                      {/* Movie Index & Thumbnail */}
                      <div
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => onMovieClick(movie)}
                      >
                        <span className="text-xs font-bold text-zinc-500 w-5 text-center">
                          {index + 1}
                        </span>
                        <img
                          src={
                            posterUrl ||
                            "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=60"
                          }
                          alt={movie.title}
                          className="w-10 h-14 rounded-lg object-cover border border-zinc-700/80 shrink-0"
                        />
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors truncate">
                            {movie.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400 flex-wrap">
                            {movie.release_year && <span>{movie.release_year}</span>}
                            <span>•</span>
                            <span className="capitalize">{movie.media_type || "movie"}</span>
                            {movie.watched ? (
                              <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                                • <Check className="w-3 h-3 inline" /> Watched
                                {movie.watched_date && ` (${movie.watched_date})`}
                              </span>
                            ) : (
                              <span className="text-amber-400 font-medium">• To Watch</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Rating / Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {movie.rating ? (
                          <button
                            type="button"
                            onClick={() => onMarkWatched(movie)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{movie.rating}★</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onMarkWatched(movie)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                          >
                            Rate
                          </button>
                        )}

                        {activeCollection.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMovieFromCol(movie.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800/80 transition-colors"
                            title="Remove from collection"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Remove Movies Picker Modal for Active Collection */}
      {isAddMoviesPickerOpen && activeCollection?.rawCollection && (
        <div
          id="add-movies-picker-backdrop"
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[110] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsAddMoviesPickerOpen(false)}
        >
          <div
            id="add-movies-picker-modal"
            className="w-full max-w-lg max-h-[85vh] mx-auto bg-zinc-950 sm:bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-100">
                  Select Titles for &ldquo;{activeCollection.name}&rdquo;
                </h3>
                <p className="text-xs text-zinc-400">
                  Check or uncheck titles from your watchlist
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMoviesPickerOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-96 pr-1">
              {watchlist.map((m) => {
                const isChecked = activeCollection.rawCollection?.movie_ids.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleToggleMovieInActiveCol(m.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                      isChecked
                        ? "bg-amber-500/15 border-amber-500/40 text-zinc-100"
                        : "bg-zinc-900/60 hover:bg-zinc-800/80 border-zinc-800/80 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <img
                        src={
                          getPosterUrl(m.poster_path) ||
                          "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=60"
                        }
                        alt={m.title}
                        className="w-8 h-11 rounded-md object-cover border border-zinc-700/80 shrink-0"
                      />
                      <div className="truncate">
                        <p className="text-sm font-semibold truncate">{m.title}</p>
                        <p className="text-xs text-zinc-500">
                          {m.release_year || "Unknown year"} • {m.watched ? "Watched" : "To Watch"}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? "bg-amber-500 text-zinc-950 font-bold"
                          : "border border-zinc-700 bg-zinc-800/60 text-transparent"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAddMoviesPickerOpen(false)}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Custom Collection Modal */}
      {isCreateModalOpen && (
        <div
          id="create-collection-modal-backdrop"
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[110] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            id="create-collection-modal"
            className="w-full max-w-lg max-h-[90vh] mx-auto bg-zinc-950 sm:bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <h3 className="text-base font-bold text-zinc-100">
                {editingCollection ? "Edit Collection" : "Create New Collection"}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="flex-1 flex flex-col overflow-hidden space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Collection Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Christopher Nolan Masterpieces"
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-amber-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mind-bending thrillers and sci-fi epics"
                    value={modalDesc}
                    onChange={(e) => setModalDesc(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Title Selection Checklist */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-300">
                    Select Movies to Include ({selectedMovieIds.length} selected)
                  </label>
                  <input
                    type="text"
                    placeholder="Filter watchlist..."
                    value={modalMovieSearch}
                    onChange={(e) => setModalMovieSearch(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder:text-zinc-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div className="flex-1 overflow-y-auto max-h-56 space-y-1.5 pr-1 border border-zinc-800 rounded-xl p-2 bg-zinc-950/50">
                  {watchlist
                    .filter((m) =>
                      modalMovieSearch.trim()
                        ? m.title.toLowerCase().includes(modalMovieSearch.toLowerCase())
                        : true
                    )
                    .map((movie) => {
                      const isSelected = selectedMovieIds.includes(movie.id);
                      return (
                        <div
                          key={movie.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedMovieIds(selectedMovieIds.filter((id) => id !== movie.id));
                            } else {
                              setSelectedMovieIds([...selectedMovieIds, movie.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-amber-500/15 border-amber-500/40 text-zinc-100"
                              : "bg-zinc-900/60 hover:bg-zinc-800/80 border-zinc-800/80 text-zinc-300"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <img
                              src={
                                getPosterUrl(movie.poster_path) ||
                                "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=60"
                              }
                              alt=""
                              className="w-6 h-8 rounded object-cover border border-zinc-700/80 shrink-0"
                            />
                            <span className="text-xs font-semibold truncate">{movie.title}</span>
                            <span className="text-[10px] text-zinc-500">
                              ({movie.release_year || "N/A"})
                            </span>
                          </div>
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-amber-500 text-zinc-950 font-bold"
                                : "border border-zinc-700 bg-zinc-800 text-transparent"
                            }`}
                          >
                            <Check className="w-3 h-3" />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!modalName.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {editingCollection ? "Save Changes" : "Create Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
