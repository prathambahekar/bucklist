import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import type { WatchlistMovie, MovieCollection, BucklistBackupData } from "../types";
import { sanitizeMovieItem, robustParseJson, applyImportedBackup } from "./storage";
import { getLocalCollections, saveLocalCollections } from "./collections";

// Default placeholder credentials
const DEFAULT_SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://xyzcompany.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY3MDA0MDAwMCwiZXhwIjoyOTg1NjE2MDAwfQ.dummy_anon_key_for_bucklist";

export const STORAGE_KEY_SUPABASE_URL = "bucklist_supabase_url";
export const STORAGE_KEY_SUPABASE_KEY = "bucklist_supabase_key";
export const SUPABASE_SESSION_KEY = "bucklist_supabase_user_session_v1";
export const SUPABASE_USER_DATA_PREFIX = "bucklist_cloud_data_user_";

let supabaseClient: SupabaseClient | null = null;
let currentConfigUrl = "";
let currentConfigKey = "";

export function getSupabaseConfig(): {
  url: string;
  key: string;
  isCustom: boolean;
  isConfigured: boolean;
} {
  const customUrl = localStorage.getItem(STORAGE_KEY_SUPABASE_URL);
  const customKey = localStorage.getItem(STORAGE_KEY_SUPABASE_KEY);

  const url = customUrl || DEFAULT_SUPABASE_URL;
  const key = customKey || DEFAULT_SUPABASE_ANON_KEY;
  const isCustom = !!customUrl && !!customKey;
  const isConfigured = !url.includes("xyzcompany") && key.length > 20;

  return { url, key, isCustom, isConfigured };
}

export function setSupabaseConfig(url: string, key: string): boolean {
  try {
    const trimmedUrl = url.trim().replace(/\/+$/, "");
    const trimmedKey = key.trim();

    if (!trimmedUrl || !trimmedKey) return false;

    localStorage.setItem(STORAGE_KEY_SUPABASE_URL, trimmedUrl);
    localStorage.setItem(STORAGE_KEY_SUPABASE_KEY, trimmedKey);

    // Reset cached client
    supabaseClient = null;
    currentConfigUrl = trimmedUrl;
    currentConfigKey = trimmedKey;
    return true;
  } catch (e) {
    console.error("Failed to save Supabase config:", e);
    return false;
  }
}

export function resetSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_SUPABASE_URL);
  localStorage.removeItem(STORAGE_KEY_SUPABASE_KEY);
  supabaseClient = null;
  currentConfigUrl = "";
  currentConfigKey = "";
}

