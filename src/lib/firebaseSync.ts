import {
  db,
  handleFirestoreError,
  OperationType,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  writeBatch,
  onSnapshot,
  serverTimestamp,
  type User,
} from "./firebase";
import {
  getLocalWatchlist,
  saveLocalWatchlist,
  getLocalGamesWatchlist,
  saveLocalGamesWatchlist,
  getLocalTvProgress,
  saveLocalTvProgress,
  isInvalidWatchlistItem,
  type TvProgressMap,
} from "./storage";
import { getLocalCollections, saveLocalCollections } from "./collections";
import { getStoredTheme, saveStoredTheme, applyTheme, type AppTheme } from "./theme";
import type { WatchlistMovie, MovieCollection } from "../types";

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

/**
 * Initializes and merges user data upon sign in.
 */
export async function syncUserDataOnLogin(user: User): Promise<{
  mergedWatchlist: WatchlistMovie[];
  mergedGames: WatchlistMovie[];
  mergedTvProgress: TvProgressMap;
  mergedCollections: MovieCollection[];
  syncedTheme: AppTheme;
}> {
  const userId = user.uid;
  const userRef = doc(db, "users", userId);
  let syncedTheme = getStoredTheme();

  try {
    // 1. Ensure User Profile document exists
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: userId,
        email: user.email || "",
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
        theme: syncedTheme,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      const data = userSnap.data();
      if (data?.theme && (data.theme === "dark" || data.theme === "light" || data.theme === "system")) {
        syncedTheme = data.theme;
        saveStoredTheme(syncedTheme);
        applyTheme(syncedTheme);
      }
      await setDoc(
        userRef,
        {
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
  }

  // 2. Fetch existing cloud watchlist
  const cloudWatchlist: WatchlistMovie[] = [];
  try {
    const watchlistSnap = await getDocs(collection(db, "users", userId, "watchlist"));
    watchlistSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (isInvalidWatchlistItem(data)) {
        // Clean up invalid note/dummy docs from cloud in background
        deleteDoc(doc(db, "users", userId, "watchlist", docSnap.id)).catch(() => {});
      } else {
        cloudWatchlist.push(data as WatchlistMovie);
      }
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/watchlist`);
  }

  // 3. Fetch existing cloud TV progress
  const cloudTvProgress: TvProgressMap = {};
  try {
    const tvSnap = await getDocs(collection(db, "users", userId, "tv_progress"));
    tvSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const tmdbId = Number(docSnap.id);
      if (!isNaN(tmdbId)) {
        cloudTvProgress[tmdbId] = {
          watchedEpisodes: data.watchedEpisodes || [],
          totalEpisodes: data.totalEpisodes,
          seasonRatings: data.seasonRatings || {},
          lastUpdated: data.lastUpdated || new Date().toISOString(),
        };
      }
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/tv_progress`);
  }

  // 4. Fetch existing cloud collections
  const cloudCollections: MovieCollection[] = [];
  try {
    const collSnap = await getDocs(collection(db, "users", userId, "collections"));
    collSnap.forEach((docSnap) => {
      cloudCollections.push(docSnap.data() as MovieCollection);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/collections`);
  }

  // 5. Merge Local & Cloud data
  const localCinema = getLocalWatchlist();
  const localGames = getLocalGamesWatchlist();
  const localTv = getLocalTvProgress();
  const localColls = getLocalCollections();

  // Merge Watchlists
  const mergedMap = new Map<string, WatchlistMovie>();

  // Add all cloud items
  for (const item of cloudWatchlist) {
    mergedMap.set(item.id, item);
  }

  // Merge local cinema items
  const newItemsToPushToCloud: WatchlistMovie[] = [];
  for (const item of [...localCinema, ...localGames]) {
    if (!mergedMap.has(item.id)) {
      mergedMap.set(item.id, item);
      newItemsToPushToCloud.push(item);
    } else {
      // If local is watched and cloud is not, merge watched state
      const existing = mergedMap.get(item.id)!;
      if (item.watched && !existing.watched) {
        const updated = { ...existing, watched: true, watched_date: item.watched_date, rating: item.rating };
        mergedMap.set(item.id, updated);
        newItemsToPushToCloud.push(updated);
      }
    }
  }

  // Separate Cinema vs Gaming
  const allMerged = Array.from(mergedMap.values());
  const mergedCinema = allMerged.filter((m) => m.media_type !== "game");
  const mergedGames = allMerged.filter((m) => m.media_type === "game");

  // Merge TV progress
  const mergedTv: TvProgressMap = { ...cloudTvProgress };
  const tvToPush: { tmdbId: number; data: any }[] = [];
  for (const [key, val] of Object.entries(localTv)) {
    const tmdbId = Number(key);
    if (!mergedTv[tmdbId]) {
      mergedTv[tmdbId] = val;
      tvToPush.push({ tmdbId, data: val });
    } else {
      const epSet = new Set([...(mergedTv[tmdbId].watchedEpisodes || []), ...(val.watchedEpisodes || [])]);
      mergedTv[tmdbId] = {
        ...mergedTv[tmdbId],
        watchedEpisodes: Array.from(epSet),
        seasonRatings: { ...(mergedTv[tmdbId].seasonRatings || {}), ...(val.seasonRatings || {}) },
      };
      tvToPush.push({ tmdbId, data: mergedTv[tmdbId] });
    }
  }

  // Merge Collections
  const collMap = new Map<string, MovieCollection>();
  for (const c of cloudCollections) collMap.set(c.id, c);
  const collsToPush: MovieCollection[] = [];
  for (const c of localColls) {
    if (!collMap.has(c.id)) {
      collMap.set(c.id, c);
      collsToPush.push(c);
    }
  }
  const mergedColls = Array.from(collMap.values());

  // Save merged state to local storage
  saveLocalWatchlist(mergedCinema);
  saveLocalGamesWatchlist(mergedGames);
  saveLocalTvProgress(mergedTv);
  saveLocalCollections(mergedColls);

  // Batch push missing items to Firestore in background
  if (newItemsToPushToCloud.length > 0 || tvToPush.length > 0 || collsToPush.length > 0) {
    pushBatchedDataToCloud(userId, newItemsToPushToCloud, tvToPush, collsToPush).catch((err) => {
      console.warn("[Firebase Sync] Background batch sync error:", err);
    });
  }

  return {
    mergedWatchlist: mergedCinema,
    mergedGames,
    mergedTvProgress: mergedTv,
    mergedCollections: mergedColls,
    syncedTheme,
  };
}

export async function syncThemeToCloud(userId: string, theme: AppTheme): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(
      userRef,
      {
        theme,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
  }
}

async function pushBatchedDataToCloud(
  userId: string,
  items: WatchlistMovie[],
  tvList: { tmdbId: number; data: any }[],
  colls: MovieCollection[]
) {
  const batch = writeBatch(db);

  for (const item of items) {
    const docRef = doc(db, "users", userId, "watchlist", item.id);
    batch.set(docRef, {
      ...item,
      userId,
      updatedAt: new Date().toISOString(),
    });
  }

  for (const tv of tvList) {
    const docRef = doc(db, "users", userId, "tv_progress", String(tv.tmdbId));
    batch.set(docRef, {
      ...tv.data,
      userId,
      tmdbId: tv.tmdbId,
      lastUpdated: new Date().toISOString(),
    });
  }

  for (const coll of colls) {
    const docRef = doc(db, "users", userId, "collections", coll.id);
    batch.set(docRef, {
      ...coll,
      userId,
      updatedAt: new Date().toISOString(),
    });
  }

  await batch.commit();
}

/**
 * Real-time listeners
 */
export function subscribeToUserWatchlist(
  userId: string,
  onUpdate: (items: WatchlistMovie[]) => void
) {
  const colRef = collection(db, "users", userId, "watchlist");
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: WatchlistMovie[] = [];
      snapshot.forEach((d) => {
        const itemData = d.data() as WatchlistMovie;
        if (!isInvalidWatchlistItem(itemData)) {
          items.push(itemData);
        } else {
          deleteDoc(doc(db, "users", userId, "watchlist", d.id)).catch(() => {});
        }
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/watchlist`);
    }
  );
}

export function subscribeToUserTvProgress(
  userId: string,
  onUpdate: (progress: TvProgressMap) => void
) {
  const colRef = collection(db, "users", userId, "tv_progress");
  return onSnapshot(
    colRef,
    (snapshot) => {
      const map: TvProgressMap = {};
      snapshot.forEach((d) => {
        const tmdbId = Number(d.id);
        if (!isNaN(tmdbId)) {
          map[tmdbId] = d.data() as any;
        }
      });
      onUpdate(map);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/tv_progress`);
    }
  );
}

export function subscribeToUserCollections(
  userId: string,
  onUpdate: (colls: MovieCollection[]) => void
) {
  const colRef = collection(db, "users", userId, "collections");
  return onSnapshot(
    colRef,
    (snapshot) => {
      const colls: MovieCollection[] = [];
      snapshot.forEach((d) => colls.push(d.data() as MovieCollection));
      onUpdate(colls);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/collections`);
    }
  );
}

