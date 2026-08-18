export type PriorityLevel = "must_watch" | "very_interested" | "wanna_see" | "maybe_later";

export interface PriorityConfig {
  id: PriorityLevel;
  label: string;
  shortLabel: string;
  rank: number; // 4 = must_watch, 3 = very_interested, 2 = wanna_see, 1 = maybe_later
  description: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotBg: string;
  hoverBg: string;
  activeBg: string;
}

export const PRIORITY_CONFIGS: Record<PriorityLevel, PriorityConfig> = {
  must_watch: {
    id: "must_watch",
    label: "Must Watch",
    shortLabel: "Must Watch",
    rank: 4,
    description: "Highest priority • Watch next",
    badgeBg: "bg-rose-500/10",
    badgeBorder: "border-rose-500/30",
    badgeText: "text-rose-300",
    dotBg: "bg-rose-500",
    hoverBg: "hover:bg-rose-500/15",
    activeBg: "bg-rose-500/20 text-rose-200 border-rose-500/40",
  },
  very_interested: {
    id: "very_interested",
    label: "Very Interested",
    shortLabel: "Very Interested",
    rank: 3,
    description: "Strong interest • High priority",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/30",
    badgeText: "text-amber-300",
    dotBg: "bg-amber-400",
    hoverBg: "hover:bg-amber-500/15",
    activeBg: "bg-amber-500/20 text-amber-200 border-amber-500/40",
  },
  wanna_see: {
    id: "wanna_see",
    label: "Wanna See",
    shortLabel: "Wanna See",
    rank: 2,
    description: "Standard watchlist item",
    badgeBg: "bg-zinc-800/50",
    badgeBorder: "border-zinc-700/50",
    badgeText: "text-zinc-300",
    dotBg: "bg-zinc-400",
    hoverBg: "hover:bg-zinc-800/80",
    activeBg: "bg-zinc-800 text-zinc-100 border-zinc-600/50",
  },
  maybe_later: {
    id: "maybe_later",
    label: "Maybe Later",
    shortLabel: "Maybe Later",
    rank: 1,
    description: "Low priority • If in the mood",
    badgeBg: "bg-sky-500/10",
    badgeBorder: "border-sky-500/30",
    badgeText: "text-sky-300",
    dotBg: "bg-sky-400",
    hoverBg: "hover:bg-sky-500/15",
    activeBg: "bg-sky-500/20 text-sky-200 border-sky-500/40",
  },
};

export const PRIORITY_ORDER: PriorityLevel[] = [
  "must_watch",
  "very_interested",
  "wanna_see",
  "maybe_later",
];

export function normalizePriority(raw?: any): PriorityLevel {
  if (raw === "must_watch") return "must_watch";
  if (raw === "very_interested" || raw === "high") return "very_interested";
  if (raw === "wanna_see" || raw === "normal") return "wanna_see";
  if (raw === "maybe_later" || raw === "maybe") return "maybe_later";
  return "wanna_see";
}

export type AppMode = "cinema" | "games";

export function getPriorityConfig(
  priority?: PriorityLevel | string | null,
  mode: AppMode = "cinema"
): PriorityConfig {
  const norm = normalizePriority(priority);
  const base = PRIORITY_CONFIGS[norm] || PRIORITY_CONFIGS.wanna_see;
  if (mode === "games") {
    if (norm === "must_watch") {
      return {
        ...base,
        label: "Must Play",
        shortLabel: "Must Play",
        description: "Highest priority • Play next",
      };
    }
    if (norm === "wanna_see") {
      return {
        ...base,
        label: "Wanna Play",
        shortLabel: "Wanna Play",
        description: "Standard backlog item",
      };
    }
  }
  return base;
}

export interface WatchlistMovie {
  id: string;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_year: string | null;
  media_type?: "movie" | "tv" | "game";
  genres: string[];
  platforms: string[];
  priority?: PriorityLevel;
  watched: boolean;
  watched_date: string | null;
  watched_source?: "ott" | "theatre" | "other" | string;
  watched_platform?: string | null;
  rating: number | null;
  created_at: string;
  metacritic?: number | null;
  playtime?: number | null;
}

export interface SearchResult {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_year: string | null;
  media_type?: "movie" | "tv" | "game";
  overview: string | null;
  genres: string[];
  platforms: string[];
  metacritic?: number | null;
  rating?: number | null;
}

export interface MovieDetailExtra {
  overview?: string | null;
  tagline?: string;
  voteAverage?: number;
  voteCount?: number;
  runtime?: string;
  cast?: string[];
  director?: string;
  trailerKey?: string;
  backdropPath?: string;
}