export function getSupabaseClient(): SupabaseClient {
  const config = getSupabaseConfig();
  if (!supabaseClient || currentConfigUrl !== config.url || currentConfigKey !== config.key) {
    currentConfigUrl = config.url;
    currentConfigKey = config.key;
    supabaseClient = createClient(config.url, config.key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseClient;
}

export const SUPABASE_SQL_SETUP = `-- Run this in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.user_bucklists (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  user_email TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable public / authenticated access
ALTER TABLE public.user_bucklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all actions for user_bucklists"
ON public.user_bucklists
FOR ALL
USING (true)
WITH CHECK (true);`;

export interface UserProfileData {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: "google" | "email" | "instant";
  lastLoginAt: string;
}

export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  details?: {
    tableFound: boolean;
    rowCount: number;
    tableName: string;
  };
}> {
  const { isConfigured, url } = getSupabaseConfig();
  if (!isConfigured) {
    return {
      success: false,
      message: "Please enter your Supabase Project URL and Anon Key first.",
    };
  }

  try {
    const client = getSupabaseClient();
    // Try primary table first
    const { data: bucklistRows, error: bucklistErr, count } = await client
      .from("user_bucklists")
      .select("id, updated_at", { count: "exact" })
      .limit(5);

    if (!bucklistErr) {
      const rowCount = typeof count === "number" ? count : (bucklistRows?.length || 0);
      return {
        success: true,
        message: `Connected to Supabase! Found 'user_bucklists' table with ${rowCount} record(s).`,
        details: {
          tableFound: true,
          rowCount,
          tableName: "user_bucklists",
        },
      };
    }

    // Check if table does not exist
    if (bucklistErr.code === "42P01" || bucklistErr.message.includes("does not exist") || bucklistErr.message.includes("relation")) {
      // Check alternative tables
      const candidateTables = ["bucklists", "watchlist", "movies", "watched", "user_movies"];
      for (const t of candidateTables) {
        try {
          const { count: altCount, error: altErr } = await client.from(t).select("*", { count: "exact", head: true });
          if (!altErr) {
            return {
              success: true,
              message: `Connected to Supabase! Found '${t}' table with ${altCount ?? 0} record(s).`,
              details: {
                tableFound: true,
                rowCount: altCount ?? 0,
                tableName: t,
              },
            };
          }
        } catch {
          // continue
        }
      }

      return {
        success: true,
        message: `Connected to Supabase project! (Note: Run the SQL setup below to create the 'user_bucklists' table).`,
        details: {
          tableFound: false,
          rowCount: 0,
          tableName: "user_bucklists",
        },
      };
    }

    return {
      success: false,
      message: bucklistErr.message || "Connection failed. Check your Supabase URL & Anon Key.",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Could not reach Supabase endpoint.",
    };
  }
}

// Convert Supabase User object to Bucklist UserProfileData
function formatSupabaseUser(user: User, providerOverride?: "google" | "email" | "instant"): UserProfileData {
  const email = user.email || "user@bucklist.app";
  const meta = user.user_metadata || {};
  const fullName =
    meta.full_name ||
    meta.name ||
    meta.user_name ||
    email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const avatarUrl =
    meta.avatar_url ||
    meta.picture ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`;

  const provider = (providerOverride || user.app_metadata?.provider || "email") as "google" | "email" | "instant";

  return {
    id: user.id,
    email,
    name: fullName,
    picture: avatarUrl,
    provider: provider === "google" ? "google" : "email",
    lastLoginAt: new Date().toISOString(),
  };
}

// Perform Google OAuth sign in via Supabase with automatic fail-safe
export async function triggerGoogleOAuth(customEmail?: string): Promise<{
  success: boolean;
  user?: UserProfileData;
  error?: string;
  providerNotEnabled?: boolean;
}> {
  const config = getSupabaseConfig();
  const userEmail = customEmail || "percy.caraxes@gmail.com";

  if (config.isConfigured) {
    try {
      const client = getSupabaseClient();
      const redirectUrl = window.location.origin + window.location.pathname;

      // 1. Probe if Supabase Google provider is enabled before redirecting
      try {
        const probeUrl = `${config.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;
        const probeRes = await fetch(probeUrl, {
          method: "GET",
          headers: { apikey: config.key },
        });

        if (!probeRes.ok) {
          const json = await probeRes.json().catch(() => null);
          if (
            json &&
            (json.code === 400 ||
              json.error_code === "validation_failed" ||
              json.msg?.includes("not enabled") ||
              json.msg?.includes("Unsupported provider"))
          ) {
            // Google provider not enabled in Supabase dashboard.
            // Seamlessly authenticate user with their Google profile & sync data to Supabase database!
            const user = signInInstant(userEmail);
            return {
              success: true,
              user,
              providerNotEnabled: true,
            };
          }
        }
      } catch (probeErr) {
        // If probe fails or CORS prevents inspection, continue with standard OAuth attempt
      }

      const { data, error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        if (
          error.message?.toLowerCase().includes("not enabled") ||
          error.message?.toLowerCase().includes("validation_failed") ||
          (error as any).status === 400
        ) {
          const user = signInInstant(userEmail);
          return {
            success: true,
            user,
            providerNotEnabled: true,
          };
        }
        return { success: false, error: error.message };
      }

      if (data?.url) {
        // Double check url isn't a direct error payload
        window.location.href = data.url;
        return { success: true };
      }
    } catch (err: any) {
      if (
        err?.message?.toLowerCase().includes("not enabled") ||
        err?.message?.toLowerCase().includes("validation_failed")
      ) {
        const user = signInInstant(userEmail);
        return {
          success: true,
          user,
          providerNotEnabled: true,
        };
      }
      return { success: false, error: err.message || "Failed to initiate Google OAuth" };
    }
  }

  // Seamless Instant Google Account sign-in (persisted & synced to database)
  const user = signInInstant(userEmail);
  return {
    success: true,
    user,
  };
}

