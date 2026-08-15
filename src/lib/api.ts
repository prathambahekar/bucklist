import type { SearchResult } from "../types";

export const POPULAR_OTT_RULES: Array<{ match: string; name: string }> = [
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

export const getTmdbApiKey = (): string => {
  return (
    import.meta.env.VITE_TMDB_API_KEY ||
    "9869c47c4b6c6a4990c1c71057aaaf5a"
  );
};

export async function searchMovies(query: string): Promise<SearchResult[]> {
  const tmdbKey = getTmdbApiKey();

  const searchRes = await fetch(
    `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(
      query
    )}&include_adult=false&language=en-US&page=1`
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
    .slice(0, 8);

  const [movieGenresRes, tvGenresRes] = await Promise.all([
    fetch(
      `https://api.themoviedb.org/3/genre/movie/list?api_key=${tmdbKey}&language=en-US`
    ).catch(() => null),
    fetch(
      `https://api.themoviedb.org/3/genre/tv/list?api_key=${tmdbKey}&language=en-US`
    ).catch(() => null),
  ]);

  const genreMap = new Map<number, string>();
  if (movieGenresRes && movieGenresRes.ok) {
    const gData = await movieGenresRes.json();
    for (const g of gData.genres || []) genreMap.set(g.id, g.name);
  }
  if (tvGenresRes && tvGenresRes.ok) {
    const gData = await tvGenresRes.json();
    for (const g of gData.genres || []) genreMap.set(g.id, g.name);
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
          }
        } catch {
          // Optional provider fetch
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
export const BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";
export const STILL_BASE = "https://image.tmdb.org/t/p/w300";

export function getPosterUrl(posterPath: string | null): string | null {
  if (!posterPath) return null;
  return `${POSTER_BASE}${posterPath}`;
}

export function getBackdropUrl(backdropPath: string | null): string | null {
  if (!backdropPath) return null;
  return `${BACKDROP_BASE}${backdropPath}`;
}

export function getStillUrl(stillPath: string | null): string | null {
  if (!stillPath) return null;
  return `${STILL_BASE}${stillPath}`;
}

export async function fetchTvSeriesDetails(tmdbId: number) {
  const tmdbKey = getTmdbApiKey();
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${tmdbKey}&language=en-US`
    );
    if (!res.ok) throw new Error(`TV details HTTP ${res.status}`);
    return await res.json();
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
      fetch(
        `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbKey}&language=en-US`
      ).catch(() => null),
      fetch(
        `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${tmdbKey}&language=en-US`
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
  const tmdbKey = getTmdbApiKey();
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${tmdbKey}&language=en-US`
    );
    if (!res.ok) {
      // If 404 or other status, try without language
      const fallbackRes = await fetch(
        `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${tmdbKey}`
      );
      if (!fallbackRes.ok) {
        throw new Error(`TMDB season ${seasonNumber} HTTP ${res.status}`);
      }
      return await fallbackRes.json();
    }
    return await res.json();
  } catch (err) {
    console.warn(`[TMDB] fetchTvSeasonEpisodes failed for tv/${tmdbId}/season/${seasonNumber}:`, err);
    return { episodes: [] };
  }
}
