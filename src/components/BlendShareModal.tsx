import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Share2,
  Users,
  UserPlus,
  Trash2,
  Sparkles,
} from "lucide-react";
import type { Blend, BlendMember } from "../types";
import { addFriendDirectlyToBlend, removeMemberFromBlend, getCurrentUser, saveCurrentUser } from "../lib/blend";

interface BlendShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  blend: Blend;
  onFriendAdded?: (updatedBlend: Blend) => void;
  onMemberRemoved?: (updatedBlend: Blend) => void;
  onPersonaSwitched?: (member: BlendMember) => void;
  initialTab?: "members" | "direct" | "invite";
}

const COLOR_OPTIONS = [
  { label: "Zinc", value: "zinc", bg: "bg-zinc-600" },
  { label: "Indigo", value: "indigo", bg: "bg-indigo-600" },
  { label: "Emerald", value: "emerald", bg: "bg-emerald-600" },
  { label: "Rose", value: "rose", bg: "bg-rose-600" },
  { label: "Sky", value: "sky", bg: "bg-sky-600" },
  { label: "Violet", value: "violet", bg: "bg-violet-600" },
];

export function BlendShareModal({
  isOpen,
  onClose,
  blend,
  onFriendAdded,
  onMemberRemoved,
  onPersonaSwitched,
  initialTab = "members",
}: BlendShareModalProps) {
  const [tab, setTab] = useState<"members" | "direct" | "invite">(initialTab);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const currentUser = getCurrentUser();

  // Direct add state
  const [friendName, setFriendName] = useState("");
  const [selectedColor, setSelectedColor] = useState("zinc");
  const [directAddSuccess, setDirectAddSuccess] = useState(false);

  if (!isOpen) return null;

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}?blend=${blend.inviteCode}`
      : `https://bucklist.app/?blend=${blend.inviteCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(blend.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join Blend: ${blend.name}`,
          text: `Join "${blend.name}" on Bucklist to blend movies and pick what to watch! Use code: ${blend.inviteCode}`,
          url: inviteUrl,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDirectAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = friendName.trim();
    if (!clean) return;

    const updated = addFriendDirectlyToBlend(
      blend.id,
      clean,
      "",
      selectedColor
    );

    if (updated && onFriendAdded) {
      onFriendAdded(updated);
      setDirectAddSuccess(true);
      setFriendName("");
      setTimeout(() => {
        setDirectAddSuccess(false);
        setTab("members");
      }, 500);
    }
  };

  const handleRemoveFriend = (memberId: string) => {
    const updated = removeMemberFromBlend(blend.id, memberId);
    if (updated && onMemberRemoved) {
      onMemberRemoved(updated);
    }
  };

  const handleSwitchPersona = (member: BlendMember) => {
    const updatedUser = {
      id: member.id,
      name: member.name,
      avatar: "",
      color: member.color || "zinc",
    };
    saveCurrentUser(updatedUser);
    if (onPersonaSwitched) {
      onPersonaSwitched(member);
    }
  };

  return (
    <div
      id="blend-share-modal-backdrop"
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="blend-share-modal"
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-5 sm:p-6 relative text-zinc-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100">
              Manage Blend Members
            </h3>
            <p className="text-xs text-zinc-400">
              {blend.name} • {blend.members.length} {blend.members.length === 1 ? "member" : "members"}
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab("members")}
            className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === "members"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Members ({blend.members.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("direct")}
            className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === "direct"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Friend</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("invite")}
            className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === "invite"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Invite Code</span>
          </button>
        </div>

        {/* Tab 1: Current Members List & Direct Removal */}
        {tab === "members" && (
          <div className="space-y-3">
            <div className="text-xs text-zinc-400">
              People in this blend:
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {blend.members.map((member) => {
                const isActive = member.id === currentUser.id;
                const isOwner = member.isOwner || member.id === blend.ownerId;
                const initial = (member.name || "U").charAt(0).toUpperCase();

                return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isActive
                        ? "bg-amber-400/10 border-amber-400/30 text-zinc-100"
                        : "bg-zinc-900/60 border-zinc-800/80 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isActive
                            ? "bg-amber-400 text-zinc-950 font-bold"
                            : "bg-zinc-800 border border-zinc-700 text-zinc-200"
                        }`}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-100 truncate">
                            {member.name}
                          </span>
                          {isOwner && (
                            <span className="text-[9px] bg-zinc-800 text-zinc-300 border border-zinc-700 px-1 rounded font-medium">
                              Host
                            </span>
                          )}
                          {isActive && (
                            <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1 rounded font-medium">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          {isActive ? "Currently viewing as this person" : "Tap switch to view as them"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => handleSwitchPersona(member)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                          title="Switch active user to this persona"
                        >
                          Switch
                        </button>
                      )}

                      {/* Remove Friend Button */}
                      {!isOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFriend(member.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title={`Remove ${member.name} from Blend`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab("direct")}
                className="flex-1 py-2 px-3 bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Another Friend</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Direct Friend Addition */}
        {tab === "direct" && (
          <form onSubmit={handleDirectAddSubmit} className="space-y-4">
            <p className="text-xs text-zinc-400">
              Add someone you watch movies with to compare tastes and pick movies together.
            </p>

            <div>
              <label
                htmlFor="friend-name-input"
                className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5"
              >
                Friend's Name
              </label>
              <input
                id="friend-name-input"
                type="text"
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                placeholder="e.g. Sarah, Jordan, Sam, Roommate"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-500 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                maxLength={30}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Badge Color
              </label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setSelectedColor(c.value)}
                    className={`w-7 h-7 rounded-full transition-all cursor-pointer ${c.bg} ${
                      selectedColor === c.value
                        ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-110"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {directAddSuccess ? (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                <span>Friend added to blend!</span>
              </div>
            ) : (
              <button
                type="submit"
                disabled={!friendName.trim()}
                className="w-full py-2.5 px-4 bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>Add Friend to Blend</span>
              </button>
            )}
          </form>
        )}

        {/* Tab 3: Share Code / Link */}
        {tab === "invite" && (
          <div className="space-y-4">
            {/* Invite Code Box */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                Invite Code
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xl font-mono font-bold tracking-widest text-zinc-100 select-all">
                  {blend.inviteCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    copiedCode
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                  }`}
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Share Link Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  copiedLink
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200"
                }`}
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? "Link Copied" : "Copy Link"}</span>
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-zinc-200 text-zinc-950 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>

            {/* Explainer Steps */}
            <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-1.5">
              <div className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                <span>How Blend Works:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-[11px] leading-relaxed">
                <li>Send your invite code or link to your friend.</li>
                <li>They open Bucklist and go to the <strong className="text-zinc-200">Blend</strong> tab.</li>
                <li>Tap <strong className="text-zinc-200">Join</strong> and enter <span className="text-zinc-200 font-mono font-bold">{blend.inviteCode}</span>.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
