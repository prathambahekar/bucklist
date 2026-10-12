import React, { useState } from "react";
import {
  X,
  Cloud,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { loginWithGoogle, logoutUser, type User } from "../lib/firebase";
import { syncEntireLocalWatchlistToCloud } from "../lib/firebaseSync";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  syncStatus: "idle" | "syncing" | "synced" | "error" | "offline";
  totalItemsCount: number;
  onRefreshData: () => void;
}

export function AuthModal({
  isOpen,
  onClose,
  user,
  syncStatus,
  onRefreshData,
}: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle();
      setSuccessMsg("Connected & synced!");
      setTimeout(() => {
        setSuccessMsg(null);
        onRefreshData();
        onClose();
      }, 900);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Sign-in cancelled or failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await logoutUser();
      setSuccessMsg("Signed out.");
      setTimeout(() => {
        setSuccessMsg(null);
        onRefreshData();
        onClose();
      }, 700);
    } catch {
      setErrorMsg("Failed to sign out.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await syncEntireLocalWatchlistToCloud(user.uid);
      setSuccessMsg("All synced!");
      setTimeout(() => setSuccessMsg(null), 2000);
      onRefreshData();
    } catch {
      setErrorMsg("Sync failed. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[360px] bg-zinc-900/95 border border-zinc-800 rounded-3xl p-6 shadow-2xl overflow-hidden text-zinc-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Background Light */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {user ? (
          /* Logged In View */
          <div className="flex flex-col items-center text-center pt-2">
            {/* User Avatar */}
            <div className="relative mb-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-16 h-16 rounded-full ring-2 ring-amber-500/30 object-cover shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center text-xl font-bold shadow-lg">
                  {(user.displayName || user.email || "U")[0].toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-zinc-900 flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full" />
              </span>
            </div>

            <h2 className="text-base font-bold text-white tracking-tight">
              {user.displayName || "Bucklist Account"}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-[260px]">
              {user.email}
            </p>

            {/* Status Pill */}
            <div className="mt-3.5 mb-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-950/70 border border-zinc-800 text-zinc-300">
              <span
                className={`w-2 h-2 rounded-full ${
                  syncStatus === "syncing"
                    ? "bg-amber-400 animate-spin"
                    : "bg-emerald-400 animate-pulse"
                }`}
              />
              <span>
                {syncStatus === "syncing" ? "Syncing..." : "Cloud Synced"}
              </span>
            </div>

            {/* Alerts */}
            {successMsg && (
              <div className="w-full mb-3 py-2 px-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="w-full mb-3 py-2 px-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Compact Action Buttons */}
            <div className="w-full space-y-2">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                />
                Sync Now
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 text-zinc-400 hover:text-rose-400 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          /* Minimal Sign In View */
          <div className="flex flex-col items-center text-center pt-2">
            {/* Minimal Icon Badge */}
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3 shadow-inner">
              <Cloud className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-white tracking-tight">
              Cloud Sync
            </h2>
            <p className="text-xs text-zinc-400 mt-1 mb-6 max-w-[240px] leading-relaxed">
              Sync your watchlist and progress across all your devices.
            </p>

            {/* Error Message */}
            {errorMsg && (
              <div className="w-full mb-4 py-2 px-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{errorMsg}</span>
              </div>
            )}

            {/* Premium Google Button */}
            <button
              type="button"
              onClick={handleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-white hover:bg-zinc-100 active:scale-[0.98] text-zinc-950 rounded-2xl text-xs sm:text-sm font-semibold shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-700" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{loading ? "Connecting..." : "Continue with Google"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