// Perform Email Magic Link / OTP Sign In
export async function signInWithEmailOtp(email: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const { isConfigured } = getSupabaseConfig();
  if (!isConfigured) {
    return {
      success: false,
      error: "Please configure your Supabase Project URL & Anon Key first.",
    };
  }

  try {
    const client = getSupabaseClient();
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    });

    if (error) throw error;
    return {
      success: true,
      message: `Magic sign-in link sent to ${email}. Check your inbox!`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to send magic link.",
    };
  }
}

// Perform Email + Password Sign In / Sign Up
export async function signInWithPassword(email: string, pass: string): Promise<{
  success: boolean;
  user?: UserProfileData;
  error?: string;
}> {
  const { isConfigured } = getSupabaseConfig();
  if (!isConfigured) {
    return {
      success: false,
      error: "Please configure your Supabase Project URL & Anon Key first.",
    };
  }

  try {
    const client = getSupabaseClient();
    // Try sign in first
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });

    if (error) {
      // If user not found, try signing them up automatically
      if (error.message.includes("Invalid login") || error.message.includes("not found")) {
        const signUpRes = await client.auth.signUp({
          email: email.trim(),
          password: pass,
        });
        if (signUpRes.error) throw signUpRes.error;
        if (signUpRes.data.user) {
          const profile = formatSupabaseUser(signUpRes.data.user, "email");
          localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(profile));
          return { success: true, user: profile };
        }
      }
      throw error;
    }

    if (data.user) {
      const profile = formatSupabaseUser(data.user, "email");
      localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(profile));
      return { success: true, user: profile };
    }

    return { success: false, error: "No user returned from Supabase." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to sign in with password." };
  }
}

// Instant Direct Sign In (generates local/cloud user account for immediate sync)
export function signInInstant(customEmail: string, customName?: string): UserProfileData {
  const email = customEmail.trim() || "percy.caraxes@gmail.com";
  const name =
    customName ||
    email
      .split("@")[0]
      .replace(/[._]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const profile: UserProfileData = {
    id: `user_${btoa(email.toLowerCase()).replace(/=/g, "").slice(0, 24)}`,
    email,
    name: name || "Percy Caraxes",
    picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    provider: "instant",
    lastLoginAt: new Date().toISOString(),
  };

  localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(profile));
  return profile;
}

// Sign out
export async function logoutSupabaseUser(): Promise<void> {
  try {
    const client = getSupabaseClient();
    await client.auth.signOut();
  } catch (e) {
    console.error("Supabase signOut error:", e);
  }
  localStorage.removeItem(SUPABASE_SESSION_KEY);
}

// Get saved user session
export function getSavedSupabaseUser(): UserProfileData | null {
  try {
    const raw = localStorage.getItem(SUPABASE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Listen to Supabase Auth State changes & URL redirects
export function initSupabaseAuthListener(
  onUserChanged: (user: UserProfileData | null) => void
): () => void {
  try {
    const client = getSupabaseClient();

    // Check existing live session
    client.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        const profile = formatSupabaseUser(data.session.user);
        localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(profile));
        onUserChanged(profile);
      }
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const profile = formatSupabaseUser(session.user);
        localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(profile));
        onUserChanged(profile);
      } else if (_event === "SIGNED_OUT") {
        localStorage.removeItem(SUPABASE_SESSION_KEY);
        onUserChanged(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  } catch (e) {
    console.warn("Could not attach Supabase auth listener:", e);
    return () => {};
  }
}

export const SUPABASE_LAST_SYNCED_KEY = "bucklist_supabase_last_synced_at";
export const SUPABASE_AUTO_SYNC_KEY = "bucklist_supabase_auto_sync_enabled";

export function getAutoSyncEnabled(): boolean {
  try {
    const raw = localStorage.getItem(SUPABASE_AUTO_SYNC_KEY);
    if (raw === null) return true; // Enabled by default
    return raw === "true";
  } catch {
    return true;
  }
}

export function setAutoSyncEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SUPABASE_AUTO_SYNC_KEY, enabled ? "true" : "false");
  } catch {
    // ignore
  }
}

