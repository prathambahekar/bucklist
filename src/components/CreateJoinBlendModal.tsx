import React, { useState } from "react";
import {
  X,
  Plus,
  Users,
  ArrowRight,
  Film,
} from "lucide-react";
import { createBlend, joinBlendByCode, getCurrentUser } from "../lib/blend";
import type { Blend } from "../types";

interface CreateJoinBlendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBlendCreatedOrJoined: (blend: Blend) => void;
  initialMode?: "create" | "join";
}

export function CreateJoinBlendModal({
  isOpen,
  onClose,
  onBlendCreatedOrJoined,
  initialMode = "create",
}: CreateJoinBlendModalProps) {
  const currentUser = getCurrentUser();
  const [activeTab, setActiveTab] = useState<"create" | "join">(initialMode);
  
  // Create state
  const [blendName, setBlendName] = useState("");
  const [creatorName, setCreatorName] = useState(currentUser.name || "You");

  // Join state
  const [inviteCode, setInviteCode] = useState("");
  const [joinerName, setJoinerName] = useState(currentUser.name || "Collaborator");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = blendName.trim() || "Movie Night";
    const newBlend = createBlend(finalName, "", creatorName);
    onBlendCreatedOrJoined(newBlend);
    onClose();
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const result = joinBlendByCode(inviteCode, joinerName);
    if (result.success && result.blend) {
      onBlendCreatedOrJoined(result.blend);
      onClose();
    } else {
      setErrorMsg(result.error || "Could not join Blend. Please check the invite code.");
    }
  };

  return (
    <div
      id="create-join-blend-backdrop"
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="create-join-blend-modal"
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-5 sm:p-6 relative text-zinc-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header Tabs */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl mb-5 max-w-[260px]">
          <button
            type="button"
            onClick={() => {
              setActiveTab("create");
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "create"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Create Blend
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("join");
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "join"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Join with Code
          </button>
        </div>

        {/* Tab 1: Create Blend */}
        {activeTab === "create" ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Film className="w-5 h-5 text-zinc-300" />
                <h3 className="text-base sm:text-lg font-bold text-zinc-100">
                  Create Movie Blend
                </h3>
              </div>
              <p className="text-xs text-zinc-400">
                Blend your movie bucket-list with friends, find shared tastes, and pick what to watch together.
              </p>
            </div>

            {/* Blend Name Input */}
            <div>
              <label
                htmlFor="blend-name-input"
                className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5"
              >
                Blend Name
              </label>
              <input
                id="blend-name-input"
                type="text"
                value={blendName}
                onChange={(e) => setBlendName(e.target.value)}
                placeholder="e.g. Weekend Movies, Sci-Fi Club, Date Night"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-500 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                maxLength={40}
                required
              />
            </div>

            {/* Creator Name Input */}
            <div>
              <label
                htmlFor="creator-name-input"
                className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5"
              >
                Your Display Name
              </label>
              <input
                id="creator-name-input"
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="e.g. Alex, Sam, Jordan"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-500 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                maxLength={25}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                id="submit-create-blend-btn"
                className="w-full py-2.5 bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create Blend & Get Invite Link</span>
              </button>
            </div>
          </form>
        ) : (
          /* Tab 2: Join with Code */
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-zinc-300" />
                <h3 className="text-base sm:text-lg font-bold text-zinc-100">
                  Join Existing Blend
                </h3>
              </div>
              <p className="text-xs text-zinc-400">
                Enter the invite code shared by your friend to join their shared movie collection.
              </p>
            </div>

            {/* Invite Code Input */}
            <div>
              <label
                htmlFor="join-invite-code-input"
                className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5"
              >
                Invite Code
              </label>
              <input
                id="join-invite-code-input"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. BLEND-7X9K2M"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-500 rounded-xl px-3.5 py-2.5 text-sm font-mono uppercase tracking-wider text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                maxLength={18}
                required
              />
            </div>

            {/* Member Name */}
            <div>
              <label
                htmlFor="join-member-name-input"
                className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5"
              >
                Your Display Name
              </label>
              <input
                id="join-member-name-input"
                type="text"
                value={joinerName}
                onChange={(e) => setJoinerName(e.target.value)}
                placeholder="Your name in the group"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-500 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                maxLength={25}
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                id="submit-join-blend-btn"
                className="w-full py-2.5 bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                <span>Join Blend</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
