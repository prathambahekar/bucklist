import React, { useState, useRef, useEffect } from "react";
import { Tv, Clapperboard, Bookmark, Check } from "lucide-react";
import { getPlatformAccentTheme } from "./OttBadge";

export type WatchVenueType = "ott" | "theatre" | "other";

interface WatchVenuePopoverProps {
  venue: WatchVenueType;
  platform: string;
  moviePlatforms?: string[];
  onChange: (venue: WatchVenueType, platform: string) => void;
  compact?: boolean;
}

const POPULAR_OTTS = [
  "Netflix",
  "Prime Video",
  "Disney+",
  "JioHotstar",
  "Apple TV+",
  "Max",
  "Hulu",
  "Crunchyroll",
  "SonyLIV",
  "Zee5",
  "Peacock",
  "Paramount+",
  "YouTube",
  "MUBI",
];

export const WatchVenuePopover: React.FC<WatchVenuePopoverProps> = ({
  venue = "ott",
  platform = "",
  moviePlatforms = [],
  onChange,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectVenueAndPlatform = (
    v: WatchVenueType,
    p: string
  ) => {
    onChange(v, p);
    setIsOpen(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    onChange(venue === "other" ? "other" : "ott", customInput.trim());
    setCustomInput("");
    setIsOpen(false);
  };

  // Get human-friendly label for button
  const getButtonLabel = () => {
    if (venue === "theatre") {
      return "🎬 Theatre";
    }
    if (venue === "other") {
      if (platform && platform !== "Other") {
        return `🏷️ ${platform}`;
      }
      return "🏷️ Other";
    }
    // OTT
    if (platform && platform !== "OTT") {
      return `📺 ${platform}`;
    }
    return "📺 OTT";
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Trigger Button */}
      <button
        type="button"
        id="watch-venue-picker-button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border ${
          compact
            ? "px-2 py-0.5 rounded-lg text-[10.5px] font-medium bg-zinc-950/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800/80 hover:border-zinc-700"
            : "px-3.5 py-1.5 rounded-full text-xs font-semibold bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-700"
        } ${
          isOpen
            ? "bg-zinc-800 text-white border-amber-500/60 ring-2 ring-amber-500/20"
            : ""
        }`}
        title="Where did you watch this? (OTT / Theatre / Other)"
      >
        <span className="truncate max-w-[140px] sm:max-w-[170px]">
          {getButtonLabel()}
        </span>
      </button>

      {/* Floating Popover */}
      {isOpen && (
        <div
          id="watch-venue-popover"
          className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-2 z-50 w-72 sm:w-80 bg-zinc-950 border border-zinc-800 rounded-2xl p-3 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 text-left"
          style={{ maxWidth: "calc(100vw - 32px)" }}
        >
          {/* Main Venue Selection (OTT, Theatre, Other) */}
          <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800/80 rounded-xl mb-3">
            {/* OTT Tab / Toggle */}
            <button
              type="button"
              id="venue-tab-ott"
              onClick={() => {
                if (venue !== "ott") {
                  onChange("ott", (moviePlatforms && moviePlatforms[0]) || "Netflix");
                }
              }}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                venue === "ott"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Tv className="w-3.5 h-3.5 shrink-0" />
              <span>OTT</span>
            </button>

            {/* Direct 1-tap Theatre */}
            <button
              type="button"
              id="venue-tab-theatre"
              onClick={() => handleSelectVenueAndPlatform("theatre", "Theatre")}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                venue === "theatre"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Clapperboard className="w-3.5 h-3.5 shrink-0" />
              <span>Theatre</span>
            </button>

            {/* Direct 1-tap Other */}
            <button
              type="button"
              id="venue-tab-other"
              onClick={() => handleSelectVenueAndPlatform("other", "Other")}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                venue === "other"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 shrink-0" />
              <span>Other</span>
            </button>
          </div>

          {/* OTT Platform Options (Shown only when in OTT mode) */}
          {venue === "ott" && (
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {/* Available on Title */}
              {moviePlatforms && moviePlatforms.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase font-bold text-amber-400/90 tracking-wider mb-1.5">
                    Available on Title
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {moviePlatforms.map((p) => {
                      const isSelected = venue === "ott" && platform.toLowerCase() === p.toLowerCase();
                      const theme = getPlatformAccentTheme(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleSelectVenueAndPlatform("ott", p)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? "bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-xs"
                              : `${theme.bg} ${theme.border} ${theme.text} hover:opacity-90`
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          <span>{p}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Popular OTTs */}
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-1.5">
                  Streaming Platform
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_OTTS.map((p) => {
                    const isSelected = venue === "ott" && platform.toLowerCase() === p.toLowerCase();
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleSelectVenueAndPlatform("ott", p)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? "bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-xs"
                            : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-800"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{p}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom OTT input */}
              <form onSubmit={handleCustomSubmit} className="pt-1 border-t border-zinc-800/60">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Other OTT name..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                  />
                  <button
                    type="submit"
                    disabled={!customInput.trim()}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Set
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Other Venue Custom Name Input (Shown when in Other mode) */}
          {venue === "other" && (
            <div className="space-y-2.5 pt-1">
              <form onSubmit={handleCustomSubmit} className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Custom Source / Name (Optional)
                </p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="e.g. Blu-ray, DVD, Flight, Web..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                  />
                  <button
                    type="submit"
                    disabled={!customInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Set
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
