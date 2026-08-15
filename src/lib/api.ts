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

export async function searchMovies(query: string): Promise<SearchResult[]> {
  const tmdbApiKey = import.meta.env.VITE_TMDB_API_KEY;

  // Try Supabase Edge Function first
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (baseUrl) {
    const apiKey =
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      "";

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    try {
      const url = `${baseUrl}/functions/v1/tmdb-search?query=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        if (!data.error && data.results) {
          return data.results;
        }
      }
    } catch {
      // Fall back to direct TMDB API call if configured
    }
  }

  // Fallback: Direct TMDB fetch if VITE_TMDB_API_KEY is set in .env
  if (tmdbApiKey) {
    return searchTmdbDirect(query, tmdbApiKey);
  }

  throw new Error("TMDB API key is not configured. Set VITE_TMDB_API_KEY in .env or deploy the Supabase edge function.");
}

const POPULAR_OTT_RULES: Array<{ match: string; name: string }> = [
  { match: "netflix", name: "Netflix" },
  { match: "prime video", name: "Prime Video" },
  { match: "jiohotstar", name: "JioHotstar" },
  { match: "disney+ hotstar", name: "JioHotstar" },
  { match: "hotstar", name: "JioHotstar" },
  { match: "jiocinema", name: "JioHotstar" },
  { match: "jio cinema", name: "JioHotstar" },
  { match: "disney", name: "Disney+" },
  { match: "apple tv", name: "Apple TV+" },
  { match: "hulu", name: "Hulu" },
  { match: "hbo max", name: "Max" },
  { match: "max", name: "Max" },
  { match: "zee5", name: "ZEE5" },
  { match: "sonyliv", name: "SonyLIV" },
  { match: "sony liv", name: "SonyLIV" },
  { match: "paramount", name: "Paramount+" },
  { match: "peacock", name: "Peacock" },
  { match: "crunchyroll", name: "Crunchyroll" },
  { match: "mubi", name: "MUBI" },
  { match: "lionsgate", name: "Lionsgate Play" },
];

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

async function searchTmdbDirect(query: string, tmdbKey: string): Promise<SearchResult[]> {
  const searchRes = await fetch(
    `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`
  );
  if (!searchRes.ok) {
    throw new Error(`TMDB search failed (${searchRes.status})`);
  }
  const data = await searchRes.json();
  const rawResults = (data.results || [])
    .filter((item: { media_type?: string }) => item.media_type === "movie" || item.media_type === "tv")
    .slice(0, 8);

  const [movieGenresRes, tvGenresRes] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${tmdbKey}&language=en-US`),
    fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${tmdbKey}&language=en-US`),
  ]);

  const genreMap = new Map<number, string>();
  if (movieGenresRes.ok) {
    const gData = await movieGenresRes.json();
    for (const g of gData.genres || []) {
      genreMap.set(g.id, g.name);
    }
  }
  if (tvGenresRes.ok) {
    const gData = await tvGenresRes.json();
    for (const g of gData.genres || []) {
      genreMap.set(g.id, g.name);
    }
  }

  return Promise.all(
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

        let rawPlatforms: string[] = [];
        try {
          const provRes = await fetch(
            `https://api.themoviedb.org/3/${endpoint}/${m.id}/watch/providers?api_key=${tmdbKey}`
          );
          if (provRes.ok) {
            const provData = await provRes.json();
            const regions = provData.results || {};
            const platformSet = new Set<string>();

            // Check IN, US, GB, CA regions for subscription/flatrate providers
            for (const regionCode of ["IN", "US", "GB", "CA"]) {
              const region = regions[regionCode];
              if (region?.flatrate) {
                for (const p of region.flatrate as { provider_name: string }[]) {
                  platformSet.add(p.provider_name);
                }
              }
            }

            // Fallback to first available region if no flatrate found in key regions
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
          }
        } catch {
          // Providers are optional
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
}

export const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

export function getPosterUrl(posterPath: string | null): string | null {
  if (!posterPath) return null;
  return `${POSTER_BASE}${posterPath}`;
}
