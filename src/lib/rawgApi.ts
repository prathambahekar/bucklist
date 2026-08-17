import type { SearchResult, MovieDetailExtra } from "../types";

// Default public developer key for RAWG API (can be overridden by user in settings or env)
export const DEFAULT_RAWG_API_KEY =
  import.meta.env.VITE_RAWG_API_KEY || "c542e67aec3a4340908f9de9e86038af";

export const STORAGE_KEY_RAWG_API_KEY = "bucklist_rawg_api_key";

export function getRawgApiKey(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY_RAWG_API_KEY);
    if (saved && saved.trim()) return saved.trim();
  }
  return DEFAULT_RAWG_API_KEY;
}

export function setRawgApiKey(key: string): void {
  if (typeof window !== "undefined") {
    if (!key || !key.trim()) {
      localStorage.removeItem(STORAGE_KEY_RAWG_API_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY_RAWG_API_KEY, key.trim());
    }
  }
}

export function resetRawgApiKey(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY_RAWG_API_KEY);
  }
}

// ==========================================
// LIGHTWEIGHT IN-MEMORY CACHE FOR RAWG
// ==========================================
class SimpleLRU<K, V> {
  private max: number;
  private cache = new Map<K, { value: V; expiry: number }>();
  private ttlMs: number;

