import React, { useState, useMemo } from "react";
import {
  Users,
  Plus,
  Sparkles,
  Heart,
  Star,
  Film,
  Trash2,
  UserPlus,
  Copy,
  Check,
  Search,
  X,
  CheckCircle2,
  Shuffle,
} from "lucide-react";
import type {
  Blend,
  BlendMovie,
  BlendMember,
  WatchlistMovie,
  SearchResult,
} from "../types";
import {
  getLocalBlends,
  getCurrentUser,
  saveCurrentUser,
  calculateBlendStats,
  toggleWantToWatchInBlend,
  markWatchedTogether,
  removeMovieFromBlend,
  removeMemberFromBlend,
  addMovieToBlend,
  deleteBlend,
} from "../lib/blend";
import {
  getPosterUrl,
  handleImageError,
  DEFAULT_POSTER_FALLBACK,
} from "../lib/api";
import { OttBadge } from "./OttBadge";
import { CreateJoinBlendModal } from "./CreateJoinBlendModal";
import { BlendShareModal } from "./BlendShareModal";
import { WatchedTogetherModal } from "./WatchedTogetherModal";
import { PickTonightModal } from "./PickTonightModal";
import { AddMovieToBlendModal } from "./AddMovieToBlendModal";

interface BlendViewProps {
  watchlist: WatchlistMovie[];
  watchedList: WatchlistMovie[];
  onOpenDetailModal?: (movie: WatchlistMovie) => void;
}

type BlendTab = "queue" | "watched" | "synergy";

