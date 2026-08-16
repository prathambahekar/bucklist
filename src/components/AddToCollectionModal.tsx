import React, { useState, useEffect } from "react";
import { Plus, Check, FolderPlus, X, Film } from "lucide-react";
import type { WatchlistMovie, MovieCollection } from "../types";
import {
  getLocalCollections,
  createCustomCollection,
  toggleMovieInCollection,
} from "../lib/collections";

interface AddToCollectionModalProps {
  movie: WatchlistMovie | null;
  isOpen: boolean;
  onClose: () => void;
  onCollectionsUpdated?: () => void;
}

export const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({
  movie,
  isOpen,
  onClose,
  onCollectionsUpdated,
}) => {
  const [collections, setCollections] = useState<MovieCollection[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDesc, setNewCollectionDesc] = useState("");

  useEffect(() => {
    if (isOpen) {
      setCollections(getLocalCollections());
      setIsCreatingNew(false);
      setNewCollectionName("");
      setNewCollectionDesc("");
    }
  }, [isOpen]);

  if (!isOpen || !movie) return null;

  const handleToggle = (colId: string) => {
    toggleMovieInCollection(colId, movie.id);
    setCollections(getLocalCollections());
    onCollectionsUpdated?.();
  };

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    createCustomCollection(
      newCollectionName.trim(),
      newCollectionDesc.trim() || undefined,
      [movie.id]
    );
    setCollections(getLocalCollections());
    setIsCreatingNew(false);
    setNewCollectionName("");
    setNewCollectionDesc("");
    onCollectionsUpdated?.();
  };

  return (
    <div
      id="add-to-collection-modal-backdrop"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="add-to-collection-modal"
        className="w-full max-w-md mx-auto bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl relative animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">Add to Collection</h3>
              <p className="text-xs text-zinc-400 truncate max-w-[240px]">
                {movie.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Collections List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 mb-4">
          {collections.length === 0 ? (
            <div className="text-center py-6 px-4 bg-zinc-900/50 rounded-xl border border-zinc-800/80">
              <Film className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
              <p className="text-sm font-medium text-zinc-300">No custom collections yet</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Create a collection like &ldquo;Nolan Marathon&rdquo; or &ldquo;Favorite Sci-Fi&rdquo;
              </p>
            </div>
          ) : (
            collections.map((col) => {
              const isIncluded = col.movie_ids.includes(movie.id);
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => handleToggle(col.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left cursor-pointer ${
                    isIncluded
                      ? "bg-amber-500/15 border-amber-500/40 text-zinc-100"
                      : "bg-zinc-900/60 hover:bg-zinc-800/80 border-zinc-800/80 text-zinc-300"
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-semibold truncate">{col.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {col.movie_ids.length} {col.movie_ids.length === 1 ? "title" : "titles"}
                    </p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isIncluded
                        ? "bg-amber-500 text-zinc-950 font-bold"
                        : "border border-zinc-700 bg-zinc-800/60 text-transparent"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Create New Collection Inline Form */}
        {isCreatingNew ? (
          <form
            onSubmit={handleCreateAndAdd}
            className="p-3.5 bg-zinc-900 rounded-xl border border-zinc-800 space-y-2.5 animate-in fade-in duration-150"
          >
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              New Collection
            </p>
            <input
              type="text"
              placeholder="Collection name (e.g. Harry Potter Marathon)"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-amber-500"
              autoFocus
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newCollectionDesc}
              onChange={(e) => setNewCollectionDesc(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-amber-500"
            />
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={!newCollectionName.trim()}
                className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Create &amp; Add Movie
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreatingNew(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-zinc-700 hover:border-amber-500/60 bg-zinc-900/40 hover:bg-zinc-900 text-zinc-300 hover:text-amber-400 text-xs font-semibold transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Collection</span>
          </button>
        )}

        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
