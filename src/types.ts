export interface WatchlistMovie {
  id: string;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_year: string | null;
  media_type?: "movie" | "tv";
  genres: string[];
  platforms: string[];
  watched: boolean;
  watched_date: string | null;
  rating: number | null;
  created_at: string;
}

export interface SearchResult {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_year: string | null;
  media_type?: "movie" | "tv";
  overview: string | null;
  genres: string[];
  platforms: string[];
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

export type TabType = "towatch" | "watched" | "settings";
export type SortByType = "newest" | "rating" | "release";
export type ViewMode = "detailed" | "compact" | "grid" | "timeline";
export type TimelinePeriod = "month" | "week" | "year";

export interface BucklistBackupData {
  version: string;
  appName?: string;
  exportedAt: string;
  watchlist: WatchlistMovie[];
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
    toWatchViewMode?: "detailed" | "compact" | "grid";
    watchedViewMode?: "detailed" | "compact" | "grid" | "timeline";
    watchedCategory?: "all" | "movies" | "series" | "anime";
    timelinePeriod?: TimelinePeriod;
  };
  stats?: {
    totalItems: number;
    toWatchCount: number;
    watchedCount: number;
    tvTrackedCount: number;
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
