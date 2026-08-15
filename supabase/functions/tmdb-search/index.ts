import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TMDB_BASE = "https://api.themoviedb.org/3";

interface TMDBItem {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  overview: string | null;
  genre_ids?: number[];
}

interface EnrichedResult {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_year: string | null;
  media_type: "movie" | "tv";
  overview: string | null;
  genres: string[];
  platforms: string[];
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

function filterPopularOTTs(rawPlatforms: string[]): string[] {
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("TMDB_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "TMDB API key not configured. Add TMDB_API_KEY as an edge function secret." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const query = url.searchParams.get("query")?.trim();

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search movies & TV series
    const searchRes = await fetch(
      `${TMDB_BASE}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`
    );
    if (!searchRes.ok) {
      throw new Error(`TMDB search failed: ${searchRes.status}`);
    }
    const searchData = await searchRes.json();
    const items: TMDBItem[] = (searchData.results || [])
      .filter((item: { media_type?: string }) => item.media_type === "movie" || item.media_type === "tv")
      .slice(0, 8);

    if (items.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch genre lists for both Movies and TV Series
    const [movieGenreRes, tvGenreRes] = await Promise.all([
      fetch(`${TMDB_BASE}/genre/movie/list?api_key=${apiKey}&language=en-US`),
      fetch(`${TMDB_BASE}/genre/tv/list?api_key=${apiKey}&language=en-US`),
    ]);

    const genreMap = new Map<number, string>();
    if (movieGenreRes.ok) {
      const gData = await movieGenreRes.json();
      for (const g of gData.genres || []) genreMap.set(g.id, g.name);
    }
    if (tvGenreRes.ok) {
      const gData = await tvGenreRes.json();
      for (const g of gData.genres || []) genreMap.set(g.id, g.name);
    }

    // Enrich each item with streaming providers (fetched in parallel)
    const enriched: EnrichedResult[] = await Promise.all(
      items.map(async (item: TMDBItem): Promise<EnrichedResult> => {
        const isTv = item.media_type === "tv";
        const title = (isTv ? item.name : item.title) || "Untitled";
        const releaseDate = isTv ? item.first_air_date : item.release_date;
        const genres = (item.genre_ids || [])
          .map((id: number) => genreMap.get(id))
          .filter((g): g is string => Boolean(g));

        let rawPlatforms: string[] = [];
        try {
          const endpoint = isTv ? "tv" : "movie";
          const provRes = await fetch(`${TMDB_BASE}/${endpoint}/${item.id}/watch/providers?api_key=${apiKey}`);
          if (provRes.ok) {
            const provData = await provRes.json();
            const regions = provData.results || {};
            const platformSet = new Set<string>();

            for (const regionCode of ["US", "IN", "GB", "CA"]) {
              const region = regions[regionCode];
              if (region?.flatrate) {
                for (const p of region.flatrate) {
                  platformSet.add(p.provider_name);
                }
              }
            }

            if (platformSet.size === 0) {
              const firstRegion = Object.values(regions)[0] as { flatrate?: { provider_name: string }[] } | undefined;
              if (firstRegion?.flatrate) {
                for (const p of firstRegion.flatrate) {
                  platformSet.add(p.provider_name);
                }
              }
            }

            rawPlatforms = Array.from(platformSet);
          }
        } catch {
          // Providers optional
        }

        const popularOTTs = filterPopularOTTs(rawPlatforms);

        return {
          tmdb_id: item.id,
          title,
          poster_path: item.poster_path,
          release_year: releaseDate ? releaseDate.substring(0, 4) : null,
          media_type: isTv ? "tv" : "movie",
          overview: item.overview || null,
          genres,
          platforms: popularOTTs,
        };
      })
    );

    return new Response(JSON.stringify({ results: enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
