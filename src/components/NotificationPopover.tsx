import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  X,
  CheckCircle2,
  Tv,
  Film,
  Sparkles,
  Calendar,
  Trash2,
  ExternalLink,
  Flame,
  Clapperboard,
  Tv2,
} from "lucide-react";
import type { WatchlistMovie } from "../types";
import type { TvProgressMap } from "../lib/storage";

export interface AppNotification {
  id: string;
  type: "release" | "recommendation" | "episode" | "watchlist" | "milestone" | "tip";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  movieId?: string;
  badge?: string;
}

interface NotificationPopoverProps {
  movies: WatchlistMovie[];
  watched: WatchlistMovie[];
  tvProgressMap: TvProgressMap;
  onSelectMovie?: (movie: WatchlistMovie) => void;
}

const DISMISSED_NOTIFICATIONS_KEY = "bucklist_dismissed_notifications_v1";

function getDismissedIds(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDismissedIds(ids: string[]): void {
  try {
    localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function NotificationPopover({
  movies,
  watched,
  tvProgressMap,
  onSelectMovie,
}: NotificationPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedIds);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Calculate dynamic notifications cleanly and conservatively (no spam/dummy tips)
  useEffect(() => {
    const list: AppNotification[] = [];
    const currentYear = new Date().getFullYear();

    // 1. Only show if an actual title from watchlist is releasing this year
    const upcomingOrNew = movies.filter((m) => {
      if (!m.release_year) return false;
      const year = parseInt(m.release_year, 10);
      return !isNaN(year) && year >= currentYear;
    });

    if (upcomingOrNew.length > 0) {
      const topUpcoming = upcomingOrNew[0];
      const notifId = `release-${topUpcoming.id}`;
      if (!dismissedIds.includes(notifId)) {
        const platformInfo =
          topUpcoming.platforms && topUpcoming.platforms.length > 0
            ? `Streaming on ${topUpcoming.platforms[0]}`
            : "Available to stream or in theaters";

        list.push({
          id: notifId,
          type: "release",
          title: `${topUpcoming.title} (${topUpcoming.release_year})`,
          message: `In your Watchlist: ${platformInfo}.`,
          timestamp: "Release",
          read: true,
          movieId: topUpcoming.id,
          badge: "Release",
        });
      }
    }

    // 2. TV series with active unwatched episodes in progress (max 1 show alert)
    const tvSeries = movies.filter((m) => m.media_type === "tv");
    for (const show of tvSeries) {
      const progress = tvProgressMap[show.tmdb_id];
      const watchedCount = progress?.watchedEpisodes?.length || 0;
      const total = progress?.totalEpisodes;

      if (total && watchedCount > 0 && watchedCount < total) {
        const notifId = `tv-progress-${show.id}`;
        if (!dismissedIds.includes(notifId)) {
          const remaining = total - watchedCount;
          list.push({
            id: notifId,
            type: "episode",
            title: `Continue ${show.title}`,
            message: `${remaining} ${remaining === 1 ? "episode" : "episodes"} remaining.`,
            timestamp: "In Progress",
            read: true,
            movieId: show.id,
          });
          break; // Keep to at most 1 TV reminder to avoid clutter
        }
      }
    }

    setNotifications(list);
  }, [movies, watched, tvProgressMap, dismissedIds]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close on outside click / escape & lock body scroll
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    const allIds = notifications.map((n) => n.id);
    const updated = Array.from(new Set([...dismissedIds, ...allIds]));
    setDismissedIds(updated);
    saveDismissedIds(updated);
    setNotifications([]);
  };

  const removeNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = Array.from(new Set([...dismissedIds, id]));
    setDismissedIds(updated);
    saveDismissedIds(updated);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNotificationClick = (n: AppNotification) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
    );
    if (n.movieId && onSelectMovie) {
      const match = [...movies, ...watched].find((m) => m.id === n.movieId);
      if (match) {
        onSelectMovie(match);
        setIsOpen(false);
      }
    }
  };

  return (
    <>
      {/* Top Bar Trigger Button - Icon-only on mobile, compact sleek dark on desktop */}
      <button
        type="button"
        id="topbar-notifications-btn"
        onClick={() => setIsOpen(true)}
        className={`relative flex items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:px-3 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer shadow-xs border ${
          isOpen
            ? "bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm ring-1 ring-zinc-700"
            : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800/90 hover:border-zinc-700 active:scale-95"
        }`}
        title="Notifications & Activity"
      >
        <Bell
          className={`w-4 h-4 shrink-0 transition-transform ${
            isOpen ? "text-amber-400 scale-105" : "text-zinc-400 group-hover:text-amber-400"
          }`}
        />
        <span className="hidden sm:inline font-medium">Alerts</span>

        {/* Unread badge count */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-zinc-950 text-[10px] font-black rounded-full flex items-center justify-center shadow-xs animate-in zoom-in">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ========================================================================= */}
      {/* NOTIFICATION DRAWER / MODAL: Desktop Center Dialog & Mobile Bottom Sheet  */}
      {/* ========================================================================= */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Content Box */}
          <div
            ref={popoverRef}
            id="notifications-drawer"
            className="relative z-10 w-full sm:max-w-lg bg-zinc-950 border-t sm:border border-zinc-800/90 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] sm:max-h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
          >
            {/* Mobile Drag Indicator Handle */}
            <div className="sm:hidden pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-zinc-800" />
            </div>

            {/* Modal / Drawer Header */}
            <div className="flex items-center justify-between px-5 pt-3 sm:pt-5 pb-2 sm:px-6">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xs shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                  <h3 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight whitespace-nowrap">
                    Smart Activity & Alerts
                  </h3>
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap shrink-0">
                      {unreadCount} new
                    </span>
                  )}
                </div>
              </div>

              {/* Actions & Close Button */}
              <div className="flex items-center gap-1 shrink-0">
                {notifications.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-xs font-medium text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Mark read
                    </button>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
                      title="Clear all alerts"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification Items List */}
            <div className="flex-1 overflow-y-auto px-5 pt-2 pb-6 sm:px-6 space-y-2.5 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-12 text-center px-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-500">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-200">
                    All caught up!
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                    Upcoming release triggers, "What to Watch Tonight" recommendations, and TV episode alerts will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      item.read
                        ? "bg-zinc-950/60 border-zinc-800/40 opacity-70 hover:opacity-100 hover:bg-zinc-900/40"
                        : "bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900 shadow-xs"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Category Icon */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                          item.type === "release"
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            : item.type === "recommendation"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-amber-500/10"
                            : item.type === "episode"
                            ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                            : item.type === "milestone"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : item.type === "watchlist"
                            ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                            : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                        }`}
                      >
                        {item.type === "release" && <Clapperboard className="w-4 h-4" />}
                        {item.type === "recommendation" && <Flame className="w-4 h-4" />}
                        {item.type === "episode" && <Tv className="w-4 h-4" />}
                        {item.type === "milestone" && <Sparkles className="w-4 h-4" />}
                        {item.type === "watchlist" && <Film className="w-4 h-4" />}
                        {item.type === "tip" && <Calendar className="w-4 h-4" />}
                      </div>

                      {/* Notification Body */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-zinc-100 truncate group-hover:text-amber-400 transition-colors">
                              {item.title}
                            </h4>
                            {item.badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500 font-medium shrink-0">
                            {item.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          {item.message}
                        </p>

                        {item.movieId && (
                          <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-amber-400/90 group-hover:text-amber-300">
                            <span>Open details</span>
                            <ExternalLink className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      {/* Dismiss Action */}
                      <button
                        type="button"
                        onClick={(e) => removeNotification(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-all shrink-0 cursor-pointer"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
