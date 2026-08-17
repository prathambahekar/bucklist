import React, { useState, useEffect } from "react";
import {
  User,
  LogOut,
  CheckCircle2,
  RefreshCw,
  Globe,
  WifiOff,
  KeyRound,
  Mail,
  AlertCircle,
  Settings,
  Database,
  CloudUpload,
  CloudDownload,
  Cloud,
  Clock,
  HardDrive,
  Sparkles,
} from "lucide-react";
import type { WatchlistMovie, MovieCollection } from "../types";
import {
  getSavedSupabaseUser,
  triggerGoogleOAuth,
  signInWithEmailOtp,
  signInWithPassword,
  signInInstant,
  logoutSupabaseUser,
  saveUserDataToSupabaseCloud,
  loadUserDataFromSupabaseCloud,
  initSupabaseAuthListener,
  getSupabaseConfig,
  setSupabaseConfig,
  testSupabaseConnection,
  getLastSyncedTime,
  getAutoSyncEnabled,
  setAutoSyncEnabled,
  UserProfileData,
} from "../lib/supabase";
import { getLocalTvProgress } from "../lib/storage";
import { getLocalCollections } from "../lib/collections";

interface ProfileViewProps {
  movies: WatchlistMovie[];
  watched: WatchlistMovie[];
  onRestoreUserData?: (data: {
    watchlist?: WatchlistMovie[];
    watched?: WatchlistMovie[];
    collections?: MovieCollection[];
  }) => void;
  onNavigateToWatchlist?: () => void;
  onNavigateToSettings?: () => void;
}

