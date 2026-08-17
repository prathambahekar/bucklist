import type { SearchResult } from "../types";

export const POPULAR_OTT_RULES: Array<{ match: string; name: string }> = [
  { match: "netflix", name: "Netflix" },
  { match: "prime video", name: "Prime Video" },
  { match: "amazon prime", name: "Prime Video" },
  { match: "amazon", name: "Prime Video" },
  { match: "jiohotstar", name: "JioHotstar" },
  { match: "disney+ hotstar", name: "JioHotstar" },
  { match: "disney plus hotstar", name: "JioHotstar" },
  { match: "hotstar", name: "JioHotstar" },
  { match: "jiocinema", name: "JioHotstar" },
  { match: "jio cinema", name: "JioHotstar" },
  { match: "jio", name: "JioHotstar" },
  { match: "disney+", name: "JioHotstar" },
  { match: "disney plus", name: "JioHotstar" },
  { match: "disney", name: "JioHotstar" },
  { match: "hbo max", name: "JioHotstar" },
  { match: "hbo", name: "JioHotstar" },
  { match: "max", name: "JioHotstar" },
  { match: "hulu", name: "JioHotstar" },
  { match: "apple tv", name: "Apple TV+" },
  { match: "apple", name: "Apple TV+" },
  { match: "zee5", name: "ZEE5" },
  { match: "zee", name: "ZEE5" },
  { match: "sonyliv", name: "SonyLIV" },
  { match: "sony liv", name: "SonyLIV" },
  { match: "sony", name: "SonyLIV" },
  { match: "paramount", name: "Paramount+" },
  { match: "peacock", name: "Peacock" },
  { match: "crunchyroll", name: "Crunchyroll" },
  { match: "mubi", name: "MUBI" },
];

export function normalizePlatformName(p: string): string | null {
  const lower = (p || "").toLowerCase().trim();
  // Remove Lionsgate
  if (lower.includes("lionsgate") || lower.includes("lions gate")) {
    return null;
  }
  // Hulu, HBO Max / Max, Disney+, Hotstar, JioCinema -> JioHotstar
  if (
    lower.includes("disney") ||
    lower.includes("hotstar") ||
    lower.includes("jio") ||
    lower.includes("hbo") ||
    lower.includes("max") ||
    lower.includes("hulu")
  ) {
    return "JioHotstar";
  }
  if (lower.includes("prime") || lower.includes("amazon")) return "Prime Video";
  if (lower.includes("apple")) return "Apple TV+";
  if (lower.includes("sony") || lower.includes("liv")) return "SonyLIV";
  if (lower.includes("zee")) return "ZEE5";
  if (lower.includes("netflix")) return "Netflix";
  if (lower.includes("paramount")) return "Paramount+";
  if (lower.includes("peacock")) return "Peacock";
  if (lower.includes("crunchyroll")) return "Crunchyroll";
  if (lower.includes("mubi")) return "MUBI";
  return p;
}

export function normalizePlatformsList(platforms: string[] = []): string[] {
  const result = new Set<string>();
  for (const raw of platforms) {
    const norm = normalizePlatformName(raw);
    if (norm) result.add(norm);
  }
  return Array.from(result);
}

export function filterPopularPlatforms(rawPlatforms: string[]): string[] {
  const result = new Set<string>();
  for (const raw of rawPlatforms) {
    const lower = raw.toLowerCase().trim();
    for (const rule of POPULAR_OTT_RULES) {
      if (lower.includes(rule.match)) {
        result.add(rule.name);
        break;
      }
    }
  }
  return Array.from(result);
}

export const getTmdbApiKey = (): string => {
  return (
    import.meta.env.VITE_TMDB_API_KEY ||
    "9869c47c4b6c6a4990c1c71057aaaf5a"
  );
};

// ==========================================
// LIGHTWEIGHT IN-MEMORY LRU CACHE
// ==========================================
class SimpleLRU<K, V> {
  private max: number;
  private cache = new Map<K, { value: V; expiry: number }>();
  private ttlMs: number;