export function subscribeToUserProfile(
  userId: string,
  onUpdate: (profile: { theme?: AppTheme }) => void
) {
  const userRef = doc(db, "users", userId);
  return onSnapshot(
    userRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onUpdate({ theme: data.theme });
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    }
  );
}

/**
 * Direct Cloud Mutation Helpers
 */
export async function syncWatchlistItemToCloud(
  userId: string,
  item: WatchlistMovie
): Promise<void> {
  try {
    const docRef = doc(db, "users", userId, "watchlist", item.id);
    await setDoc(docRef, {
      ...item,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/watchlist/${item.id}`);
  }
}

export async function removeWatchlistItemFromCloud(
  userId: string,
  itemId: string
): Promise<void> {
  try {
    const docRef = doc(db, "users", userId, "watchlist", itemId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}/watchlist/${itemId}`);
  }
}

export async function syncTvProgressToCloud(
  userId: string,
  tmdbId: number,
  progress: any
): Promise<void> {
  try {
    const docRef = doc(db, "users", userId, "tv_progress", String(tmdbId));
    await setDoc(docRef, {
      ...progress,
      userId,
      tmdbId,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/tv_progress/${tmdbId}`);
  }
}

export async function syncCollectionToCloud(
  userId: string,
  coll: MovieCollection
): Promise<void> {
  try {
    const docRef = doc(db, "users", userId, "collections", coll.id);
    await setDoc(docRef, {
      ...coll,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/collections/${coll.id}`);
  }
}

export async function removeCollectionFromCloud(
  userId: string,
  collId: string
): Promise<void> {
  try {
    const docRef = doc(db, "users", userId, "collections", collId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}/collections/${collId}`);
  }
}

export async function syncEntireLocalWatchlistToCloud(userId: string): Promise<number> {
  const cinema = getLocalWatchlist();
  const games = getLocalGamesWatchlist();
  const all = [...cinema, ...games];
  const tv = getLocalTvProgress();
  const colls = getLocalCollections();

  const tvList = Object.entries(tv).map(([key, val]) => ({
    tmdbId: Number(key),
    data: val,
  }));

  await pushBatchedDataToCloud(userId, all, tvList, colls);
  return all.length;
}