export function ProfileView({
  movies,
  watched,
  onRestoreUserData,
  onNavigateToSettings,
}: ProfileViewProps) {
  const [currentUser, setCurrentUser] = useState<UserProfileData | null>(() =>
    getSavedSupabaseUser()
  );

  // Auth Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showKeyConfigModal, setShowKeyConfigModal] = useState(false);
  const [authMethod, setAuthMethod] = useState<"google" | "email" | "instant">("google");

  // Form Inputs
  const [emailInput, setEmailInput] = useState(currentUser?.email || "percy.caraxes@gmail.com");
  const [passwordInput, setPasswordInput] = useState("");
  const [urlInput, setUrlInput] = useState(() => getSupabaseConfig().url);
  const [keyInput, setKeyInput] = useState(() => (getSupabaseConfig().isCustom ? getSupabaseConfig().key : ""));

  // State flags
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);

  // Sync Preferences
  const [autoSync, setAutoSyncState] = useState<boolean>(() => getAutoSyncEnabled());
  const [lastSynced, setLastSynced] = useState<string | null>(() => getLastSyncedTime());

  // Supabase Config state
  const [supabaseConfig, setSupabaseConfigState] = useState(() => getSupabaseConfig());

  // Listen to Supabase session changes (e.g. redirect back from OAuth)
  useEffect(() => {
    const unsubscribe = initSupabaseAuthListener(async (user) => {
      if (user) {
        setCurrentUser(user);
        // Automatically sync & restore cloud data
        const cloudData = await loadUserDataFromSupabaseCloud(user.id);
        if (cloudData && (cloudData.watchlist || cloudData.watched)) {
          if (onRestoreUserData) {
            onRestoreUserData({
              watchlist: cloudData.watchlist,
              watched: cloudData.watched,
              collections: cloudData.collections,
            });
          }
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onRestoreUserData]);

  // Opt-in Auto sync user data to cloud whenever list changes if logged in AND autoSync is enabled
  useEffect(() => {
    if (currentUser?.id && autoSync) {
      const collections = getLocalCollections();
      const tvProgress = getLocalTvProgress();
      saveUserDataToSupabaseCloud(currentUser.id, {
        watchlist: movies,
        watched: watched,
        collections,
        tvProgress,
      }).then((res) => {
        if (res.success) {
          setLastSynced(res.timestamp);
        }
      });
    }
  }, [movies, watched, currentUser, autoSync]);

  const showNotification = (text: string, type: "success" | "error" | "info" = "success") => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSyncState(enabled);
    setAutoSyncEnabled(enabled);
    showNotification(
      enabled
        ? "Auto-Sync enabled: Changes will automatically push to Supabase."
        : "Auto-Sync paused: Use the 'Sync to Supabase' button for manual sync.",
      "info"
    );
  };

  // Explicit Manual Sync Action
  const handleManualSyncToSupabase = async () => {
    setIsSyncing(true);

    try {
      // Ensure user profile exists or activate default
      let activeUser = currentUser;
      if (!activeUser) {
        activeUser = signInInstant(emailInput.trim() || "percy.caraxes@gmail.com");
        setCurrentUser(activeUser);
      }

      const collections = getLocalCollections();
      const tvProgress = getLocalTvProgress();

      const result = await saveUserDataToSupabaseCloud(activeUser.id, {
        watchlist: movies,
        watched: watched,
        collections,
        tvProgress,
      });

      setIsSyncing(false);

      if (result.success) {
        setLastSynced(result.timestamp);
        showNotification(result.message, "success");
      } else {
        showNotification(result.message || "Failed to sync to Supabase.", "error");
      }
    } catch (e: any) {
      setIsSyncing(false);
      showNotification(e?.message || "Sync failed. Check your network or Supabase settings.", "error");
    }
  };

  // Pull / Restore from Supabase
  const handleRestoreFromSupabase = async () => {
    if (!currentUser?.id) {
      showNotification("Please sign in or connect your profile first.", "info");
      return;
    }

    setIsPulling(true);
    try {
      const cloudData = await loadUserDataFromSupabaseCloud(currentUser.id);
      setIsPulling(false);

      if (cloudData && (cloudData.watchlist || cloudData.watched)) {
        if (onRestoreUserData) {
          onRestoreUserData({
            watchlist: cloudData.watchlist,
            watched: cloudData.watched,
            collections: cloudData.collections,
          });
        }
        const count = (cloudData.watchlist?.length || 0) + (cloudData.watched?.length || 0);
        showNotification(`Successfully restored ${count} titles from Supabase cloud!`, "success");
      } else {
        showNotification("No cloud backup found for this profile yet.", "info");
      }
    } catch (e: any) {
      setIsPulling(false);
      showNotification(e?.message || "Failed to restore cloud data.", "error");
    }
  };

  const handlePostAuthSuccess = async (user: UserProfileData) => {
    setCurrentUser(user);
    setShowAuthModal(false);
    setProviderError(null);

    // Restore or sync data
    const cloudData = await loadUserDataFromSupabaseCloud(user.id);
    if (cloudData && ((cloudData.watchlist && cloudData.watchlist.length > 0) || (cloudData.watched && cloudData.watched.length > 0))) {
      if (onRestoreUserData) {
        onRestoreUserData({
          watchlist: cloudData.watchlist,
          watched: cloudData.watched,
          collections: cloudData.collections,
        });
      }
      showNotification(`Welcome back, ${user.name}! Watchlist restored.`, "success");
    } else {
      const collections = getLocalCollections();
      const tvProgress = getLocalTvProgress();
      await saveUserDataToSupabaseCloud(user.id, {
        watchlist: movies,
        watched: watched,
        collections,
        tvProgress,
      });
      showNotification(`Signed in as ${user.name}. Data synced to Supabase.`, "success");
    }
  };

  const handleGoogleSignIn = async () => {
    setIsProcessing(true);
    setProviderError(null);

    const res = await triggerGoogleOAuth();
    setIsProcessing(false);

    if (res.success && res.user) {
      handlePostAuthSuccess(res.user);
    } else if (res.providerNotEnabled) {
      setProviderError(
        "Google OAuth provider is not enabled in your Supabase project. You can enable it in Supabase Dashboard > Auth > Providers, or sign in using Email / Instant Sign-In below."
      );
    } else if (res.error) {
      setProviderError(res.error);
    }
  };

  const handleEmailAuth = async () => {
    if (!emailInput.trim()) {
      showNotification("Please enter a valid email.", "error");
      return;
    }

    setIsProcessing(true);
    setProviderError(null);

    if (passwordInput) {
      const res = await signInWithPassword(emailInput.trim(), passwordInput);
      setIsProcessing(false);
      if (res.success && res.user) {
        handlePostAuthSuccess(res.user);
      } else {
        setProviderError(res.error || "Email/password authentication failed.");
      }
    } else {
      const res = await signInWithEmailOtp(emailInput.trim());
      setIsProcessing(false);
      if (res.success) {
        showNotification(res.message || "Magic login link sent!", "info");
        setShowAuthModal(false);
      } else {
        setProviderError(res.error || "Failed to send magic link.");
      }
    }
  };

  const handleInstantSignIn = () => {
    const user = signInInstant(emailInput.trim());
    handlePostAuthSuccess(user);
  };

  const handleSignOut = async () => {
    await logoutSupabaseUser();
    setCurrentUser(null);
    showNotification("Signed out. Switched to local storage.", "info");
  };

  const handleSaveSupabaseKeys = async () => {
    if (!urlInput.trim() || !keyInput.trim()) {
      showNotification("Please provide both Supabase URL and Anon Key.", "error");
      return;
    }

    const saved = setSupabaseConfig(urlInput, keyInput);
    if (saved) {
      setSupabaseConfigState(getSupabaseConfig());
      const test = await testSupabaseConnection();
      if (test.success) {
        showNotification("Supabase keys connected successfully!", "success");
        setShowKeyConfigModal(false);
      } else {
        showNotification(`Saved keys. Test warning: ${test.message}`, "info");
        setShowKeyConfigModal(false);
      }
    } else {
      showNotification("Failed to save credentials.", "error");
    }
  };

  const formatTimeAgo = (isoString: string | null) => {
    if (!isoString) return "Never synced";
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return "Just now";
      if (diffMins === 1) return "1 min ago";
      if (diffMins < 60) return `${diffMins} mins ago`;
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Recently";
    }
  };

  const displayName = currentUser?.name || "Percy Caraxes";
  const displayEmail = currentUser?.email || "percy.caraxes@gmail.com";
  const isLoggedIn = !!currentUser;
  const totalTitles = movies.length + watched.length;

  return (
    <div
      id="profile-page"
      className="w-full max-w-sm sm:max-w-md mx-auto py-6 px-3 space-y-4 animate-in fade-in duration-300 select-none"
    >
      {/* Toast Notification */}
      {statusMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-zinc-900 border border-amber-500/40 text-zinc-100 text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-200 max-w-md text-center">
          {statusMsg.type === "error" ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Top Centered Profile Picture */}
        <div className="relative mb-3">
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full p-1 bg-gradient-to-tr from-amber-400/30 to-amber-500/10 flex items-center justify-center">
            {isLoggedIn && currentUser?.picture ? (
              <img
                src={currentUser.picture}
                alt={displayName}
                className="w-full h-full rounded-full object-cover bg-zinc-950 border border-zinc-800"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-amber-400 shadow-inner">
                <User className="w-9 h-9" />
              </div>
            )}
          </div>

          {/* Minimal Mode Indicator Badge */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
            <span
              className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm border ${
                isLoggedIn
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-zinc-800/90 text-zinc-400 border-zinc-700/80"
              }`}
            >
              {isLoggedIn ? (
                <>
                  <Globe className="w-2.5 h-2.5 text-emerald-400" />
                  <span>ONLINE</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-2.5 h-2.5 text-amber-400" />
                  <span>OFFLINE</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* User Name & Subtitle */}
        <div className="mt-1 mb-4 space-y-0.5">
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">
            {displayName}
          </h2>
          <p className="text-xs text-zinc-400 font-medium">
            {isLoggedIn ? displayEmail : "Local Browser Storage"}
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="w-full mb-5 space-y-2">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-2 px-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold border border-zinc-700/70 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 disabled:opacity-75"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          )}

          {/* Quick Sign-In Options & Supabase Key Setup Link */}
          <div className="flex items-center justify-center gap-3 pt-0.5">
            {!isLoggedIn && (
              <button
                type="button"
                onClick={() => {
                  setProviderError(null);
                  setShowAuthModal(true);
                }}
                className="text-[11px] text-zinc-400 hover:text-amber-400 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Mail className="w-3 h-3" />
                <span>Other Sign In Options</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowKeyConfigModal(true)}
              className="text-[11px] text-zinc-500 hover:text-amber-400 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <KeyRound className="w-3 h-3" />
              <span>
                {supabaseConfig.isCustom ? "Supabase: Connected" : "Supabase Keys"}
              </span>
            </button>
          </div>
        </div>

        {/* Minimal Library Counter Grid */}
        <div className="w-full grid grid-cols-3 gap-1.5 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 text-center">
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Watchlist
            </span>
            <span className="text-base font-black text-amber-400 mt-0.5 block">
              {movies.length}
            </span>
          </div>
          <div className="border-x border-zinc-800/80">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Watched
            </span>
            <span className="text-base font-black text-emerald-400 mt-0.5 block">
              {watched.length}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Total
            </span>
            <span className="text-base font-black text-zinc-200 mt-0.5 block">
              {totalTitles}
            </span>
          </div>
        </div>
      </div>

      {/* DEDICATED SUPABASE CLOUD SYNC CARD & OPT-IN CONTROLS */}
      <div
        id="supabase-sync-section"
        className="bg-zinc-900/90 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 text-left relative overflow-hidden"
      >
        {/* Card Header with Status Pill */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                <span>Supabase Cloud Sync</span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Backup & sync your watchlists to Supabase
              </p>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              supabaseConfig.isConfigured
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-300 border-amber-500/30"
            }`}
          >
            {supabaseConfig.isCustom ? "Custom DB" : "Cloud Ready"}
          </span>
        </div>

        {/* Sync Status Banner */}
        <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/70 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>Last Synced:</span>
            <span className="font-semibold text-amber-400">
              {formatTimeAgo(lastSynced)}
            </span>
          </div>
          <span className="text-[11px] text-zinc-500">
            {totalTitles} items queued
          </span>
        </div>

        {/* Primary Manual Sync Button */}
        <button
          id="sync-to-supabase-btn"
          type="button"
          disabled={isSyncing}
          onClick={handleManualSyncToSupabase}
          className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 disabled:opacity-70 group"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
              <span>Sending Data to Supabase...</span>
            </>
          ) : (
            <>
              <CloudUpload className="w-4 h-4 text-zinc-950 transition-transform group-hover:-translate-y-0.5" />
              <span>Sync to Supabase Now</span>
            </>
          )}
        </button>

        {/* Secondary Restore Action & Auto-Sync Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {/* Pull / Restore from Cloud */}
          <button
            id="pull-from-supabase-btn"
            type="button"
            disabled={isPulling}
            onClick={handleRestoreFromSupabase}
            className="w-full py-2.5 px-3 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
          >
            {isPulling ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Pulling...</span>
              </>
            ) : (
              <>
                <CloudDownload className="w-3.5 h-3.5 text-amber-400" />
                <span>Restore from Supabase</span>
              </>
            )}
          </button>

          {/* Key Settings Button */}
          <button
            type="button"
            onClick={() => setShowKeyConfigModal(true)}
            className="w-full py-2.5 px-3 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Configure Supabase Keys</span>
          </button>
        </div>

        {/* Auto-Sync Opt-In Switch */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-zinc-200 block">
              Auto-Sync on Changes
            </span>
            <span className="text-[11px] text-zinc-500 block">
              Automatically push edits & ratings to Supabase
            </span>
          </div>

          <button
            id="toggle-auto-sync-btn"
            type="button"
            role="switch"
            aria-checked={autoSync}
            onClick={() => handleToggleAutoSync(!autoSync)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
              autoSync ? "bg-amber-500" : "bg-zinc-800 border border-zinc-700"
            }`}
          >
            <div
              className={`bg-zinc-950 w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                autoSync ? "translate-x-5 bg-zinc-950" : "translate-x-0 bg-zinc-400"
              }`}
            />
          </button>
        </div>
      </div>

      {/* AUTHENTICATION MODAL */}
      {showAuthModal && (
        <div
          id="auth-modal-backdrop"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowAuthModal(false)}
        >
          <div
            id="auth-modal"
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                <span>Supabase Authentication</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-zinc-400 hover:text-white text-xs cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* Error Banner / Provider Not Enabled Alert */}
            {providerError && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{providerError}</p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleInstantSignIn}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[11px] transition-all cursor-pointer"
                  >
                    1-Tap Instant Sign-In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAuthModal(false);
                      setShowKeyConfigModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold transition-all cursor-pointer"
                  >
                    Configure Keys
                  </button>
                </div>
              </div>
            )}

            {/* Auth Method Tabs */}
            <div className="flex items-center gap-1 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setAuthMethod("google")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  authMethod === "google"
                    ? "bg-amber-500 text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Google
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod("email")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  authMethod === "email"
                    ? "bg-amber-500 text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod("instant")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  authMethod === "instant"
                    ? "bg-amber-500 text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Instant
              </button>
            </div>

            {/* GOOGLE TAB */}
            {authMethod === "google" && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Sign in through Supabase Google OAuth. Your watchlist and ratings will be synced and restored automatically.
                </p>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleGoogleSignIn}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* EMAIL TAB */}
            {authMethod === "email" && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-zinc-300">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-400/50"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-zinc-300">
                      Password (Optional)
                    </label>
                    <span className="text-[10px] text-zinc-500">Leave blank for Magic Link</span>
                  </div>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-400/50"
                  />
                </div>
                <button
                  type="button"
                  disabled={isProcessing || !emailInput.trim()}
                  onClick={handleEmailAuth}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5" />
                      <span>{passwordInput ? "Sign In / Sign Up" : "Send Magic Link"}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* INSTANT TAB */}
            {authMethod === "instant" && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Sign in immediately with any email. Saves your watchlist to cloud storage and syncs across devices instantly.
                </p>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-zinc-300">
                    Your Email
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="percy.caraxes@gmail.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-400/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleInstantSignIn}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>1-Tap Instant Sign-In</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUPABASE KEY CONFIG MODAL */}
      {showKeyConfigModal && (
        <div
          id="key-config-backdrop"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[95] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowKeyConfigModal(false)}
        >
          <div
            id="key-config-modal"
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Supabase Configuration</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowKeyConfigModal(false)}
                className="text-zinc-400 hover:text-white text-xs cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Enter your custom Supabase Project URL and public Anon Key (from Project Settings &gt; API in your Supabase dashboard).
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-zinc-300">
                  Project URL
                </label>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-zinc-300">
                  Anon / Public API Key
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-400/50"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={async () => {
                  const res = await testSupabaseConnection();
                  showNotification(res.message, res.success ? "success" : "error");
                }}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
              >
                Test Connection
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowKeyConfigModal(false)}
                  className="px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSupabaseKeys}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all cursor-pointer"
                >
                  Save Keys
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