  constructor(max = 100, ttlMinutes = 20) {
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
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
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

const gameSearchCache = new SimpleLRU<string, SearchResult[]>(60, 15);
const gameCategoryCache = new SimpleLRU<string, SearchResult[]>(30, 20);
const gameDetailCache = new SimpleLRU<number, any>(60, 30);

// Platform clean mapping for RAWG platforms
export function cleanRawgPlatformName(name: string): string {
  const lower = (name || "").toLowerCase().trim();
  if (lower === "pc" || lower.includes("windows")) return "PC";
  if (lower.includes("playstation 5") || lower.includes("ps5")) return "PlayStation 5";
  if (lower.includes("playstation 4") || lower.includes("ps4")) return "PlayStation 4";
  if (lower.includes("playstation") || lower.includes("ps")) return "PlayStation";
  if (lower.includes("xbox series") || lower.includes("series x") || lower.includes("series s")) return "Xbox Series X/S";
  if (lower.includes("xbox one")) return "Xbox One";
  if (lower.includes("xbox")) return "Xbox";
  if (lower.includes("nintendo switch") || lower.includes("switch")) return "Nintendo Switch";
  if (lower.includes("ios") || lower.includes("iphone") || lower.includes("ipad")) return "iOS";
  if (lower.includes("android")) return "Android";
  if (lower.includes("mac") || lower.includes("macos")) return "macOS";
  if (lower.includes("linux") || lower.includes("steamdeck") || lower.includes("steam deck")) return "Steam Deck / Linux";
  return name;
}

export function cleanGamePlatformsList(platformsList: any[] = []): string[] {
  const set = new Set<string>();
  for (const item of platformsList) {
    const rawName = item?.platform?.name || item?.name || item;
    if (typeof rawName === "string" && rawName.trim()) {
      const cleaned = cleanRawgPlatformName(rawName);
      if (cleaned) set.add(cleaned);
    }
  }
  return Array.from(set);
}

// Fallback curated game catalog for instant responsiveness & offline resilience
const CURATED_FALLBACK_GAMES: SearchResult[] = [
  {
    tmdb_id: 3498,
    title: "Grand Theft Auto V",
    poster_path: "https://media.rawg.io/media/games/20a/20aa03a10e7208d8510fa25924214d6b.jpg",
    release_year: "2013",
    media_type: "game",
    overview: "Rockstar Games' acclaimed open world action-adventure game set in the sprawling city of Los Santos and surrounding hills.",
    genres: ["Action", "Adventure"],
    platforms: ["PC", "PlayStation 5", "Xbox Series X/S", "PlayStation 4", "Xbox One"],
    metacritic: 92,
  },
  {
    tmdb_id: 3328,
    title: "The Witcher 3: Wild Hunt",
    poster_path: "https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10f6bcd13.jpg",
    release_year: "2015",
    media_type: "game",
    overview: "Geralt of Rivia, a monster hunter for hire, embarks on an epic journey across a war-torn continent to find the Child of Prophecy.",
    genres: ["RPG", "Action", "Adventure"],
    platforms: ["PC", "PlayStation 5", "Xbox Series X/S", "Nintendo Switch", "PlayStation 4"],
    metacritic: 92,
  },
  {
    tmdb_id: 58175,
    title: "God of War (2018)",
    poster_path: "https://media.rawg.io/media/games/4be/4be6a6ad0364723a962f08d0397acb47.jpg",
    release_year: "2018",
    media_type: "game",
    overview: "His vengeance against the Gods of Olympus behind him, Kratos now lives as a man in the realm of Norse Gods and monsters.",
    genres: ["Action", "Adventure", "RPG"],
    platforms: ["PlayStation 4", "PC", "PlayStation 5"],
    metacritic: 94,
  },
  {
    tmdb_id: 3272,
    title: "Elden Ring",
    poster_path: "https://media.rawg.io/media/games/b29/b29cd0c0b4de0d0c62437702680bc4f0.jpg",
    release_year: "2022",
    media_type: "game",
    overview: "Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.",
    genres: ["RPG", "Action"],
    platforms: ["PC", "PlayStation 5", "Xbox Series X/S", "PlayStation 4", "Xbox One"],
    metacritic: 96,
  },
  {
    tmdb_id: 4200,
    title: "Portal 2",
    poster_path: "https://media.rawg.io/media/games/2ba/2bac4e87f44c5064ff68e59d786bda63.jpg",
    release_year: "2011",
    media_type: "game",
    overview: "The innovative sequel to the award-winning puzzle shooter featuring mind-bending physics portals and witty AI companion GLaDOS.",
    genres: ["Puzzle", "Shooter", "Adventure"],
    platforms: ["PC", "Nintendo Switch", "Xbox One", "macOS", "Linux"],
    metacritic: 95,
  },
  {
    tmdb_id: 28,
    title: "Red Dead Redemption 2",
    poster_path: "https://media.rawg.io/media/games/511/5118aff5091cb36a2b1c08a4badca80f.jpg",
    release_year: "2018",
    media_type: "game",
    overview: "America, 1899. Arthur Morgan and the Van der Linde gang are outlaws on the run, facing the dying days of the Wild West.",
    genres: ["Action", "Adventure"],
    platforms: ["PC", "PlayStation 4", "Xbox One"],
    metacritic: 97,
  },
  {
    tmdb_id: 5286,
    title: "Tomb Raider (2013)",
    poster_path: "https://media.rawg.io/media/games/021/021c4e21a1824d2526f925edd63240bc.jpg",
    release_year: "2013",
    media_type: "game",
    overview: "Explore the intense origin story of Lara Croft and her ascent from a young woman to a hardened survivor on a forgotten island.",
    genres: ["Action", "Adventure"],
    platforms: ["PC", "PlayStation 4", "Xbox One", "macOS"],
    metacritic: 86,
  },
  {
    tmdb_id: 13536,
    title: "Portal",
    poster_path: "https://media.rawg.io/media/games/7fa/7fa0b586204cda7a01b0434467410b7b.jpg",
    release_year: "2007",
    media_type: "game",
    overview: "Set in the mysterious Aperture Science Laboratories, solve physical puzzles using the Experimental Aperture Science Handheld Portal Device.",
    genres: ["Puzzle", "Action"],
    platforms: ["PC", "Nintendo Switch", "Linux", "macOS"],
    metacritic: 90,
  },
  {
    tmdb_id: 4291,
    title: "Counter-Strike: Global Offensive",
    poster_path: "https://media.rawg.io/media/games/736/7361901a47cd25d7914155b7704e803d.jpg",
    release_year: "2012",
    media_type: "game",
    overview: "The legendary team-based action first-person shooter that pioneered competitive tactical multiplayer gaming.",
    genres: ["Shooter", "Action"],
    platforms: ["PC", "macOS", "Linux"],
    metacritic: 83,
  },
  {
    tmdb_id: 12020,
    title: "Left 4 Dead 2",
    poster_path: "https://media.rawg.io/media/games/d58/d588947d4286e7b5e0e12e1bea7d9844.jpg",
    release_year: "2009",
    media_type: "game",
    overview: "Set in the zombie apocalypse, co-op survival horror FPS taking four survivors through the cities, swamps and cemeteries of the Deep South.",
    genres: ["Shooter", "Action"],
    platforms: ["PC", "Xbox 360", "macOS", "Linux"],
    metacritic: 89,
  },
  {
    tmdb_id: 290856,
    title: "Apex Legends",
    poster_path: "https://media.rawg.io/media/games/d16/d160810f60800745b63ac9733470559a.jpg",
    release_year: "2019",
    media_type: "game",
    overview: "Conquer with character in Apex Legends, a free-to-play battle royale hero shooter where legendary contenders battle for glory.",
    genres: ["Shooter", "Action"],
    platforms: ["PC", "PlayStation 5", "Xbox Series X/S", "Nintendo Switch", "PlayStation 4"],
    metacritic: 88,
  },
  {
    tmdb_id: 5679,
    title: "The Elder Scrolls V: Skyrim",
    poster_path: "https://media.rawg.io/media/games/7cf/7cfc9220b3260b08b5e6195b3cac94d0.jpg",
    release_year: "2011",
    media_type: "game",
    overview: "The open-world masterpiece that redefined fantasy RPGs. Play any type of character you can imagine and defeat Alduin the World-Eater.",
    genres: ["RPG", "Action"],
    platforms: ["PC", "PlayStation 5", "Xbox Series X/S", "Nintendo Switch", "PlayStation 4"],
    metacritic: 94,
  },
  {
    tmdb_id: 4570,
    title: "Dead Space (2008)",
    poster_path: "https://media.rawg.io/media/games/ebd/ebdbb7ea52ba1115ce37852f4d409d98.jpg",
    release_year: "2008",
    media_type: "game",
    overview: "Sci-fi survival horror classic set aboard the desolate mining spaceship USG Ishimura overrun by hideous Necromorphs.",
    genres: ["Action", "Shooter"],
    platforms: ["PC", "PlayStation 3", "Xbox 360"],
    metacritic: 86,
  },
  {
    tmdb_id: 3939,
    title: "PAYDAY 2",
    poster_path: "https://media.rawg.io/media/games/73e/73eecb8909e0c39fb246f457b5d6500f.jpg",
    release_year: "2013",
    media_type: "game",
    overview: "Four-player co-op shooter that once again lets gamers don the masks of the original PAYDAY crew — Dallas, Hoxton, Wolf and Chains.",
    genres: ["Shooter", "Action"],
    platforms: ["PC", "PlayStation 4", "Xbox One", "Nintendo Switch", "Linux"],
    metacritic: 79,
  },
  {
    tmdb_id: 41494,
    title: "Cyberpunk 2077",
    poster_path: "https://media.rawg.io/media/games/26d/26d44377d59b07a4122d28f804b0b64d.jpg",
    release_year: "2020",
    media_type: "game",
    overview: "An open-world, action-adventure RPG set in Night City, a megalopolis obsessed with power, glamour and body modification.",
    genres: ["RPG", "Action", "Adventure"],
    platforms: ["PC", "PlayStation 5", "Xbox Series X/S", "PlayStation 4", "Xbox One"],
    metacritic: 86,
  },
  {
    tmdb_id: 494384,
    title: "Baldur's Gate 3",
    poster_path: "https://media.rawg.io/media/games/699/699222c652e1179699564d9944d1030e.jpg",
    release_year: "2023",
    media_type: "game",
    overview: "Gather your party and return to the Forgotten Realms in a story of fellowship and betrayal, sacrifice and survival, and the lure of absolute power.",
    genres: ["RPG", "Strategy"],
    platforms: ["PC", "PlayStation 5", "Xbox Series X/S", "macOS"],
    metacritic: 96,
  },
  {
    tmdb_id: 22509,
    title: "Minecraft",
    poster_path: "https://media.rawg.io/media/games/b4e/b4e4c73d5aa4ec66bbf75375c4847a2b.jpg",
    release_year: "2011",
    media_type: "game",
    overview: "Explore randomly generated worlds and build amazing things from the simplest of homes to the grandest of castles.",
    genres: ["Adventure", "Simulation", "Indie"],
    platforms: ["PC", "Nintendo Switch", "PlayStation 4", "Xbox One", "iOS", "Android"],
    metacritic: 93,
  },
  {
    tmdb_id: 362,
    title: "Hades",
    poster_path: "https://media.rawg.io/media/games/1f4/1f4dd0a50eab848e874da188de684430.jpg",
    release_year: "2020",
    media_type: "game",
    overview: "Defy the god of the dead as you hack and slash out of the Underworld in this rogue-like dungeon crawler from the creators of Bastion.",
    genres: ["Action", "RPG", "Indie"],
    platforms: ["PC", "Nintendo Switch", "PlayStation 5", "Xbox Series X/S", "macOS", "iOS"],
    metacritic: 93,
  },
  {
    tmdb_id: 9767,
    title: "Hollow Knight",
    poster_path: "https://media.rawg.io/media/games/4cf/4cfc6b7f1850590a4634b08bfab308ab.jpg",
    release_year: "2017",
    media_type: "game",
    overview: "Forge your own path in Hollow Knight! An epic action adventure through a vast ruined kingdom of insects and heroes.",
    genres: ["Action", "Indie", "Adventure"],
    platforms: ["PC", "Nintendo Switch", "PlayStation 4", "Xbox One", "macOS", "Linux"],
    metacritic: 87,
  },
  {
    tmdb_id: 28199,
    title: "The Legend of Zelda: Breath of the Wild",
    poster_path: "https://media.rawg.io/media/games/cc1/cc196a5bad36395f16d4e77ba6960f24.jpg",
    release_year: "2017",
    media_type: "game",
    overview: "Step into a world of discovery, exploration, and adventure in The Legend of Zelda: Breath of the Wild, a boundary-breaking game in the acclaimed series.",
    genres: ["Action", "Adventure", "RPG"],
    platforms: ["Nintendo Switch", "Wii U"],
    metacritic: 97,
  },
];

// Helper to convert RAWG API game object into standardized SearchResult
function formatRawgGameToSearchResult(game: any): SearchResult {
  const platforms = cleanGamePlatformsList(game.platforms || []);
  const genres = (game.genres || []).map((g: any) => g.name).filter(Boolean);
  const releaseYear = game.released ? game.released.substring(0, 4) : null;

  return {
    tmdb_id: game.id,
    title: game.name || "Untitled Game",
    poster_path: game.background_image || null,
    release_year: releaseYear,
    media_type: "game",
    overview: game.description_raw || game.description || null,
    genres: genres.length > 0 ? genres : ["Video Game"],
    platforms: platforms.length > 0 ? platforms : ["PC", "Console"],
    metacritic: game.metacritic || null,
    rating: game.rating || null,
  };
}

// Search games via RAWG API with query and robust fallbacks
export async function searchGames(query: string): Promise<SearchResult[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  const cached = gameSearchCache.get(cleanQuery);
  if (cached && cached.length > 0) {
    return cached;
  }

  const apiKey = getRawgApiKey();
  const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(
    query
  )}&page_size=20&search_precise=true`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`RAWG search failed with status ${res.status}`);
    }

    const data = await res.json();
    const results = (data.results || []).map(formatRawgGameToSearchResult);

    if (results.length > 0) {
      gameSearchCache.set(cleanQuery, results);
      return results;
    }
  } catch (err) {
    console.warn("[RAWG] Search failed or offline, filtering curated catalog:", err);
  }

  // Fallback to local curated list if network error or no results
  const fallbackMatches = CURATED_FALLBACK_GAMES.filter((g) => {
    const titleMatch = g.title.toLowerCase().includes(cleanQuery);
    const genreMatch = g.genres.some((genre) => genre.toLowerCase().includes(cleanQuery));
    const platMatch = g.platforms.some((plat) => plat.toLowerCase().includes(cleanQuery));
    return titleMatch || genreMatch || platMatch;
  });

  return fallbackMatches.length > 0 ? fallbackMatches : CURATED_FALLBACK_GAMES.slice(0, 8);
}

// Fetch popular/trending game suggestions by category
export async function fetchGameCategorySuggestions(
  category: "all" | "trending" | "top" | "action" | "rpg" | "indie" | "strategy" = "all"
): Promise<SearchResult[]> {
  const cached = gameCategoryCache.get(category);
  if (cached && cached.length > 0) {
    return cached;
  }

  const apiKey = getRawgApiKey();
  let queryParams = "page_size=20";

  if (category === "top") {
    queryParams += "&ordering=-metacritic&metacritic=80,100";
  } else if (category === "action") {
    queryParams += "&genres=action&ordering=-added";
  } else if (category === "rpg") {
    queryParams += "&genres=role-playing-games-rpg&ordering=-rating";
  } else if (category === "indie") {
    queryParams += "&genres=indie&ordering=-rating";
  } else if (category === "strategy") {
    queryParams += "&genres=strategy&ordering=-added";
  } else {
    // Default trending / popular
    queryParams += "&ordering=-added";
  }

  const url = `https://api.rawg.io/api/games?key=${apiKey}&${queryParams}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`RAWG categories failed (${res.status})`);
    }

