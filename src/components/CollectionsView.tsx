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
  PlayCircle,
  Trophy,
  ArrowRight,
  ListOrdered,
  SlidersHorizontal,
} from "lucide-react";
import type { WatchlistMovie, MovieCollection } from "../types";
import {
  getAllComputedCollections,
  getLocalCollections,
  createCustomCollection,
  updateCustomCollection,
  deleteCustomCollection,
  addMovieToCollection,
  removeMovieFromCollection,
  type ComputedCollection,
} from "../lib/collections";
import { getPosterUrl } from "../lib/api";
import { OttBadge } from "./OttBadge";

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
  const [filterTab, setFilterTab] = useState<"all" | "franchises" | "custom" | "completed">("all");
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
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Compute all collections
  const computedCollections = useMemo(() => {
    return getAllComputedCollections(watchlist, customCollections);
  }, [watchlist, customCollections]);

  // Summary counts for filter tabs
  const tabCounts = useMemo(() => {
    const total = computedCollections.length;
    const franchises = computedCollections.filter((c) => c.type === "franchise").length;
    const custom = computedCollections.filter((c) => c.type === "custom").length;
    const completed = computedCollections.filter(
      (c) => c.displayTotalCount > 0 && c.watchedMoviesCount === c.displayTotalCount
    ).length;
    return { total, franchises, custom, completed };
  }, [computedCollections]);

  // Overall collection completion stats
  const overallStats = useMemo(() => {
    const totalFranchiseTitles = computedCollections.reduce(
      (acc, c) => acc + c.displayTotalCount,
      0
    );
    const totalWatchedTitles = computedCollections.reduce(
      (acc, c) => acc + c.watchedMoviesCount,
      0
    );
    const percent =
      totalFranchiseTitles > 0
        ? Math.round((totalWatchedTitles / totalFranchiseTitles) * 100)
        : 0;
    return { totalFranchiseTitles, totalWatchedTitles, percent };
  }, [computedCollections]);

  // Filter collections
  const filteredCollections = useMemo(() => {
    return computedCollections.filter((col) => {
      const isCompleted = col.displayTotalCount > 0 && col.watchedMoviesCount === col.displayTotalCount;
      if (filterTab === "franchises" && col.type !== "franchise") return false;
      if (filterTab === "custom" && col.type !== "custom") return false;
      if (filterTab === "completed" && !isCompleted) return false;

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

  // First unwatched movie in the active collection ("Up Next")
  const nextMovieToWatch = useMemo(() => {
    if (!activeCollection) return null;
    return activeCollection.movies.find((m) => !m.watched) || null;
  }, [activeCollection]);

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

    onCollectionsChange(getLocalCollections());
    setIsCreateModalOpen(false);
  };

  // Handle delete collection safely
  const handleExecuteDeleteCollection = (id: string) => {
    deleteCustomCollection(id);
    onCollectionsChange(getLocalCollections());
    setIsConfirmingDelete(false);
    if (selectedCollectionId === id) {
      setSelectedCollectionId(null);
    }
  };

  // Handle remove movie from active custom collection
  const handleRemoveMovieFromCol = (movieId: string) => {
    if (!activeCollection?.rawCollection) return;
    removeMovieFromCollection(activeCollection.rawCollection.id, movieId);
    onCollectionsChange(getLocalCollections());
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
    onCollectionsChange(getLocalCollections());
  };

  const formatDuration = (mins: number) => {
    if (!mins || mins <= 0) return "N/A";
    const hours = Math.floor(mins / 60);
    const m = mins % 60;
    if (hours === 0) return `${m}m`;
    if (m === 0) return `${hours}h`;
    return `${hours}h ${m}m`;
  };

  return (
    <div
      id="collections-view-container"
      className="w-full space-y-4 sm:space-y-5 pb-36 sm:pb-28 animate-in fade-in duration-200"
    >
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
              <span>Collections</span>
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60">
              {computedCollections.length}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Sagas, movie universes, and custom curated lists
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          id="create-collection-btn"
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-zinc-950 font-bold text-xs transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Segmented Filter Pills */}
        <div
          id="collection-type-tabs"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1"
        >
          <button
            type="button"
            id="tab-col-all"
            onClick={() => setFilterTab("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterTab === "all"
                ? "bg-zinc-100 text-zinc-950 font-bold shadow-xs"
                : "bg-zinc-900/80 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
            }`}
          >
            <span>All</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                filterTab === "all" ? "bg-zinc-950/20 text-zinc-950" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {tabCounts.total}
            </span>
          </button>

          <button
            type="button"
            id="tab-col-franchises"
            onClick={() => setFilterTab("franchises")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterTab === "franchises"
                ? "bg-amber-400 text-zinc-950 font-bold shadow-xs"
                : "bg-zinc-900/80 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Franchises</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                filterTab === "franchises" ? "bg-zinc-950/20 text-zinc-950" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {tabCounts.franchises}
            </span>
          </button>

          <button
            type="button"
            id="tab-col-custom"
            onClick={() => setFilterTab("custom")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterTab === "custom"
                ? "bg-zinc-100 text-zinc-950 font-bold shadow-xs"
                : "bg-zinc-900/80 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Custom</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                filterTab === "custom" ? "bg-zinc-950/20 text-zinc-950" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {tabCounts.custom}
            </span>
          </button>

          {tabCounts.completed > 0 && (
            <button
              type="button"
              id="tab-col-completed"
              onClick={() => setFilterTab("completed")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterTab === "completed"
                  ? "bg-emerald-400 text-zinc-950 font-bold shadow-xs"
                  : "bg-zinc-900/80 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80"
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Completed</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  filterTab === "completed" ? "bg-zinc-950/20 text-zinc-950" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {tabCounts.completed}
              </span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:max-w-xs shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            id="collections-search-input"
            placeholder="Search collections or titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-zinc-900/90 border border-zinc-800/90 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-amber-500/50 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Collections Grid */}
      {filteredCollections.length === 0 ? (
        <div className="py-12 px-4 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800/80">
          <Layers className="w-10 h-10 mx-auto text-zinc-600 mb-2.5" />
          <h3 className="text-sm font-semibold text-zinc-200">No collections found</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No collections match "${searchQuery}"`
              : "Add famous movies (like Harry Potter, Dark Knight, Avengers) to unlock smart sagas, or create your own custom lists."}
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="mt-3.5 px-3.5 py-1.5 rounded-xl bg-amber-400 text-zinc-950 font-bold text-xs inline-flex items-center gap-1.5 hover:bg-amber-300 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Custom Collection</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredCollections.map((col) => {
            const isAllWatched =
              col.displayTotalCount > 0 && col.watchedMoviesCount === col.displayTotalCount;
            const firstUnwatched = col.movies.find((m) => !m.watched);

            return (
              <div
                key={col.id}
                id={`collection-card-${col.id}`}
                onClick={() => setSelectedCollectionId(col.id)}
                className="group relative bg-zinc-900/90 hover:bg-zinc-850/90 border border-zinc-800/90 hover:border-zinc-700 rounded-2xl p-3 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between cursor-pointer overflow-hidden"
              >
                {/* Top Poster Showcase */}
                <div>
                  <div className="relative h-28 w-full rounded-xl bg-zinc-950 overflow-hidden mb-2.5 border border-zinc-800/80 flex items-center justify-center">
                    {/* Subtle Backdrop Ambient Glow */}
                    {col.coverPoster && (
                      <img
                        src={getPosterUrl(col.coverPoster) || ""}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover blur-xl opacity-25 scale-110"
                      />
                    )}

                    {/* Overlapping Fan-out Poster Gallery */}
                    <div className="relative z-10 flex items-center justify-center">
                      {col.posters.length === 1 ? (
                        <div className="w-14 h-20 rounded-lg overflow-hidden border border-zinc-700/80 shadow-md transition-transform duration-200 group-hover:scale-105">
                          <img
                            src={
                              getPosterUrl(col.posters[0]) ||
                              "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=60"
                            }
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : col.posters.length > 1 ? (
                        col.posters.slice(0, 4).map((posterPath, idx) => {
                          const posterUrl = getPosterUrl(posterPath);
                          const count = Math.min(col.posters.length, 4);
                          let transformClass = "";
                          let zIndex = "z-10";

                          if (count === 2) {
                            transformClass =
                              idx === 0
                                ? "-rotate-6 -translate-x-2 scale-95"
                                : "rotate-6 translate-x-2 scale-100";
                            zIndex = idx === 1 ? "z-20" : "z-10";
                          } else if (count === 3) {
                            if (idx === 0) transformClass = "-rotate-8 -translate-x-4 scale-90";
                            if (idx === 1) transformClass = "rotate-0 translate-x-0 scale-100";
                            if (idx === 2) transformClass = "rotate-8 translate-x-4 scale-95";
                            zIndex = idx === 1 ? "z-20" : "z-10";
                          } else {
                            if (idx === 0) transformClass = "-rotate-8 -translate-x-5 scale-90";
                            if (idx === 1) transformClass = "-rotate-2 -translate-x-1 scale-95";
                            if (idx === 2) transformClass = "rotate-4 translate-x-2 scale-100";
                            if (idx === 3) transformClass = "rotate-10 translate-x-6 scale-90";
                            zIndex = idx === 2 ? "z-30" : idx === 1 ? "z-20" : "z-10";
                          }

                          return (
                            <div
                              key={idx}
                              className={`w-13 h-19 rounded-md overflow-hidden border border-zinc-700/80 shadow-md transition-transform duration-200 group-hover:scale-105 ${transformClass} ${zIndex} shrink-0 -mr-5 last:mr-0`}
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
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-600">
                          <Film className="w-6 h-6 mb-1" />
                          <span className="text-[10px] font-medium">Empty collection</span>
                        </div>
                      )}
                    </div>

                    {/* Top Left Tag Badge */}
                    <div className="absolute top-2 left-2 z-20 flex items-center gap-1">
                      {col.type === "franchise" ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-zinc-950/90 backdrop-blur-md text-amber-400 border border-amber-500/30 text-[9.5px] font-semibold tracking-wide flex items-center gap-1 shadow-xs">
                          <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                          Franchise
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md bg-zinc-950/90 backdrop-blur-md text-zinc-300 border border-zinc-700/60 text-[9.5px] font-semibold tracking-wide flex items-center gap-1 shadow-xs">
                          <Layers className="w-2.5 h-2.5" />
                          Custom
                        </span>
                      )}
                    </div>

                    {/* Top Right Status Badge */}
                    <div className="absolute top-2 right-2 z-20">
                      {isAllWatched ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[9.5px] font-bold flex items-center gap-1 shadow-xs">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Completed
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md bg-zinc-950/90 backdrop-blur-md text-zinc-300 border border-zinc-800 text-[9.5px] font-medium shadow-xs">
                          {col.watchedMoviesCount} / {col.displayTotalCount}
                        </span>
                      )}
                    </div>

                    {/* Bottom Thin Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800/80">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isAllWatched ? "bg-emerald-400" : "bg-amber-400"
                        }`}
                        style={{ width: `${col.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-100 group-hover:text-amber-400 transition-colors line-clamp-1">
                    {col.name}
                  </h3>

                  {col.description && (
                    <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                      {col.description}
                    </p>
                  )}

                  {/* Smart "Next Up" Hint */}
                  {!isAllWatched && firstUnwatched && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10.5px] text-amber-300/90 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 truncate">
                      <span className="text-amber-400 font-semibold shrink-0">Up Next:</span>
                      <span className="truncate">{firstUnwatched.title}</span>
                    </div>
                  )}
                </div>

                {/* Clean Footer Info */}
                <div className="mt-2.5 pt-2 border-t border-zinc-800/70 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                  <div className="flex items-center gap-2">
                    {col.avgRating && (
                      <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {col.avgRating}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-zinc-400 text-[10.5px]">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {formatDuration(col.totalDurationMinutes)}
                    </span>
                  </div>

                  <span className="flex items-center gap-0.5 text-zinc-300 font-semibold group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all text-xs">
                    <span>View</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Collection Details Modal / Bottom Sheet (Mobile-First)                    */}
      {/* ========================================================================= */}
      {activeCollection && (
        <div
          id="collection-details-modal-backdrop"
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[100] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedCollectionId(null)}
        >
          <div
            id="collection-details-modal"
            className="w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] mx-auto bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section with Ambient Glow */}
            <div className="relative p-4 sm:p-5 pb-3 border-b border-zinc-800/80 shrink-0">
              {/* Mobile pull indicator */}
              <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-2 sm:hidden" />

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {activeCollection.type === "franchise" ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Franchise Saga
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800 text-[10px] font-semibold flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Custom Collection
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg sm:text-xl font-bold text-zinc-100 truncate">
                    {activeCollection.name}
                  </h2>
                  {activeCollection.description && (
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                      {activeCollection.description}
                    </p>
                  )}
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {activeCollection.isCustom && (
                    <>
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 rounded-xl px-2 py-1">
                          <span className="text-[11px] text-rose-300 font-medium">Delete?</span>
                          <button
                            type="button"
                            onClick={() => handleExecuteDeleteCollection(activeCollection.id)}
                            className="px-2 py-0.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-zinc-950 font-bold text-[10px] transition-colors cursor-pointer"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsConfirmingDelete(false)}
                            className="px-1.5 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-zinc-100 text-[10px] transition-colors cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(activeCollection)}
                            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
                            title="Edit collection"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsConfirmingDelete(true)}
                            className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 transition-colors cursor-pointer"
                            title="Delete collection"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCollectionId(null);
                      setIsConfirmingDelete(false);
                    }}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Stats Summary Bar */}
              <div className="grid grid-cols-3 gap-2 mt-3 p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-center">
                <div>
                  <p className="text-[10.5px] text-zinc-500">Progress</p>
                  <p className="text-xs sm:text-sm font-bold text-zinc-100 mt-0.5">
                    {activeCollection.watchedMoviesCount}/{activeCollection.displayTotalCount}
                    <span className="text-[11px] text-amber-400 font-normal ml-1">
                      ({activeCollection.progressPercent}%)
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-[10.5px] text-zinc-500">Avg Rating</p>
                  <p className="text-xs sm:text-sm font-bold text-amber-400 mt-0.5 flex items-center justify-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {activeCollection.avgRating ? `${activeCollection.avgRating} / 5` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[10.5px] text-zinc-500">Total Duration</p>
                  <p className="text-xs sm:text-sm font-bold text-zinc-100 mt-0.5">
                    {formatDuration(activeCollection.totalDurationMinutes)}
                  </p>
                </div>
              </div>
            </div>

            {/* Smart "Up Next" Hero Banner (if unwatched titles exist) */}
            {nextMovieToWatch && (
              <div className="px-4 sm:px-5 pt-3 shrink-0">
                <div
                  onClick={() => onMovieClick(nextMovieToWatch)}
                  className="bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-11 rounded-lg overflow-hidden bg-zinc-800 shrink-0 border border-amber-500/40">
                      <img
                        src={
                          getPosterUrl(nextMovieToWatch.poster_path) ||
                          "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=60"
                        }
                        alt={nextMovieToWatch.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <PlayCircle className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="text-[10.5px] font-bold text-amber-300 uppercase tracking-wider">
                          Next in Chronological Order
                        </span>
                      </div>
                      <p className="text-xs font-bold text-zinc-100 truncate mt-0.5">
                        {nextMovieToWatch.title}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkWatched(nextMovieToWatch);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-[11px] shrink-0 transition-colors shadow-xs cursor-pointer"
                  >
                    Rate / Watched
                  </button>
                </div>
              </div>
            )}

            {/* Collection Movies List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 pt-2.5 space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Titles in Saga ({activeCollection.movies.length})</span>
                </span>

                {activeCollection.isCustom && (
                  <button
                    type="button"
                    onClick={() => setIsAddMoviesPickerOpen(true)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Manage Titles</span>
                  </button>
                )}
              </div>

              {activeCollection.movies.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <Film className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No titles in this collection yet.</p>
                  {activeCollection.isCustom && (
                    <button
                      type="button"
                      onClick={() => setIsAddMoviesPickerOpen(true)}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer"
                    >
                      Add Movies
                    </button>
                  )}
                </div>
              ) : (
                activeCollection.movies.map((movie, index) => {
                  const posterUrl = getPosterUrl(movie.poster_path);
                  const firstOtt = movie.watched_platform || (movie.platforms || [])[0];

                  return (
                    <div
                      key={movie.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/70 hover:bg-zinc-850/90 border border-zinc-800/80 transition-all gap-2.5 group"
                    >
                      {/* Movie Index & Thumbnail */}
                      <div
                        className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                        onClick={() => onMovieClick(movie)}
                      >
                        <span className="text-xs font-bold text-zinc-500 w-4 text-center shrink-0">
                          {index + 1}
                        </span>
                        <img
                          src={
                            posterUrl ||
                            "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=60"
                          }
                          alt={movie.title}
                          className="w-9 h-13 rounded-lg object-cover border border-zinc-700/80 shrink-0"
                        />
                        <div className="flex-1 min-w-0 pr-1">
                          <h4 className="text-xs sm:text-sm font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors truncate">
                            {movie.title}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-400 flex-wrap">
                            {movie.release_year && <span>{movie.release_year}</span>}
                            <span>•</span>
                            <span className="capitalize">{movie.media_type || "movie"}</span>
                            {firstOtt && (
                              <>
                                <span>•</span>
                                <OttBadge platform={firstOtt} size="xs" />
                              </>
                            )}
                            {movie.watched ? (
                              <span className="text-emerald-400 font-medium flex items-center gap-0.5 ml-1">
                                <Check className="w-3 h-3 inline" /> Watched
                              </span>
                            ) : (
                              <span className="text-amber-400/90 font-medium ml-1">To Watch</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Rating / Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {movie.rating ? (
                          <button
                            type="button"
                            onClick={() => onMarkWatched(movie)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-colors cursor-pointer"
                          >
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{movie.rating}★</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onMarkWatched(movie)}
                            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                          >
                            Rate
                          </button>
                        )}

                        {activeCollection.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMovieFromCol(movie.id)}
                            className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Remove from collection"
                          >
                            <X className="w-3.5 h-3.5" />
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

      {/* ========================================================================= */}
      {/* Manage / Add Movies Picker Modal for Active Collection                   */}
      {/* ========================================================================= */}
      {isAddMoviesPickerOpen && activeCollection?.rawCollection && (
        <div
          id="add-movies-picker-backdrop"
          className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[110] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsAddMoviesPickerOpen(false)}
        >
          <div
            id="add-movies-picker-modal"
            className="w-full max-w-lg max-h-[85vh] mx-auto bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800 mb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-100">
                  Select Titles for &ldquo;{activeCollection.name}&rdquo;
                </h3>
                <p className="text-xs text-zinc-400">
                  Tap to add or remove titles
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMoviesPickerOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-96 pr-1">
              {watchlist.map((m) => {
                const isChecked = activeCollection.rawCollection?.movie_ids.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleToggleMovieInActiveCol(m.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all text-left cursor-pointer ${
                      isChecked
                        ? "bg-amber-500/15 border-amber-500/40 text-zinc-100"
                        : "bg-zinc-900/60 hover:bg-zinc-850/80 border-zinc-800/80 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <img
                        src={
                          getPosterUrl(m.poster_path) ||
                          "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=60"
                        }
                        alt={m.title}
                        className="w-7 h-10 rounded-md object-cover border border-zinc-700/80 shrink-0"
                      />
                      <div className="truncate">
                        <p className="text-xs sm:text-sm font-semibold truncate">{m.title}</p>
                        <p className="text-[11px] text-zinc-500">
                          {m.release_year || "Unknown"} • {m.watched ? "Watched" : "To Watch"}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? "bg-amber-400 text-zinc-950 font-bold"
                          : "border border-zinc-700 bg-zinc-800/60 text-transparent"
                      }`}
                    >
                      <Check className="w-3 h-3" />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 pt-2.5 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAddMoviesPickerOpen(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Create / Edit Custom Collection Modal (Mobile-First)                      */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div
          id="create-collection-modal-backdrop"
          className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[110] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            id="create-collection-modal"
            className="w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] mx-auto bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800 mb-3">
              <h3 className="text-sm sm:text-base font-bold text-zinc-100">
                {editingCollection ? "Edit Collection" : "Create New Collection"}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="flex-1 flex flex-col overflow-hidden space-y-3.5">
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Collection Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Christopher Nolan Epics, Studio Ghibli"
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-amber-400"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mind-bending thrillers and sci-fi masterpieces"
                    value={modalDesc}
                    onChange={(e) => setModalDesc(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Title Selection Checklist */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-zinc-300">
                    Include Titles ({selectedMovieIds.length} selected)
                  </label>
                  <input
                    type="text"
                    placeholder="Filter list..."
                    value={modalMovieSearch}
                    onChange={(e) => setModalMovieSearch(e.target.value)}
                    className="px-2 py-0.5 text-[11px] bg-zinc-900/90 border border-zinc-800 rounded-lg text-zinc-200 placeholder:text-zinc-500 focus:outline-hidden focus:border-amber-400"
                  />
                </div>

                <div className="flex-1 overflow-y-auto max-h-48 sm:max-h-56 space-y-1 pr-1 border border-zinc-800/80 rounded-xl p-1.5 bg-zinc-900/40">
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
                          className={`flex items-center justify-between p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-amber-500/15 border-amber-500/40 text-zinc-100"
                              : "bg-zinc-900/60 hover:bg-zinc-850/80 border-zinc-800/80 text-zinc-300"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <img
                              src={
                                getPosterUrl(movie.poster_path) ||
                                "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=60"
                              }
                              alt=""
                              className="w-5 h-7 rounded object-cover border border-zinc-700/80 shrink-0"
                            />
                            <span className="text-xs font-semibold truncate">{movie.title}</span>
                            <span className="text-[10px] text-zinc-500">
                              ({movie.release_year || "N/A"})
                            </span>
                          </div>
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-amber-400 text-zinc-950 font-bold"
                                : "border border-zinc-700 bg-zinc-800 text-transparent"
                            }`}
                          >
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-2.5 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!modalName.trim()}
                  className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
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