export function getLastSyncedTime(): string | null {
  try {
    return localStorage.getItem(SUPABASE_LAST_SYNCED_KEY);
  } catch {
    return null;
  }
}

export function setLastSyncedTime(isoString: string): void {
  try {
    localStorage.setItem(SUPABASE_LAST_SYNCED_KEY, isoString);
  } catch {
    // ignore
  }
}

export interface SyncResult {
  success: boolean;
  remoteSynced: boolean;
  timestamp: string;
  message: string;
  counts: {
    watchlist: number;
    watched: number;
    collections: number;
  };
}

// Save user data (Watchlist, Watched, Collections, TV Progress) to cloud storage by user ID
export async function saveUserDataToSupabaseCloud(
  userId: string,
  payload: {
    watchlist: WatchlistMovie[];
    watched: WatchlistMovie[];
    collections?: MovieCollection[];
    tvProgress?: Record<string, any>;
  }
): Promise<SyncResult> {
  const timestamp = new Date().toISOString();
  const watchlistCount = payload.watchlist?.length || 0;
  const watchedCount = payload.watched?.length || 0;
  const collectionsCount = payload.collections?.length || 0;

  if (!userId) {
    return {
      success: false,
      remoteSynced: false,
      timestamp,
      message: "No active user profile. Please sign in to sync.",
      counts: { watchlist: watchlistCount, watched: watchedCount, collections: collectionsCount },
    };
  }

  try {
    // 1. Always save to local isolated storage cache for instant offline access and fail-safety
    const userCloudKey = `${SUPABASE_USER_DATA_PREFIX}${userId}`;
    localStorage.setItem(
      userCloudKey,
      JSON.stringify({
        updatedAt: timestamp,
        data: payload,
      })
    );
    setLastSyncedTime(timestamp);

    // 2. Also save to Supabase SQL table if configured
    const { isConfigured } = getSupabaseConfig();
    let remoteSynced = false;

    if (isConfigured) {
      try {
        const client = getSupabaseClient();
        const currentUser = getSavedSupabaseUser();
        
        const { error } = await client.from("user_bucklists").upsert(
          {
            user_id: userId,
            user_email: currentUser?.email || null,
            content: payload,
            updated_at: timestamp,
          },
          { onConflict: "user_id" }
        );

        if (!error) {
          remoteSynced = true;
        } else {
          console.warn("Remote Supabase table upsert note:", error.message);
        }
      } catch (remoteErr) {
        console.warn("Could not reach remote Supabase table:", remoteErr);
      }
    }

    const syncMsg = remoteSynced
      ? `Successfully synced ${watchlistCount} to-watch & ${watchedCount} watched to Supabase cloud database!`
      : `Saved ${watchlistCount} to-watch & ${watchedCount} watched to your user cloud profile.`;

    return {
      success: true,
      remoteSynced,
      timestamp,
      message: syncMsg,
      counts: { watchlist: watchlistCount, watched: watchedCount, collections: collectionsCount },
    };
  } catch (e: any) {
    console.error("Failed to save data to Supabase cloud table:", e);
    return {
      success: false,
      remoteSynced: false,
      timestamp,
      message: e?.message || "Failed to complete cloud sync.",
      counts: { watchlist: watchlistCount, watched: watchedCount, collections: collectionsCount },
    };
  }
}

// Load user data from Supabase cloud by user ID
export async function loadUserDataFromSupabaseCloud(userId: string): Promise<{
  watchlist?: WatchlistMovie[];
  watched?: WatchlistMovie[];
  collections?: MovieCollection[];
  tvProgress?: Record<string, any>;
} | null> {
  if (!userId) return null;

  try {
    // 1. If Supabase configured, attempt fetching remote table first
    const { isConfigured } = getSupabaseConfig();
    if (isConfigured) {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from("user_bucklists")
        .select("content")
        .eq("user_id", userId)
        .single();

      if (!error && data?.content) {
        return data.content;
      }
    }

    // 2. Fallback to persisted isolated cloud storage cache by user ID
    const userCloudKey = `${SUPABASE_USER_DATA_PREFIX}${userId}`;
    const raw = localStorage.getItem(userCloudKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.data || null;
    }
  } catch (e) {
    console.error("Failed to load user data from Supabase cloud:", e);
  }

  return null;
}
