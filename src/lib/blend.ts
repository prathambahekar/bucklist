import type {
  Blend,
  BlendMember,
  BlendMovie,
  BlendMovieRating,
  BlendTasteStats,
  BlendMemberMoviePref,
  WatchlistMovie,
  SearchResult,
} from "../types";
import { getLocalWatchlist } from "./storage";

export const BLENDS_STORAGE_KEY = "bucklist_blends_v1";
export const ACTIVE_USER_STORAGE_KEY = "bucklist_active_user_v1";

export interface CurrentUser {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export const DEFAULT_USER: CurrentUser = {
  id: "usr_you",
  name: "You",
  avatar: "",
  color: "zinc",
};

// -------------------------------------------------------------
// Storage & Identity
// -------------------------------------------------------------

export function getCurrentUser(): CurrentUser {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          id: parsed.id || DEFAULT_USER.id,
          name: parsed.name || DEFAULT_USER.name,
          avatar: parsed.avatar || "",
          color: parsed.color || "zinc",
        };
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_USER;
}

export function saveCurrentUser(user: CurrentUser): void {
  try {
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "BLEND-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/** Sanitize blend to remove any legacy dummy demo members (e.g. Alex) */
function sanitizeBlend(b: Blend): Blend {
  const sanitizedMembers = (b.members || []).filter(
    (m) =>
      m &&
      m.name &&
      m.name.toLowerCase() !== "alex" &&
      m.name.toLowerCase() !== "maya" &&
      m.name.toLowerCase() !== "sam" &&
      !m.id?.startsWith("usr_alex") &&
      !m.id?.startsWith("usr_maya") &&
      !m.id?.startsWith("usr_sam")
  );

  // If no members left, ensure at least current user is member
  const user = getCurrentUser();
  if (sanitizedMembers.length === 0) {
    sanitizedMembers.push({
      id: user.id,
      name: user.name || "You",
      avatar: "",
      color: "zinc",
      isOwner: true,
      joinedAt: new Date().toISOString(),
      personalMovies: [],
    });
  }

  const memberIds = new Set(sanitizedMembers.map((m) => m.id));

  // Sanitize movies wantedBy and ratings
  const sanitizedMovies = (b.movies || []).map((m) => ({
    ...m,
    wantedByMemberIds: (m.wantedByMemberIds || []).filter((id) => memberIds.has(id)),
    ratings: Object.fromEntries(
      Object.entries(m.ratings || {}).filter(([id]) => memberIds.has(id))
    ),
  }));

  return {
    ...b,
    emoji: "",
    members: sanitizedMembers,
    movies: sanitizedMovies,
  };
}

export function getLocalBlends(): Blend[] {
  try {
    const raw = localStorage.getItem(BLENDS_STORAGE_KEY);
    if (raw) {
      const blends: Blend[] = JSON.parse(raw);
      if (Array.isArray(blends) && blends.length > 0) {
        const cleaned = blends.map(sanitizeBlend);
        saveLocalBlends(cleaned);
        return cleaned;
      }
    }
  } catch {
    // fallback
  }

  // Generate initial default blend to welcome the user
  const initial = createInitialDefaultBlend();
  saveLocalBlends([initial]);
  return [initial];
}

export function saveLocalBlends(blends: Blend[]): void {
  try {
    localStorage.setItem(BLENDS_STORAGE_KEY, JSON.stringify(blends));
  } catch {
    // ignore
  }
}

function createInitialDefaultBlend(): Blend {
  const user = getCurrentUser();
  const userWatchlist = getLocalWatchlist();

  // Convert current user's movies to member taste format
  const userMoviePrefs: BlendMemberMoviePref[] = userWatchlist.map((m) => ({
    tmdb_id: m.tmdb_id,
    title: m.title,
    poster_path: m.poster_path,
    release_year: m.release_year,
    genres: m.genres || [],
    watched: m.watched,
    rating: m.rating ? (m.rating <= 5 ? m.rating * 2 : m.rating) : null,
  }));

  const ownerMember: BlendMember = {
    id: user.id,
    name: user.name || "You",
    avatar: "",
    color: "zinc",
    isOwner: true,
    joinedAt: new Date().toISOString(),
    personalMovies: userMoviePrefs,
  };

  return {
    id: "blend_" + Date.now(),
    name: "Movie Blend",
    emoji: "",
    inviteCode: generateInviteCode(),
    ownerId: ownerMember.id,
    members: [ownerMember],
    movies: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function addFriendDirectlyToBlend(
  blendId: string,
  name: string,
  avatar = "",
  color = "zinc"
): Blend | null {
  const cleanName = name.trim();
  if (!cleanName) return null;

  const all = getLocalBlends();
  const target = all.find((b) => b.id === blendId);
  if (!target) return null;

  // Check if name already exists
  if (target.members.some((m) => m.name.toLowerCase() === cleanName.toLowerCase())) {
    return target;
  }

  const newMember: BlendMember = {
    id: "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    name: cleanName,
    avatar: avatar || "",
    color: color || "zinc",
    isOwner: false,
    joinedAt: new Date().toISOString(),
    personalMovies: [],
  };

  const updatedBlend: Blend = {
    ...target,
    members: [...target.members, newMember],
    updatedAt: new Date().toISOString(),
  };

  const updatedAll = all.map((b) => (b.id === target.id ? updatedBlend : b));
  saveLocalBlends(updatedAll);
  return updatedBlend;
}

// -------------------------------------------------------------
// Blend CRUD Actions
// -------------------------------------------------------------

export function createBlend(name: string, emoji = "", ownerName?: string): Blend {
  const user = getCurrentUser();
  const resolvedName = ownerName?.trim() || user.name || "You";
  
  if (resolvedName !== user.name) {
    saveCurrentUser({ ...user, name: resolvedName });
  }

  const userWatchlist = getLocalWatchlist();
  const userMoviePrefs: BlendMemberMoviePref[] = userWatchlist.map((m) => ({
    tmdb_id: m.tmdb_id,
    title: m.title,
    poster_path: m.poster_path,
    release_year: m.release_year,
    genres: m.genres || [],
    watched: m.watched,
    rating: m.rating ? (m.rating <= 5 ? m.rating * 2 : m.rating) : null,
  }));

  const ownerMember: BlendMember = {
    id: user.id,
    name: resolvedName,
    avatar: "",
    color: "zinc",
    isOwner: true,
    joinedAt: new Date().toISOString(),
    personalMovies: userMoviePrefs,
  };

  const newBlend: Blend = {
    id: "blend_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    name: name.trim() || "Movie Blend",
    emoji: "",
    inviteCode: generateInviteCode(),
    ownerId: ownerMember.id,
    members: [ownerMember],
    movies: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const all = getLocalBlends();
  const updated = [newBlend, ...all];
  saveLocalBlends(updated);
  return newBlend;
}

export function joinBlendByCode(
  inviteCode: string,
  memberName?: string
): { success: boolean; blend?: Blend; error?: string } {
  const cleanCode = inviteCode.trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, error: "Please enter an invite code." };
  }

  const all = getLocalBlends();
  const target = all.find(
    (b) => b.inviteCode.toUpperCase() === cleanCode || b.id === inviteCode
  );

  const user = getCurrentUser();
  const resolvedName = memberName?.trim() || user.name || "Collaborator";

  if (!target) {
    return {
      success: false,
      error: `Blend code "${cleanCode}" was not found. Please verify the code with your friend.`,
    };
  }

  // Already a member?
  const existingMember = target.members.find((m) => m.id === user.id);
  if (existingMember) {
    return { success: true, blend: target };
  }

  // Add current user to members
  const newMember: BlendMember = {
    id: user.id,
    name: resolvedName,
    avatar: "",
    color: user.color || "amber",
    isOwner: false,
    joinedAt: new Date().toISOString(),
    personalMovies: getLocalWatchlist().map((m) => ({
      tmdb_id: m.tmdb_id,
      title: m.title,
      poster_path: m.poster_path,
      release_year: m.release_year,
      genres: m.genres || [],
      watched: m.watched,
      rating: m.rating,
    })),
  };

  const updatedBlend: Blend = {
    ...target,
    members: [...target.members, newMember],
    updatedAt: new Date().toISOString(),
  };

  const updatedAll = all.map((b) => (b.id === target.id ? updatedBlend : b));
  saveLocalBlends(updatedAll);
  return { success: true, blend: updatedBlend };
}

export function addMovieToBlend(
  blendId: string,
  movie: WatchlistMovie | SearchResult,
  memberId: string,
  memberName: string,
  extraDetails?: {
    runtime?: string;
    director?: string;
    cast?: string[];
    backdropPath?: string;
    voteAverage?: number;
  }
): Blend | null {
  const all = getLocalBlends();
  const blend = all.find((b) => b.id === blendId);
  if (!blend) return null;

  // Check if movie already exists in blend
  const existing = blend.movies.find((m) => m.tmdb_id === movie.tmdb_id);
  if (existing) {
    // If already exists, make sure this member is in wantedBy list
    if (!existing.wantedByMemberIds.includes(memberId)) {
      const updatedMovies = blend.movies.map((m) =>
        m.id === existing.id
          ? {
              ...m,
              wantedByMemberIds: [...m.wantedByMemberIds, memberId],
            }
          : m
      );
      const updatedBlend: Blend = {
        ...blend,
        movies: updatedMovies,
        updatedAt: new Date().toISOString(),
      };
      saveLocalBlends(all.map((b) => (b.id === blend.id ? updatedBlend : b)));
      return updatedBlend;
    }
    return blend;
  }

  // Cross-reference with other members' personal watchlists to see if others already want it!
  const wantedBy = new Set<string>([memberId]);
  for (const mem of blend.members) {
    if (mem.id !== memberId && mem.personalMovies) {
      const wantsIt = mem.personalMovies.some((pm) => pm.tmdb_id === movie.tmdb_id);
      if (wantsIt) {
        wantedBy.add(mem.id);
      }
    }
  }

  const newBlendMovie: BlendMovie = {
    id: "bm_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
    tmdb_id: movie.tmdb_id,
    title: movie.title,
    poster_path: movie.poster_path,
    backdrop_path: extraDetails?.backdropPath || null,
    release_year: movie.release_year,
    media_type: movie.media_type,
    genres: movie.genres || [],
    platforms: movie.platforms || [],
    runtime: extraDetails?.runtime,
    director: extraDetails?.director,
    cast: extraDetails?.cast,
    vote_average: extraDetails?.voteAverage,
    addedByMemberId: memberId,
    addedByMemberName: memberName,
    addedAt: new Date().toISOString(),
    wantedByMemberIds: Array.from(wantedBy),
    watchedTogether: false,
    watchedDate: null,
    ratings: {},
  };

  const updatedBlend: Blend = {
    ...blend,
    movies: [newBlendMovie, ...blend.movies],
    updatedAt: new Date().toISOString(),
  };

  saveLocalBlends(all.map((b) => (b.id === blend.id ? updatedBlend : b)));
  return updatedBlend;
}

export function toggleWantToWatchInBlend(
  blendId: string,
  blendMovieId: string,
  memberId: string
): Blend | null {
  const all = getLocalBlends();
  const blend = all.find((b) => b.id === blendId);
  if (!blend) return null;

  const updatedMovies = blend.movies.map((m) => {
    if (m.id !== blendMovieId) return m;
    const has = m.wantedByMemberIds.includes(memberId);
    const updatedWanted = has
      ? m.wantedByMemberIds.filter((id) => id !== memberId)
      : [...m.wantedByMemberIds, memberId];

    return {
      ...m,
      wantedByMemberIds: updatedWanted,
    };
  });

  const updatedBlend: Blend = {
    ...blend,
    movies: updatedMovies,
    updatedAt: new Date().toISOString(),
  };

  saveLocalBlends(all.map((b) => (b.id === blend.id ? updatedBlend : b)));
  return updatedBlend;
}

export function markWatchedTogether(
  blendId: string,
  blendMovieId: string,
  memberRatings: Record<string, number>, // memberId -> rating (1-10 or 1-5 scale)
  watchedDate: string,
  notes?: string
): Blend | null {
  const all = getLocalBlends();
  const blend = all.find((b) => b.id === blendId);
  if (!blend) return null;

  const targetMovie = blend.movies.find((m) => m.id === blendMovieId);
  if (!targetMovie) return null;

  const ratingsRecord: Record<string, BlendMovieRating> = { ...targetMovie.ratings };

  for (const [memberId, ratingValue] of Object.entries(memberRatings)) {
    const member = blend.members.find((m) => m.id === memberId);
    const memberName = member?.name || "Member";
    // Normalize to 1-10 scale if 1-5 provided
    const normalized = ratingValue <= 5 ? ratingValue * 2 : ratingValue;
    ratingsRecord[memberId] = {
      memberId,
      memberName,
      rating: Number(normalized.toFixed(1)),
      ratedAt: watchedDate || new Date().toISOString().split("T")[0],
    };
  }

  const updatedMovies = blend.movies.map((m) => {
    if (m.id !== blendMovieId) return m;
    return {
      ...m,
      watchedTogether: true,
      watchedDate: watchedDate || new Date().toISOString().split("T")[0],
      ratings: ratingsRecord,
      notes: notes || m.notes,
    };
  });

  const updatedBlend: Blend = {
    ...blend,
    movies: updatedMovies,
    updatedAt: new Date().toISOString(),
  };

  saveLocalBlends(all.map((b) => (b.id === blend.id ? updatedBlend : b)));
  return updatedBlend;
}

export function removeMovieFromBlend(blendId: string, blendMovieId: string): Blend | null {
  const all = getLocalBlends();
  const blend = all.find((b) => b.id === blendId);
  if (!blend) return null;

  const updatedBlend: Blend = {
    ...blend,
    movies: blend.movies.filter((m) => m.id !== blendMovieId),
    updatedAt: new Date().toISOString(),
  };

  saveLocalBlends(all.map((b) => (b.id === blend.id ? updatedBlend : b)));
  return updatedBlend;
}

export function updateBlend(
  blendId: string,
  updates: Partial<Pick<Blend, "name" | "emoji" | "description">>
): Blend | null {
  const all = getLocalBlends();
  const blend = all.find((b) => b.id === blendId);
  if (!blend) return null;

  const updatedBlend: Blend = {
    ...blend,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveLocalBlends(all.map((b) => (b.id === blend.id ? updatedBlend : b)));
  return updatedBlend;
}

export function removeMemberFromBlend(blendId: string, memberId: string): Blend | null {
  const all = getLocalBlends();
  const blend = all.find((b) => b.id === blendId);
  if (!blend) return null;

  // Clean up movies wantedBy and ratings for this member
  const cleanedMovies = blend.movies.map((m) => {
    const updatedWanted = m.wantedByMemberIds.filter((id) => id !== memberId);
    const updatedRatings = { ...m.ratings };
    delete updatedRatings[memberId];
    return {
      ...m,
      wantedByMemberIds: updatedWanted,
      ratings: updatedRatings,
    };
  });

  const updatedBlend: Blend = {
    ...blend,
    members: blend.members.filter((m) => m.id !== memberId),
    movies: cleanedMovies,
    updatedAt: new Date().toISOString(),
  };

  saveLocalBlends(all.map((b) => (b.id === blend.id ? updatedBlend : b)));
  return updatedBlend;
}

export function deleteBlend(blendId: string): boolean {
  const all = getLocalBlends();
  const filtered = all.filter((b) => b.id !== blendId);
  saveLocalBlends(filtered);
  return true;
}

// -------------------------------------------------------------
// Blend Matching & Taste Statistics Engine
// -------------------------------------------------------------

export function calculateBlendStats(
  blend: Blend,
  currentUserWatchlist: WatchlistMovie[] = []
): BlendTasteStats {
  if (!blend.members || blend.members.length === 0) {
    return {
      matchPercentage: 0,
      sharedMoviesCount: 0,
      totalUniqueMovies: 0,
      memberCounts: {},
      commonGenres: [],
      commonDirectors: [],
      commonActors: [],
      sharedFavorites: [],
      biggestDisagreements: [],
    };
  }

  // Sync current user's movies list with live watchlist
  const user = getCurrentUser();
  const currentMember = blend.members.find((m) => m.id === user.id);
  if (currentMember) {
    currentMember.personalMovies = currentUserWatchlist.map((m) => ({
      tmdb_id: m.tmdb_id,
      title: m.title,
      poster_path: m.poster_path,
      release_year: m.release_year,
      genres: m.genres || [],
      watched: m.watched,
      rating: m.rating ? (m.rating <= 5 ? m.rating * 2 : m.rating) : null,
    }));
  }

  // 1. Collect all movies per member (from blend movies + personal lists)
  const memberMovieMap = new Map<string, Map<number, BlendMemberMoviePref>>();
  const memberCounts: Record<string, { total: number; name: string }> = {};
  const allKnownMovies = new Map<number, {
    tmdb_id: number;
    title: string;
    poster_path: string | null;
    release_year: string | null;
    genres: string[];
    director?: string;
    cast?: string[];
  }>();

  for (const member of blend.members) {
    const movieMap = new Map<number, BlendMemberMoviePref>();

    // Personal list
    (member.personalMovies || []).forEach((m) => {
      movieMap.set(m.tmdb_id, m);
      if (!allKnownMovies.has(m.tmdb_id)) {
        allKnownMovies.set(m.tmdb_id, {
          tmdb_id: m.tmdb_id,
          title: m.title,
          poster_path: m.poster_path,
          release_year: m.release_year,
          genres: m.genres || [],
          director: m.director,
          cast: m.cast,
        });
      }
    });

    // Movies in blend added by or wanted by this member
    blend.movies.forEach((bm) => {
      if (bm.addedByMemberId === member.id || bm.wantedByMemberIds.includes(member.id)) {
        if (!movieMap.has(bm.tmdb_id)) {
          const ratingObj = bm.ratings[member.id];
          movieMap.set(bm.tmdb_id, {
            tmdb_id: bm.tmdb_id,
            title: bm.title,
            poster_path: bm.poster_path,
            release_year: bm.release_year,
            genres: bm.genres,
            director: bm.director,
            cast: bm.cast,
            watched: bm.watchedTogether,
            rating: ratingObj?.rating,
          });
        }
      }
      if (!allKnownMovies.has(bm.tmdb_id)) {
        allKnownMovies.set(bm.tmdb_id, {
          tmdb_id: bm.tmdb_id,
          title: bm.title,
          poster_path: bm.poster_path,
          release_year: bm.release_year,
          genres: bm.genres,
          director: bm.director,
          cast: bm.cast,
        });
      }
    });

    memberMovieMap.set(member.id, movieMap);
    memberCounts[member.id] = {
      total: movieMap.size,
      name: member.name,
    };
  }

  // 2. Compute Shared Movies (items wanted or saved by 2+ members)
  let sharedCount = 0;
  const sharedTmdbIds = new Set<number>();

  allKnownMovies.forEach((_, tmdbId) => {
    let interestedCount = 0;
    memberMovieMap.forEach((mMap) => {
      if (mMap.has(tmdbId)) interestedCount++;
    });

    // Also check blend movies explicit wantedBy
    const bm = blend.movies.find((m) => m.tmdb_id === tmdbId);
    if (bm && bm.wantedByMemberIds.length > 1) {
      interestedCount = Math.max(interestedCount, bm.wantedByMemberIds.length);
    }

    if (interestedCount >= 2) {
      sharedCount++;
      sharedTmdbIds.add(tmdbId);
    }
  });

  // 3. Compute Genre Synergy & Common Genres
  const genreCountMap = new Map<string, { total: number; memberHits: Set<string> }>();
  allKnownMovies.forEach((m) => {
    (m.genres || []).forEach((g) => {
      const current = genreCountMap.get(g) || { total: 0, memberHits: new Set<string>() };
      current.total++;
      blend.members.forEach((mem) => {
        const memMap = memberMovieMap.get(mem.id);
        if (memMap?.has(m.tmdb_id)) {
          current.memberHits.add(mem.id);
        }
      });
      genreCountMap.set(g, current);
    });
  });

  const commonGenres: { genre: string; count: number; synergy: number }[] = [];
  genreCountMap.forEach((val, genre) => {
    const memberRatio = blend.members.length > 0 ? val.memberHits.size / blend.members.length : 0;
    const synergy = Math.min(100, Math.round(memberRatio * 70 + Math.min(val.total * 6, 30)));
    commonGenres.push({
      genre,
      count: val.total,
      synergy,
    });
  });
  commonGenres.sort((a, b) => b.synergy - a.synergy || b.count - a.count);

  // 4. Compute Common Directors & Actors
  const directorMap = new Map<string, { count: number; movies: Set<string> }>();
  const actorMap = new Map<string, { count: number; movies: Set<string> }>();

  allKnownMovies.forEach((m) => {
    if (m.director) {
      const dir = m.director;
      const dVal = directorMap.get(dir) || { count: 0, movies: new Set<string>() };
      dVal.count++;
      dVal.movies.add(m.title);
      directorMap.set(dir, dVal);
    }
    (m.cast || []).forEach((act) => {
      const aVal = actorMap.get(act) || { count: 0, movies: new Set<string>() };
      aVal.count++;
      aVal.movies.add(m.title);
      actorMap.set(act, aVal);
    });
  });

  const commonDirectors = Array.from(directorMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      movies: Array.from(data.movies).slice(0, 3),
    }))
    .filter((d) => d.count >= 2 || (blend.movies.length <= 4 && d.count >= 1))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const commonActors = Array.from(actorMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      movies: Array.from(data.movies).slice(0, 3),
    }))
    .filter((a) => a.count >= 2 || (blend.movies.length <= 4 && a.count >= 1))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 5. Compute Shared Favorites & Biggest Disagreements
  const sharedFavorites: BlendTasteStats["sharedFavorites"] = [];
  const biggestDisagreements: BlendTasteStats["biggestDisagreements"] = [];

  // Look across both watched together ratings in blend AND members' personal rated items
  allKnownMovies.forEach((m, tmdbId) => {
    const ratingsForMovie: { memberName: string; rating: number }[] = [];
    
    // Check blend movie ratings
    const blendMovie = blend.movies.find((bm) => bm.tmdb_id === tmdbId);
    if (blendMovie && blendMovie.ratings) {
      Object.values(blendMovie.ratings).forEach((r) => {
        ratingsForMovie.push({ memberName: r.memberName, rating: r.rating });
      });
    }

    // Also check personal ratings
    blend.members.forEach((mem) => {
      const pref = mem.personalMovies?.find((p) => p.tmdb_id === tmdbId);
      if (pref && pref.rating && !ratingsForMovie.some((r) => r.memberName === mem.name)) {
        ratingsForMovie.push({ memberName: mem.name, rating: pref.rating });
      }
    });

    if (ratingsForMovie.length >= 2) {
      const sum = ratingsForMovie.reduce((acc, r) => acc + r.rating, 0);
      const avg = Number((sum / ratingsForMovie.length).toFixed(1));
      const minRating = Math.min(...ratingsForMovie.map((r) => r.rating));
      const maxRating = Math.max(...ratingsForMovie.map((r) => r.rating));
      const diff = Number((maxRating - minRating).toFixed(1));

      if (avg >= 8.0 && diff <= 2.0) {
        sharedFavorites.push({
          title: m.title,
          poster_path: m.poster_path,
          release_year: m.release_year,
          ratings: ratingsForMovie,
          avgRating: avg,
        });
      }

      if (diff >= 2.5) {
        biggestDisagreements.push({
          title: m.title,
          poster_path: m.poster_path,
          release_year: m.release_year,
          ratings: ratingsForMovie,
          diff,
        });
      }
    }
  });

  sharedFavorites.sort((a, b) => b.avgRating - a.avgRating);
  biggestDisagreements.sort((a, b) => b.diff - a.diff);

  // 6. Overall Match Percentage calculation
  const totalUnique = allKnownMovies.size;
  let matchPercentage = 78; // baseline friendly default

  if (totalUnique > 0 && blend.members.length > 1) {
    const overlapRatio = Math.min(1, (sharedCount * 2) / Math.max(totalUnique, 6));
    const genreScore = commonGenres.slice(0, 3).reduce((acc, g) => acc + g.synergy, 0) / 300;
    const calculated = Math.round(65 + overlapRatio * 22 + genreScore * 13);
    matchPercentage = Math.max(68, Math.min(98, calculated));
  } else if (blend.members.length <= 1) {
    matchPercentage = 100;
  }

  return {
    matchPercentage,
    sharedMoviesCount: sharedCount,
    totalUniqueMovies: totalUnique,
    memberCounts,
    commonGenres: commonGenres.slice(0, 6),
    commonDirectors,
    commonActors,
    sharedFavorites: sharedFavorites.slice(0, 4),
    biggestDisagreements: biggestDisagreements.slice(0, 4),
  };
}

