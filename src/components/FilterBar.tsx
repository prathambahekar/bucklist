import { SlidersHorizontal } from "lucide-react";

interface FilterBarProps {
  genres: string[];
  selectedGenre: string | null;
  onSelectGenre: (genre: string | null) => void;
  platforms: string[];
  selectedPlatform: string | null;
  onSelectPlatform: (platform: string | null) => void;
  sortBy: "newest" | "rating" | "release";
  onSelectSort: (sort: "newest" | "rating" | "release") => void;
  activeTab: "towatch" | "watched";
}

export function FilterBar({
  genres,
  selectedGenre,
  onSelectGenre,
  platforms,
  selectedPlatform,
  onSelectPlatform,
  sortBy,
  onSelectSort,
  activeTab,
}: FilterBarProps) {
  const hasActiveFilter = selectedGenre !== null || selectedPlatform !== null || sortBy !== "newest";

  function clearAllFilters() {
    onSelectGenre(null);
    onSelectPlatform(null);
    onSelectSort("newest");
  }

  return (
    <div className="space-y-2 mb-3">
      {/* Top Filter Controls: Sort & Reset */}
      <div className="flex items-center justify-between text-xs px-0.5">
        <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters & Sort</span>
          {hasActiveFilter && (
            <button
              onClick={clearAllFilters}
              className="text-[11px] text-amber-400 hover:underline ml-1"
            >
              Reset
            </button>
          )}
        </div>

        {/* Sort selector */}
        <select
          value={sortBy}
          onChange={(e) => onSelectSort(e.target.value as "newest" | "rating" | "release")}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 [color-scheme:dark]"
        >
          <option value="newest">Recently Added</option>
          {activeTab === "watched" && <option value="rating">Highest Rated</option>}
          <option value="release">Release Year</option>
        </select>
      </div>

      {/* Genre Pills */}
      {genres.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => onSelectGenre(null)}
            className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors font-medium ${
              selectedGenre === null
                ? "bg-zinc-100 text-zinc-900 font-semibold"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
            }`}
          >
            All Genres
          </button>
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => onSelectGenre(selectedGenre === g ? null : g)}
              className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                selectedGenre === g
                  ? "bg-zinc-100 text-zinc-900 font-semibold"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Platform Pills */}
      {platforms.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => onSelectPlatform(null)}
            className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors font-medium ${
              selectedPlatform === null
                ? "bg-amber-400 text-zinc-950 font-bold shadow-sm shadow-amber-500/20"
                : "bg-zinc-900 text-amber-400/80 border border-zinc-800 hover:text-amber-300"
            }`}
          >
            All OTTs
          </button>
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => onSelectPlatform(selectedPlatform === p ? null : p)}
              className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                selectedPlatform === p
                  ? "bg-amber-400 text-zinc-950 font-bold shadow-sm shadow-amber-500/20"
                  : "bg-zinc-900 text-amber-400/80 border border-zinc-800 hover:text-amber-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