export function BlendView({
  watchlist,
  watchedList,
  onOpenDetailModal,
}: BlendViewProps) {
  const [blends, setBlends] = useState<Blend[]>(() => getLocalBlends());
  const [selectedBlendId, setSelectedBlendId] = useState<string>(
    () => (blends[0] ? blends[0].id : "")
  );

  // Active persona
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  // Sub tabs: queue | watched | synergy
  const [activeTab, setActiveTab] = useState<BlendTab>("queue");

  // Search/Filter within the blend
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMemberId, setFilterMemberId] = useState<string>("all");

  // Modals
  const [isCreateJoinOpen, setIsCreateJoinOpen] = useState(false);
  const [createJoinMode, setCreateJoinMode] = useState<"create" | "join">("create");
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isAddMovieOpen, setIsAddMovieOpen] = useState(false);
  const [isPickTonightOpen, setIsPickTonightOpen] = useState(false);
  const [watchedTargetMovie, setWatchedTargetMovie] = useState<BlendMovie | null>(null);

  // Copy code feedback
  const [copiedCode, setCopiedCode] = useState(false);

  // Active blend reference
  const currentBlend = blends.find((b) => b.id === selectedBlendId) || blends[0] || null;

  // Calculate taste statistics dynamically
  const tasteStats = useMemo(() => {
    if (!currentBlend) return null;
    return calculateBlendStats(currentBlend, [...watchlist, ...watchedList]);
  }, [currentBlend, watchlist, watchedList]);

  // Handle Blend creation or join
  const handleBlendCreatedOrJoined = (newBlend: Blend) => {
    const updated = getLocalBlends();
    setBlends(updated);
    setSelectedBlendId(newBlend.id);
  };

  // Toggle want to watch in blend
  const handleToggleWantToWatch = (blendMovieId: string) => {
    if (!currentBlend) return;
    const updated = toggleWantToWatchInBlend(currentBlend.id, blendMovieId, currentUser.id);
    if (updated) {
      setBlends((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    }
  };

  // Mark watched together
  const handleSaveWatchedTogether = (
    blendMovieId: string,
    memberRatings: Record<string, number>,
    watchedDate: string,
    notes?: string
  ) => {
    if (!currentBlend) return;
    const updated = markWatchedTogether(
      currentBlend.id,
      blendMovieId,
      memberRatings,
      watchedDate,
      notes
    );
    if (updated) {
      setBlends((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    }
  };

  // Remove movie from blend
  const handleRemoveMovie = (blendMovieId: string) => {
    if (!currentBlend) return;
    const updated = removeMovieFromBlend(currentBlend.id, blendMovieId);
    if (updated) {
      setBlends((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    }
  };

  // Add movie to blend
  const handleAddMovie = (
    movie: WatchlistMovie | SearchResult,
    extra?: {
      runtime?: string;
      director?: string;
      cast?: string[];
      backdropPath?: string;
      voteAverage?: number;
    }
  ) => {
    if (!currentBlend) return;
    const updated = addMovieToBlend(
      currentBlend.id,
      movie,
      currentUser.id,
      currentUser.name,
      extra
    );
    if (updated) {
      setBlends((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    }
  };

  // Direct friend added callback
  const handleFriendAdded = (updatedBlend: Blend) => {
    const all = getLocalBlends();
    setBlends(all);
    if (updatedBlend.id === selectedBlendId) {
      setSelectedBlendId(updatedBlend.id);
    }
  };

  // Member removed callback
  const handleMemberRemoved = (updatedBlend: Blend) => {
    const all = getLocalBlends();
    setBlends(all);
    // If active user was removed, reset active user to blend owner or remaining member
    if (!updatedBlend.members.some((m) => m.id === currentUser.id)) {
      const fallbackMember = updatedBlend.members[0];
      if (fallbackMember) {
        switchActivePersona(fallbackMember);
      }
    }
  };

  // Direct friend remove without window.confirm (works reliably in all iframes)
  const handleQuickRemoveFriend = (member: BlendMember, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentBlend) return;
    const updated = removeMemberFromBlend(currentBlend.id, member.id);
    if (updated) {
      handleMemberRemoved(updated);
    }
  };

  // Delete blend
  const handleDeleteBlend = (blendId: string) => {
    deleteBlend(blendId);
    const remaining = getLocalBlends();
    setBlends(remaining);
    if (remaining.length > 0) {
      setSelectedBlendId(remaining[0].id);
    }
  };

  // Copy invite code
  const handleCopyInviteCode = () => {
    if (!currentBlend) return;
    navigator.clipboard.writeText(currentBlend.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Switch active persona
  const switchActivePersona = (member: BlendMember) => {
    const updatedUser = {
      id: member.id,
      name: member.name,
      avatar: "",
      color: member.color || "zinc",
    };
    saveCurrentUser(updatedUser);
    setCurrentUser(updatedUser);
  };

  // Movies list separation
  const unwatchedMovies = (currentBlend?.movies || []).filter((m) => !m.watchedTogether);
  const watchedMovies = (currentBlend?.movies || []).filter((m) => m.watchedTogether);

  const displayMovies = useMemo(() => {
    const source = activeTab === "watched" ? watchedMovies : unwatchedMovies;
    return source.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchGenre = (m.genres || []).some((g) => g.toLowerCase().includes(q));
        if (!matchTitle && !matchGenre) return false;
      }
      if (filterMemberId !== "all") {
        if (!m.wantedByMemberIds.includes(filterMemberId)) return false;
      }
      return true;
    });
  }, [activeTab, unwatchedMovies, watchedMovies, searchQuery, filterMemberId]);

  if (!currentBlend) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-300">
          <Users className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-zinc-100 mb-1">Movie Blend</h2>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-5 leading-relaxed">
          Blend your movie bucket-list with friends, discover shared tastes, and pick what to watch tonight.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCreateJoinMode("create");
              setIsCreateJoinOpen(true);
            }}
            className="py-2.5 px-4 bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Blend</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCreateJoinMode("join");
              setIsCreateJoinOpen(true);
            }}
            className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Join with Code</span>
          </button>
        </div>

        <CreateJoinBlendModal
          isOpen={isCreateJoinOpen}
          onClose={() => setIsCreateJoinOpen(false)}
          onBlendCreatedOrJoined={handleBlendCreatedOrJoined}
          initialMode={createJoinMode}
        />
      </div>
    );
  }

  const isSoloBlend = currentBlend.members.length <= 1;

  return (
    <div id="blend-main-container" className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4 pb-28">
      {/* Top Blend Switcher Bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {blends.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelectedBlendId(b.id)}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                b.id === currentBlend.id
                  ? "bg-zinc-800 text-white border border-zinc-700 shadow-sm"
                  : "bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Users className="w-3.5 h-3.5 opacity-70" />
              <span className="truncate max-w-[130px] sm:max-w-[180px]">{b.name}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setCreateJoinMode("create");
              setIsCreateJoinOpen(true);
            }}
            className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition-all cursor-pointer"
            title="Create new Blend"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCreateJoinMode("join");
              setIsCreateJoinOpen(true);
            }}
            className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition-all cursor-pointer"
            title="Join with Code"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Join</span>
          </button>
        </div>
      </div>

      {/* Main Blend Header Card */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Blend Info & Members */}
          <div className="space-y-3 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight">
                {currentBlend.name}
              </h1>

              {/* Code Pill */}
              <button
                type="button"
                onClick={handleCopyInviteCode}
                className="inline-flex items-center gap-1 py-0.5 px-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
                title="Click to copy invite code"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <span>{currentBlend.inviteCode}</span>
                    <Copy className="w-3 h-3 text-zinc-500" />
                  </>
                )}
              </button>
            </div>

            {/* Member Chips & Manage */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {currentBlend.members.map((mem) => {
                const isActiveUser = mem.id === currentUser.id;
                const isOwner = mem.isOwner || mem.id === currentBlend.ownerId;
                const initial = (mem.name || "U").charAt(0).toUpperCase();

                return (
                  <div
                    key={mem.id}
                    className={`inline-flex items-center gap-1.5 pl-1.5 pr-1.5 py-1 rounded-xl text-xs font-medium transition-all ${
                      isActiveUser
                        ? "bg-amber-400/15 border border-amber-400/40 text-amber-300 font-semibold shadow-sm"
                        : "bg-zinc-950/80 border border-zinc-800/90 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => switchActivePersona(mem)}
                      className="inline-flex items-center gap-1.5 cursor-pointer text-left"
                      title={isActiveUser ? "Active persona" : `Switch to view as ${mem.name}`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isActiveUser
                            ? "bg-amber-400 text-zinc-950 font-bold"
                            : "bg-zinc-800 border border-zinc-700 text-zinc-200"
                        }`}
                      >
                        {initial}
                      </div>
                      <span className="max-w-[110px] truncate">{mem.name}</span>
                    </button>

                    {/* Direct remove friend button for non-owners */}
                    {!isOwner && (
                      <button
                        type="button"
                        onClick={(e) => handleQuickRemoveFriend(mem, e)}
                        className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                        title={`Remove ${mem.name} from Blend`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setIsShareOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 font-medium transition-all cursor-pointer shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5 text-zinc-400" />
                <span>+ Add / Manage</span>
              </button>
            </div>
          </div>

          {/* Action Buttons: Add Movie & Pick Tonight (Clean high-contrast layout) */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={() => setIsAddMovieOpen(true)}
              className="py-2.5 px-3.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-semibold text-zinc-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Movie</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPickTonightOpen(true)}
              className="py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-zinc-950 rounded-xl text-xs font-bold transition-all shadow-sm shadow-amber-950/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Shuffle className="w-4 h-4 stroke-[2.5]" />
              <span>Pick Tonight</span>
            </button>
          </div>
        </div>
      </div>

      {/* Solo State Guidance Banner (Only shown when 1 member) */}
      {isSoloBlend && (
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              <span>Ready to blend with friends</span>
            </div>
            <p className="text-zinc-400 text-[11px]">
              Add a friend by name or share code <span className="text-zinc-200 font-mono font-bold">{currentBlend.inviteCode}</span> to compare movie lists and pick what to watch together.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsShareOpen(true)}
              className="flex-1 sm:flex-initial py-1.5 px-3 bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Friend</span>
            </button>
            <button
              type="button"
              onClick={handleCopyInviteCode}
              className="flex-1 sm:flex-initial py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3 h-3 text-zinc-400" />
              <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub Tabs: Queue | Watched | Synergy (Minimal Segmented Control) */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900/80 border border-zinc-800/80 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab("queue")}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "queue"
              ? "bg-amber-400 text-zinc-950 font-bold shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Queue ({unwatchedMovies.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("watched")}
          className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "watched"
              ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Watched ({watchedMovies.length})</span>
        </button>

        {!isSoloBlend && (
          <button
            type="button"
            onClick={() => setActiveTab("synergy")}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "synergy"
                ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Taste Match {tasteStats ? `(${tasteStats.matchPercentage}%)` : ""}</span>
          </button>
        )}
      </div>

      {/* Tab: Queue or Watched */}
      {(activeTab === "queue" || activeTab === "watched") && (
        <div className="space-y-3">
          {/* Quick Filter Bar */}
          {displayMovies.length > 2 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter titles or genres..."
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
              />
            </div>
          )}

          {/* Movie Cards Grid */}
          {displayMovies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {displayMovies.map((movie) => {
                const posterUrl = getPosterUrl(movie.poster_path);
                const isWantedByActiveUser = movie.wantedByMemberIds.includes(currentUser.id);

                return (
                  <div
                    key={movie.id}
                    className="bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-3 flex gap-3 transition-all relative group"
                  >
                    {/* Poster */}
                    <div className="w-16 sm:w-20 aspect-2/3 rounded-xl bg-zinc-950 overflow-hidden shrink-0 border border-zinc-800/80 shadow-md relative">
                      {posterUrl ? (
                        <img
                          src={posterUrl}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) =>
                            handleImageError(e, DEFAULT_POSTER_FALLBACK)
                          }
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                          <Film className="w-6 h-6" />
                        </div>
                      )}

                      {movie.vote_average && (
                        <div className="absolute top-1 right-1 bg-zinc-950/90 backdrop-blur-md px-1 py-0.2 rounded text-[9px] font-mono font-bold text-zinc-200 flex items-center gap-0.5 border border-zinc-800">
                          <Star className="w-2.5 h-2.5 fill-zinc-300 text-zinc-300" />
                          {movie.vote_average.toFixed(1)}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs sm:text-sm font-bold text-zinc-100 truncate pr-2">
                            {movie.title}
                          </h4>

                          <button
                            type="button"
                            onClick={() => handleRemoveMovie(movie.id)}
                            className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-lg cursor-pointer shrink-0"
                            title="Remove from Blend"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                          {movie.release_year && <span>{movie.release_year}</span>}
                          {movie.runtime && <span>• {movie.runtime}</span>}
                        </div>

                        {/* OTT Streaming Platforms */}
                        {movie.platforms && movie.platforms.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap mt-1.5">
                            {movie.platforms.slice(0, 3).map((platform) => (
                              <OttBadge key={platform} platform={platform} size="sm" />
                            ))}
                          </div>
                        )}

                        {/* Wanted by Members */}
                        <div className="flex items-center gap-1 flex-wrap mt-2">
                          {currentBlend.members.map((mem) => {
                            const wants = movie.wantedByMemberIds.includes(mem.id);
                            if (!wants) return null;
                            const initial = (mem.name || "U").charAt(0).toUpperCase();
                            return (
                              <span
                                key={mem.id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-300 text-[10px]"
                              >
                                <span className="w-3.5 h-3.5 rounded-full bg-zinc-800 text-[8px] font-bold inline-flex items-center justify-center text-zinc-300">
                                  {initial}
                                </span>
                                <span>{mem.name}</span>
                              </span>
                            );
                          })}
                        </div>

                        {/* Watched Together Ratings */}
                        {movie.watchedTogether && (
                          <div className="mt-2 pt-1.5 border-t border-zinc-800/80 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-zinc-400">
                                Watched: {movie.watchedDate || "Recently"}
                              </span>
                              {Object.keys(movie.ratings || {}).length > 0 && (
                                <span className="font-semibold text-zinc-200 flex items-center gap-1 text-[10px]">
                                  <Star className="w-2.5 h-2.5 fill-zinc-300 text-zinc-300" />
                                  Avg: {(
                                    Object.values(movie.ratings).reduce((a, b) => a + b.rating, 0) /
                                    Object.values(movie.ratings).length
                                  ).toFixed(1)}/10
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                              {Object.values(movie.ratings || {}).map((r) => (
                                <span
                                  key={r.memberId}
                                  className="px-1.5 py-0.5 bg-zinc-950 rounded border border-zinc-800 text-zinc-300"
                                >
                                  {r.memberName}: <strong className="text-zinc-100">{r.rating}★</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Row */}
                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-zinc-800/60">
                        <button
                          type="button"
                          onClick={() => handleToggleWantToWatch(movie.id)}
                          className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                            isWantedByActiveUser
                              ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                              : "bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              isWantedByActiveUser ? "fill-rose-400 text-rose-400" : ""
                            }`}
                          />
                          <span>{isWantedByActiveUser ? "Wanted" : "Mark wanted"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setWatchedTargetMovie(movie)}
                          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                            movie.watchedTogether
                              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                              : "bg-zinc-100 hover:bg-white text-zinc-950"
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{movie.watchedTogether ? "Edit Rating" : "Watched"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl p-6">
              <Film className="w-8 h-8 text-zinc-600 mx-auto mb-2.5" />
              <h4 className="text-xs sm:text-sm font-bold text-zinc-300 mb-1">
                {activeTab === "queue" ? "No Movies in Blend Yet" : "No Movies Watched Together Yet"}
              </h4>
              <p className="text-[11px] text-zinc-500 max-w-xs mx-auto mb-4 leading-relaxed">
                {activeTab === "queue"
                  ? "Add titles from your personal watchlist or search TMDB to build your group movie list."
                  : "Mark movies as watched after viewing them together to track ratings and history."}
              </p>
              <button
                type="button"
                onClick={() => setIsAddMovieOpen(true)}
                className="py-2 px-3.5 bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold rounded-xl transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Movies</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Taste Synergy */}
      {activeTab === "synergy" && tasteStats && (
        <div className="space-y-3">
          {/* Match Score & Genres */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <Sparkles className="w-3 h-3 text-zinc-400" />
                  <span>Taste Match Score</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-100">
                  {currentBlend.members.map((m) => m.name).join(" & ")}
                </h3>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-mono font-bold text-xl">
                {tasteStats.matchPercentage}%
              </div>
            </div>

            {/* Genre Synergy Bars */}
            {tasteStats.commonGenres.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tasteStats.commonGenres.slice(0, 6).map((g) => (
                  <div
                    key={g.genre}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5"
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-zinc-300 truncate">{g.genre}</span>
                      <span className="font-mono text-[10px] text-zinc-400 font-bold">
                        {g.synergy}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-zinc-300 h-full rounded-full"
                        style={{ width: `${g.synergy}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">
                Rate and add more movies to calculate detailed genre overlap!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateJoinBlendModal
        isOpen={isCreateJoinOpen}
        onClose={() => setIsCreateJoinOpen(false)}
        onBlendCreatedOrJoined={handleBlendCreatedOrJoined}
        initialMode={createJoinMode}
      />

      <BlendShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        blend={currentBlend}
        onFriendAdded={handleFriendAdded}
        onMemberRemoved={handleMemberRemoved}
        onPersonaSwitched={switchActivePersona}
      />

      <WatchedTogetherModal
        isOpen={Boolean(watchedTargetMovie)}
        onClose={() => setWatchedTargetMovie(null)}
        blend={currentBlend}
        movie={watchedTargetMovie}
        onSaveWatchedTogether={handleSaveWatchedTogether}
      />

      <PickTonightModal
        isOpen={isPickTonightOpen}
        onClose={() => setIsPickTonightOpen(false)}
        blend={currentBlend}
        watchlist={[...watchlist, ...watchedList]}
        onOpenWatchedTogether={(m) => setWatchedTargetMovie(m)}
      />

      <AddMovieToBlendModal
        isOpen={isAddMovieOpen}
        onClose={() => setIsAddMovieOpen(false)}
        blend={currentBlend}
        watchlist={watchlist}
        currentMemberId={currentUser.id}
        currentMemberName={currentUser.name}
        onAddMovie={handleAddMovie}
      />
    </div>
  );
}