// -------------------------------------------------------------
// "Pick Something to Watch" Intelligent Recommender
// -------------------------------------------------------------

export interface PickOptions {
  excludeIds?: string[];
  genreFilter?: string | null;
  maxRuntimeMinutes?: number | null;
}

export function pickTonightMovie(
  blend: Blend,
  currentUserWatchlist: WatchlistMovie[] = [],
  options: PickOptions = {}
): {
  selectedMovie: BlendMovie | null;
  score: number;
  reason: string;
  alternatives: BlendMovie[];
} {
  const { excludeIds = [], genreFilter, maxRuntimeMinutes } = options;

  let candidates = blend.movies.filter((m) => !excludeIds.includes(m.id));

  // If all movies were excluded, reset and use all
  if (candidates.length === 0) {
    candidates = [...blend.movies];
  }

  if (candidates.length === 0) {
    return {
      selectedMovie: null,
      score: 0,
      reason: "No movies in this Blend yet. Add some titles to pick!",
      alternatives: [],
    };
  }

  // Filter unwatched preferred unless all watched
  const unwatchedCandidates = candidates.filter((m) => !m.watchedTogether);
  const pool = unwatchedCandidates.length > 0 ? unwatchedCandidates : candidates;

  const stats = calculateBlendStats(blend, currentUserWatchlist);
  const topGenreNames = stats.commonGenres.slice(0, 3).map((g) => g.genre.toLowerCase());

  // Score each candidate
  const scored = pool.map((movie) => {
    let score = 50;
    const reasons: string[] = [];

    // 1. Wanted by multiple members (+35 pts)
    const wantedCount = movie.wantedByMemberIds.length;
    if (wantedCount >= blend.members.length && blend.members.length > 1) {
      score += 40;
      reasons.push("Everyone wants to watch");
    } else if (wantedCount > 1) {
      score += 25;
      reasons.push(`${wantedCount} members want to watch`);
    }

    // 2. Unwatched together (+20 pts)
    if (!movie.watchedTogether) {
      score += 20;
      reasons.push("Unwatched by the group");
    }

    // 3. TMDB or vote average rating
    const vote = movie.vote_average || 7.5;
    if (vote >= 8.2) {
      score += 18;
      reasons.push(`Acclaimed score (${vote.toFixed(1)}★)`);
    } else if (vote >= 7.5) {
      score += 10;
    }

    // 4. Matches group common genres (+15 pts)
    const hasSharedGenre = (movie.genres || []).some((g) =>
      topGenreNames.includes(g.toLowerCase())
    );
    if (hasSharedGenre) {
      score += 15;
      reasons.push("Matches your top shared genres");
    }

    // 5. Genre filter bonus if applied
    if (genreFilter && movie.genres.includes(genreFilter)) {
      score += 30;
    }

    // 6. Runtime suitability
    if (movie.runtime) {
      const matchHours = movie.runtime.match(/(\d+)h/);
      const matchMins = movie.runtime.match(/(\d+)m/);
      const totalMins =
        (matchHours ? parseInt(matchHours[1], 10) * 60 : 0) +
        (matchMins ? parseInt(matchMins[1], 10) : 0);

      if (maxRuntimeMinutes && totalMins > 0) {
        if (totalMins <= maxRuntimeMinutes) {
          score += 15;
        } else {
          score -= 25;
        }
      } else if (totalMins >= 85 && totalMins <= 145) {
        score += 8;
        reasons.push("Perfect movie-night runtime");
      }
    }

    // Slight randomness (0-8 pts) to give variety when picking again
    score += Math.floor(Math.random() * 8);

    return {
      movie,
      score,
      reason: reasons.slice(0, 2).join(" • ") || "Great group candidate",
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const topPick = scored[0];
  const alternatives = scored.slice(1).map((s) => s.movie);

  return {
    selectedMovie: topPick ? topPick.movie : null,
    score: topPick ? topPick.score : 0,
    reason: topPick ? topPick.reason : "Top recommendation",
    alternatives,
  };
}