export interface TvEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string | null;
  air_date: string | null;
  runtime: number | null;
  still_path: string | null;
  vote_average: number;
}

export interface TvSeason {
  id: number;
  season_number: number;
  name: string;
  overview: string | null;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
  episodes?: TvEpisode[];
}

export interface TvSeriesDetails {
  id: number;
  name: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  number_of_seasons: number;
  number_of_episodes: number;
  seasons: TvSeason[];
}

export type TabType = "towatch" | "watched" | "blend" | "settings";
export type SortByType = "newest" | "rating" | "release";
export type ViewMode = "detailed" | "compact" | "grid" | "cards" | "timeline" | "collections";
export type WatchedViewMode = "detailed" | "compact" | "grid" | "cards" | "timeline" | "collections";
export type ToWatchViewMode = "detailed" | "compact" | "grid" | "cards";
export type TimelinePeriod = "month" | "week" | "year";
export type WatchedCategory = "all" | "movies" | "series" | "anime";

export interface MovieCollection {
  id: string;
  name: string;
  description?: string;
  movie_ids: string[]; // references WatchlistMovie.id
  created_at: string;
  updated_at: string;
  is_custom?: boolean;
  cover_poster?: string | null;
}

// -------------------------------------------------------------
// Blend (Collaboration) Types
// -------------------------------------------------------------

export interface BlendMemberMoviePref {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_year: string | null;
  genres: string[];
  director?: string;
  cast?: string[];
  watched: boolean;
  rating?: number | null;
}

export interface BlendMember {
  id: string;
  name: string;
  avatar?: string;
  color?: string; // e.g. "amber", "emerald", "sky", "violet", "rose"
  isOwner?: boolean;
  joinedAt: string;
  personalMovies?: BlendMemberMoviePref[];
}

export interface BlendMovieRating {
  memberId: string;
  memberName: string;
  rating: number; // 1-10 scale (or 0.5-5 mapped to 1-10)
  ratedAt: string;
}

export interface BlendMovie {
  id: string; // unique entry id in blend
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  release_year: string | null;
  media_type?: "movie" | "tv" | "game";
  genres: string[];
  platforms: string[];
  runtime?: string;
  director?: string;
  cast?: string[];
  vote_average?: number;
  
  addedByMemberId: string;
  addedByMemberName: string;
  addedAt: string;
  
  wantedByMemberIds: string[]; // array of member IDs who marked want to watch
  
  watchedTogether: boolean;
  watchedDate: string | null;
  ratings: Record<string, BlendMovieRating>; // memberId -> rating
  notes?: string;
}

export interface Blend {
  id: string;
  name: string;
  emoji: string;
  inviteCode: string;
  ownerId: string;
  members: BlendMember[];
  movies: BlendMovie[];
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export interface BlendTasteStats {
  matchPercentage: number;
  sharedMoviesCount: number;
  totalUniqueMovies: number;
  memberCounts: Record<string, { total: number; name: string }>;
  commonGenres: { genre: string; count: number; synergy: number }[];
  commonDirectors: { name: string; count: number; movies: string[] }[];
  commonActors: { name: string; count: number; movies: string[] }[];
  sharedFavorites: {
    title: string;
    poster_path: string | null;
    release_year: string | null;
    ratings: { memberName: string; rating: number }[];
    avgRating: number;
  }[];
  biggestDisagreements: {
    title: string;
    poster_path: string | null;
    release_year: string | null;
    ratings: { memberName: string; rating: number }[];
    diff: number;
  }[];
}

export interface BucklistBackupData {
  version: string;
  appName?: string;
  exportedAt: string;
  watchlist: WatchlistMovie[];
  gameWatchlist?: WatchlistMovie[];
  collections?: MovieCollection[];
  blends?: Blend[];
  tvProgress?: Record<
    number,
    {
      watchedEpisodes: string[];
      totalEpisodes?: number;
      seasonRatings?: Record<number, number>;
      lastUpdated?: string;
    }
  >;
  preferences?: {
    toWatchViewMode?: ToWatchViewMode;
    watchedViewMode?: WatchedViewMode;
    watchedCategory?: "all" | "movies" | "series" | "anime";
    timelinePeriod?: TimelinePeriod;
    appMode?: AppMode;
  };
  stats?: {
    totalItems: number;
    toWatchCount: number;
    watchedCount: number;
    tvTrackedCount: number;
    collectionsCount?: number;
  };
}

export interface ImportValidationResult {
  valid: boolean;
  error?: string;
  data?: BucklistBackupData;
  summary?: {
    totalItems: number;
    toWatchCount: number;
    watchedCount: number;
    tvSeriesCount: number;
    tvProgressItemsCount: number;
  };
}