    const data = await res.json();
    const results = (data.results || []).map(formatRawgGameToSearchResult);

    if (results.length > 0) {
      gameCategoryCache.set(category, results);
      return results;
    }
  } catch (err) {
    console.warn("[RAWG] Suggestion fetch failed, using curated catalog:", err);
  }

  // Curated category filter fallback
  if (category === "rpg") {
    return CURATED_FALLBACK_GAMES.filter((g) => g.genres.includes("RPG"));
  }
  if (category === "action") {
    return CURATED_FALLBACK_GAMES.filter((g) => g.genres.includes("Action") || g.genres.includes("Shooter"));
  }
  if (category === "indie") {
    return CURATED_FALLBACK_GAMES.filter((g) => g.genres.includes("Indie") || g.genres.includes("Puzzle"));
  }
  if (category === "top") {
    return [...CURATED_FALLBACK_GAMES].sort((a, b) => (b.metacritic || 0) - (a.metacritic || 0));
  }

  return CURATED_FALLBACK_GAMES;
}

// Fetch full game details for modal view
export async function fetchGameDetails(gameId: number): Promise<{
  detailExtra: MovieDetailExtra;
  rawGame?: any;
}> {
  const cached = gameDetailCache.get(gameId);
  if (cached) {
    return cached;
  }

  const apiKey = getRawgApiKey();
  const url = `https://api.rawg.io/api/games/${gameId}?key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`RAWG game details failed (${res.status})`);
    }

    const data = await res.json();
    const platforms = cleanGamePlatformsList(data.platforms || []);
    const developers = (data.developers || []).map((d: any) => d.name).join(", ");
    const publishers = (data.publishers || []).map((p: any) => p.name).join(", ");
    const directorOrDev = developers || publishers || undefined;

    let playtimeStr = "";
    if (data.playtime) {
      playtimeStr = `~${data.playtime} hrs avg`;
    }

    const cleanOverview =
      data.description_raw ||
      data.description?.replace(/<[^>]*>?/gm, "") ||
      "No synopsis available for this game.";

    const detailExtra: MovieDetailExtra = {
      overview: cleanOverview,
      tagline: publishers ? `Publisher: ${publishers}` : undefined,
      voteAverage: data.rating ? Number((data.rating * 2).toFixed(1)) : undefined, // Map 5-star to 10-scale
      voteCount: data.ratings_count,
      runtime: playtimeStr,
      cast: platforms.slice(0, 5), // Show platforms in cast slot
      director: directorOrDev ? `Developer: ${directorOrDev}` : undefined,
      backdropPath: data.background_image_additional || data.background_image || undefined,
      trailerKey: data.clip?.clip ? undefined : undefined,
    };

    const payload = { detailExtra, rawGame: data };
    gameDetailCache.set(gameId, payload);
    return payload;
  } catch (err) {
    console.warn("[RAWG] Detail fetch failed, looking in curated catalog:", err);
    const matched = CURATED_FALLBACK_GAMES.find((g) => g.tmdb_id === gameId);
    if (matched) {
      const fallbackExtra: MovieDetailExtra = {
        overview: matched.overview,
        tagline: matched.genres.join(" • "),
        voteAverage: matched.metacritic ? Number((matched.metacritic / 10).toFixed(1)) : 8.5,
        runtime: "~25 hrs avg",
        cast: matched.platforms,
        backdropPath: matched.poster_path || undefined,
      };
      return { detailExtra: fallbackExtra };
    }
    throw err;
  }
}