  constructor(max = 120, ttlMinutes = 15) {
    this.max = max;
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    // Refresh position for LRU
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
      // Evict oldest item
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, { value, expiry: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Caches for TMDB API endpoints to avoid rate limiting
const providersCache = new SimpleLRU<string, string[]>(150, 30);
const searchCache = new SimpleLRU<string, SearchResult[]>(80, 10);
const categoryCache = new SimpleLRU<string, SearchResult[]>(30, 15);
const tvDetailsCache = new SimpleLRU<number, any>(100, 20);
const seasonEpisodesCache = new SimpleLRU<string, any>(150, 20);
let cachedGenreMap: Map<number, string> | null = null;

// Safe fetch with retry on 429 or transient error
async function fetchWithRetry(url: string, retries = 2, delayMs = 300): Promise<Response> {
  try {
    const res = await fetch(url);
    if (res.status === 429 && retries > 0) {
      // TMDB rate limit - wait and retry
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return fetchWithRetry(url, retries - 1, delayMs * 2);
    }
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return fetchWithRetry(url, retries - 1, delayMs * 2);
    }
    throw err;
  }
}

async function getGenresMap(): Promise<Map<number, string>> {
  if (cachedGenreMap && cachedGenreMap.size > 0) {
    return cachedGenreMap;
  }

  const tmdbKey = getTmdbApiKey();
  const genreMap = new Map<number, string>();

  try {
    const [movieGenresRes, tvGenresRes] = await Promise.all([
      fetchWithRetry(
        `https://api.themoviedb.org/3/genre/movie/list?api_key=${tmdbKey}&language=en-US`,
        1
      ).catch(() => null),
      fetchWithRetry(
        `https://api.themoviedb.org/3/genre/tv/list?api_key=${tmdbKey}&language=en-US`,
        1
      ).catch(() => null),
    ]);

    if (movieGenresRes && movieGenresRes.ok) {
      const gData = await movieGenresRes.json();
      for (const g of gData.genres || []) genreMap.set(g.id, g.name);
    }
    if (tvGenresRes && tvGenresRes.ok) {
      const gData = await tvGenresRes.json();
      for (const g of gData.genres || []) genreMap.set(g.id, g.name);
    }
    cachedGenreMap = genreMap;
  } catch {
    // ignore
  }

  return genreMap;
}

export async function searchMovies(query: string): Promise<SearchResult[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  // Check LRU Cache
  const cached = searchCache.get(cleanQuery);
  if (cached) {
    return cached;
  }

  const tmdbKey = getTmdbApiKey();

  const searchRes = await fetchWithRetry(
    `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(
      query
    )}&include_adult=false&language=en-US&page=1`,
    2
  );

  if (!searchRes.ok) {
    throw new Error(`TMDB search failed (${searchRes.status})`);
  }

  const data = await searchRes.json();
  const rawResults = (data.results || [])
    .filter(
      (item: { media_type?: string }) =>
        item.media_type === "movie" || item.media_type === "tv"
    )
    .slice(0, 12);

  const genreMap = await getGenresMap();

  const results = await Promise.all(
    rawResults.map(
      async (m: {
        id: number;
        media_type: "movie" | "tv";
        title?: string;
        name?: string;
        poster_path: string | null;
        release_date?: string | null;
        first_air_date?: string | null;
        overview: string | null;
        genre_ids?: number[];
      }) => {
        const isTv = m.media_type === "tv";
        const releaseDate = isTv ? m.first_air_date : m.release_date;
        const endpoint = isTv ? "tv" : "movie";
        const providerCacheKey = `${endpoint}_${m.id}`;

        let rawPlatforms: string[] = providersCache.get(providerCacheKey) || [];
        if (rawPlatforms.length === 0) {
          try {
            const provRes = await fetchWithRetry(
              `https://api.themoviedb.org/3/${endpoint}/${m.id}/watch/providers?api_key=${tmdbKey}`,
              1
            );
            if (provRes && provRes.ok) {
              const provData = await provRes.json();
              const regions = provData.results || {};
              const platformSet = new Set<string>();

              for (const regionCode of ["IN", "US", "GB", "CA"]) {
                const region = regions[regionCode];
                if (region?.flatrate) {
                  for (const p of region.flatrate as { provider_name: string }[]) {
                    platformSet.add(p.provider_name);
                  }
                }
              }

              if (platformSet.size === 0) {
                const firstRegion = Object.values(regions)[0] as
                  | { flatrate?: { provider_name: string }[] }
                  | undefined;
                if (firstRegion?.flatrate) {
                  for (const p of firstRegion.flatrate) {
                    platformSet.add(p.provider_name);
                  }
                }
              }

              rawPlatforms = Array.from(platformSet);
              providersCache.set(providerCacheKey, rawPlatforms);
            }
          } catch {
            // Optional provider fetch fallback
          }
        }

        return {
          tmdb_id: m.id,
          title: (isTv ? m.name : m.title) || "Untitled",
          poster_path: m.poster_path,
          release_year: releaseDate ? releaseDate.substring(0, 4) : null,
          media_type: isTv ? "tv" : "movie",
          overview: m.overview || null,
          genres: (m.genre_ids || [])
            .map((id) => genreMap.get(id))
            .filter((g): g is string => Boolean(g)),
          platforms: filterPopularPlatforms(rawPlatforms),
        };
      }
    )
  );

  searchCache.set(cleanQuery, results);
  return results;
}

export async function fetchCategorySuggestions(
  category: "all" | "movie" | "tv" | "anime" = "all"
): Promise<SearchResult[]> {
  const cached = categoryCache.get(category);
  if (cached && cached.length > 0) {
    return cached;
  }

  const tmdbKey = getTmdbApiKey();
  let url = "";

  if (category === "anime") {
    // TMDB discover with Japanese animation genre 16
    url = `https://api.themoviedb.org/3/discover/tv?api_key=${tmdbKey}&language=en-US&sort_by=popularity.desc&with_genres=16&with_original_language=ja&page=1`;
  } else if (category === "movie") {
    url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${tmdbKey}&language=en-US&page=1`;
  } else if (category === "tv") {
    url = `https://api.themoviedb.org/3/trending/tv/week?api_key=${tmdbKey}&language=en-US&page=1`;
  } else {
    url = `https://api.themoviedb.org/3/trending/all/week?api_key=${tmdbKey}&language=en-US&page=1`;
  }

  const searchRes = await fetchWithRetry(url, 2);

  if (!searchRes.ok) {
    throw new Error(`TMDB suggestions failed (${searchRes.status})`);
  }

  const data = await searchRes.json();
  const rawResults = (data.results || [])
    .filter(
      (item: { media_type?: string }) =>
        category === "anime" ||
        category === "tv" ||
        category === "movie" ||
        item.media_type === "movie" ||
        item.media_type === "tv"
    )
    .slice(0, 16);

  const genreMap = await getGenresMap();

  const results = await Promise.all(
    rawResults.map(
      async (m: {
        id: number;
        media_type?: "movie" | "tv";
        title?: string;
        name?: string;
        poster_path: string | null;
        release_date?: string | null;
        first_air_date?: string | null;
        overview: string | null;
        genre_ids?: number[];
      }) => {
        const itemType =
          m.media_type || (category === "anime" || category === "tv" ? "tv" : "movie");
        const isTv = itemType === "tv";
        const releaseDate = isTv ? m.first_air_date : m.release_date;
        const provEndpoint = isTv ? "tv" : "movie";
        const providerCacheKey = `${provEndpoint}_${m.id}`;

        let rawPlatforms: string[] = providersCache.get(providerCacheKey) || [];
        if (rawPlatforms.length === 0) {
          try {
            const provRes = await fetchWithRetry(
              `https://api.themoviedb.org/3/${provEndpoint}/${m.id}/watch/providers?api_key=${tmdbKey}`,
              1
            );
            if (provRes && provRes.ok) {
              const provData = await provRes.json();
              const regions = provData.results || {};
              const platformSet = new Set<string>();

              for (const regionCode of ["IN", "US", "GB", "CA"]) {
                const region = regions[regionCode];
                if (region?.flatrate) {
                  for (const p of region.flatrate as { provider_name: string }[]) {
                    platformSet.add(p.provider_name);
                  }
                }
              }

              if (platformSet.size === 0) {
                const firstRegion = Object.values(regions)[0] as
                  | { flatrate?: { provider_name: string }[] }
                  | undefined;
                if (firstRegion?.flatrate) {
                  for (const p of firstRegion.flatrate) {
                    platformSet.add(p.provider_name);
                  }
                }
              }

              rawPlatforms = Array.from(platformSet);
              providersCache.set(providerCacheKey, rawPlatforms);
            }
          } catch {
            // Optional provider fetch
          }
        }

        // If anime, ensure "Animation" is in genres
        const itemGenres = (m.genre_ids || [])
          .map((id) => genreMap.get(id))
          .filter((g): g is string => Boolean(g));

        if (category === "anime" && !itemGenres.includes("Animation")) {
          itemGenres.unshift("Animation");
        }

        return {
          tmdb_id: m.id,
          title: (isTv ? m.name : m.title) || "Untitled",
          poster_path: m.poster_path,
          release_year: releaseDate ? releaseDate.substring(0, 4) : null,
          media_type: isTv ? "tv" : "movie",
          overview: m.overview || null,
          genres: itemGenres,
          platforms: filterPopularPlatforms(rawPlatforms),
        };
      }
    )
  );

  categoryCache.set(category, results);
  return results;
}

export async function fetchTrendingTitles(
  mediaType: "all" | "movie" | "tv" = "all"
): Promise<SearchResult[]> {
  return fetchCategorySuggestions(mediaType);
}

export const POSTER_BASE = "https://image.tmdb.org/t/p/w342";
export const BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";
export const STILL_BASE = "https://image.tmdb.org/t/p/w300";

export function getPosterUrl(posterPath?: string | null): string | null {
  if (!posterPath) return null;
  if (posterPath.startsWith("http://") || posterPath.startsWith("https://")) {
    return posterPath;
  }
  return `${POSTER_BASE}${posterPath}`;
}

export function getBackdropUrl(backdropPath?: string | null): string | null {
  if (!backdropPath) return null;
  if (backdropPath.startsWith("http://") || backdropPath.startsWith("https://")) {
    return backdropPath;
  }
  return `${BACKDROP_BASE}${backdropPath}`;
}

export function getStillUrl(stillPath?: string | null): string | null {
  if (!stillPath) return null;
  if (stillPath.startsWith("http://") || stillPath.startsWith("https://")) {
    return stillPath;
  }
  return `${STILL_BASE}${stillPath}`;
}

export async function fetchTvSeriesDetails(tmdbId: number) {
  const cached = tvDetailsCache.get(tmdbId);
  if (cached) {
    return cached;
  }

  const tmdbKey = getTmdbApiKey();
  try {
    const res = await fetchWithRetry(
      `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${tmdbKey}&language=en-US`,
      2
    );
    if (!res.ok) throw new Error(`TV details HTTP ${res.status}`);
    const data = await res.json();
    tvDetailsCache.set(tmdbId, data);
    return data;
  } catch (err) {
    console.warn(`[TMDB] fetchTvSeriesDetails failed for ${tmdbId}:`, err);
    throw err;
  }
}

export async function detectMediaType(
  tmdbId: number,
  title?: string,
  releaseYear?: string | null
): Promise<"tv" | "movie"> {
  const tmdbKey = getTmdbApiKey();
  try {
    // Check both movie and tv endpoints concurrently to accurately determine the media type
    const [movieRes, tvRes] = await Promise.all([
      fetchWithRetry(
        `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbKey}&language=en-US`,
        1
      ).catch(() => null),
      fetchWithRetry(
        `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${tmdbKey}&language=en-US`,
        1
      ).catch(() => null),
    ]);

    const isMovieValid = movieRes && movieRes.ok;
    const isTvValid = tvRes && tvRes.ok;

    if (isMovieValid && !isTvValid) {
      return "movie";
    }
    if (isTvValid && !isMovieValid) {
      return "tv";
    }

    if (isMovieValid && isTvValid) {
      // Both exist with this ID (TMDB IDs overlap between movies and tv series!)
      const movieData = await movieRes.json();
      const tvData = await tvRes.json();

      // If a title was provided, match against titles
      if (title) {
        const titleLower = title.toLowerCase().trim();
        const movieTitleLower = (movieData.title || "").toLowerCase().trim();
        const tvNameLower = (tvData.name || "").toLowerCase().trim();

        if (movieTitleLower === titleLower && tvNameLower !== titleLower) {
          return "movie";
        }
        if (tvNameLower === titleLower && movieTitleLower !== titleLower) {
          return "tv";
        }
      }

      // Match against release year if available
      if (releaseYear) {
        const movieYear = (movieData.release_date || "").substring(0, 4);
        const tvYear = (tvData.first_air_date || "").substring(0, 4);
        if (movieYear === releaseYear && tvYear !== releaseYear) {
          return "movie";
        }
        if (tvYear === releaseYear && movieYear !== releaseYear) {
          return "tv";
        }
      }

      // Default to movie if vote count is significantly higher on movie
      const movieVotes = movieData.vote_count || 0;
      const tvVotes = tvData.vote_count || 0;
      if (movieVotes > tvVotes * 2) {
        return "movie";
      }
      if (tvVotes > movieVotes * 2) {
        return "tv";
      }

      // Check if tvData actually has regular seasons and episodes
      if (tvData.number_of_episodes && tvData.number_of_episodes > 0 && !movieData.runtime) {
        return "tv";
      }
      return "movie";
    }
  } catch {
    // fallback
  }
  return "movie";
}

export async function fetchTvSeasonEpisodes(tmdbId: number, seasonNumber: number) {
  const cacheKey = `${tmdbId}_${seasonNumber}`;
  const cached = seasonEpisodesCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const tmdbKey = getTmdbApiKey();
  try {
    const res = await fetchWithRetry(
      `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${tmdbKey}&language=en-US`,
      2
    );
    if (!res.ok) {
      // If 404 or other status, try without language
      const fallbackRes = await fetchWithRetry(
        `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${tmdbKey}`,
        1
      );
      if (!fallbackRes.ok) {
        throw new Error(`TMDB season ${seasonNumber} HTTP ${res.status}`);
      }
      const fallbackData = await fallbackRes.json();
      seasonEpisodesCache.set(cacheKey, fallbackData);
      return fallbackData;
    }
    const data = await res.json();
    seasonEpisodesCache.set(cacheKey, data);
    return data;
  } catch (err) {
    console.warn(`[TMDB] fetchTvSeasonEpisodes failed for tv/${tmdbId}/season/${seasonNumber}:`, err);
    return { episodes: [] };
  }
}
