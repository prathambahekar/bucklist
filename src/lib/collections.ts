import type { MovieCollection, WatchlistMovie } from "../types";
import { getLocalWatchlist } from "./storage";

export const COLLECTIONS_STORAGE_KEY = "bucklist_collections_v1";

export interface ComputedCollection {
  id: string;
  name: string;
  description?: string;
  type: "franchise" | "custom";
  movies: WatchlistMovie[];
  totalMovies: number;
  watchedMoviesCount: number;
  progressPercent: number;
  avgRating: string | null;
  totalDurationMinutes: number;
  posters: (string | null)[];
  coverPoster: string | null;
  isCustom: boolean;
  rawCollection?: MovieCollection;
}

// -------------------------------------------------------------
// Famous Franchises & Sagapedia Matchers
// -------------------------------------------------------------

interface FranchiseRule {
  id: string;
  name: string;
  description: string;
  pattern: RegExp;
  knownTitles?: string[];
  backdropHint?: string;
}

export const FRANCHISE_RULES: FranchiseRule[] = [
  {
    id: "franchise_harry_potter",
    name: "Harry Potter Wizarding World",
    description: "The complete Harry Potter saga & Fantastic Beasts universe",
    pattern: /harry potter|fantastic beasts|wizarding world|deathly hallows|sorcerer's stone|philosopher's stone|chamber of secrets|prisoner of azkaban|goblet of fire|order of the phoenix|half-blood prince|crimes of grindelwald|secrets of dumbledore/i,
  },
  {
    id: "franchise_lotr",
    name: "Middle-earth Saga",
    description: "The Lord of the Rings & The Hobbit trilogies",
    pattern: /lord of the rings|the hobbit|fellowship of the ring|the two towers|return of the king|an unexpected journey|desolation of smaug|battle of the five armies/i,
  },
  {
    id: "franchise_star_wars",
    name: "Star Wars Saga",
    description: "The Skywalker Saga, standalone stories & Galactic lore",
    pattern: /star wars|skywalker|the phantom menace|attack of the clones|revenge of the sith|a new hope|empire strikes back|return of the jedi|the force awakens|the last jedi|the rise of skywalker|rogue one|solo: a star wars/i,
  },
  {
    id: "franchise_batman",
    name: "Batman & The Dark Knight",
    description: "The Dark Knight trilogy and Gotham City sagas",
    pattern: /batman|the dark knight|dark knight rises|batman begins|the batman|batman returns|batman forever|batman & robin|batman v superman/i,
  },
  {
    id: "franchise_spiderman",
    name: "Spider-Man Universe",
    description: "Spider-Man trilogies, Spider-Verse & web-slinging adventures",
    pattern: /spider-man|spiderman|into the spider-verse|across the spider-verse|beyond the spider-verse|far from home|no way home|homecoming|the amazing spider-man/i,
  },
  {
    id: "franchise_mcu",
    name: "Marvel Cinematic Universe",
    description: "Avengers, Iron Man, Captain America, Thor and MCU chapters",
    pattern: /avengers|iron man|captain america|thor: |guardians of the galaxy|black panther|doctor strange|ant-man|captain marvel|shang-chi|eternals|deadpool/i,
  },
  {
    id: "franchise_john_wick",
    name: "John Wick Saga",
    description: "Baba Yaga high-octane action franchise",
    pattern: /john wick|ballerina/i,
  },
  {
    id: "franchise_mission_impossible",
    name: "Mission: Impossible",
    description: "Ethan Hunt and the IMF impossible operations",
    pattern: /mission: impossible|mission impossible|dead reckoning|ghost protocol|fallout|rogue nation/i,
  },
  {
    id: "franchise_fast_furious",
    name: "Fast & Furious Saga",
    description: "High speed, adrenaline, and family across the globe",
    pattern: /fast & furious|fast and furious|2 fast 2 furious|tokyo drift|fast five|fast & furious 6|furious 7|the fate of the furious|f9|fast x|hobbs & shaw/i,
  },
  {
    id: "franchise_jurassic",
    name: "Jurassic Saga",
    description: "Jurassic Park and Jurassic World prehistoric adventures",
    pattern: /jurassic park|jurassic world|the lost world: jurassic|dominion|fallen kingdom/i,
  },
  {
    id: "franchise_matrix",
    name: "The Matrix Collection",
    description: "Neo and the simulated reality sci-fi journey",
    pattern: /the matrix|matrix reloaded|matrix revolutions|matrix resurrections/i,
  },
  {
    id: "franchise_hunger_games",
    name: "The Hunger Games Saga",
    description: "Panem and the Mockingjay rebellion",
    pattern: /hunger games|catching fire|mockingjay|ballad of songbirds/i,
  },
  {
    id: "franchise_twilight",
    name: "The Twilight Saga",
    description: "The supernatural romance and vampire battles",
    pattern: /twilight saga|new moon|eclipse|breaking dawn/i,
  },
  {
    id: "franchise_pirates",
    name: "Pirates of the Caribbean",
    description: "Captain Jack Sparrow on the high seas",
    pattern: /pirates of the caribbean|curse of the black pearl|dead man's chest|at world's end|on stranger tides|dead men tell no tales/i,
  },
  {
    id: "franchise_toy_story",
    name: "Toy Story Collection",
    description: "Woody, Buzz Lightyear and childhood memories",
    pattern: /toy story|lightyear/i,
  },
  {
    id: "franchise_shrek",
    name: "Shrek Universe",
    description: "The swamp ogre fairytale subversions & Puss in Boots",
    pattern: /shrek|puss in boots/i,
  },
  {
    id: "franchise_despicable_me",
    name: "Despicable Me & Minions",
    description: "Gru, the girls, and the mischievous yellow Minions",
    pattern: /despicable me|minions/i,
  },
  {
    id: "franchise_dune",
    name: "Dune Chronicles",
    description: "Arrakis spice, Paul Atreides and the desert epic",
    pattern: /dune: part|dune part/i,
  },
  {
    id: "franchise_avatar",
    name: "Avatar & Pandora Saga",
    description: "James Cameron's world of Pandora and the Na'vi",
    pattern: /avatar: the way of water|avatar 1|avatar 2|avatar: fire and ash/i,
  },
  {
    id: "franchise_godfather",
    name: "The Godfather Trilogy",
    description: "The Corleone mafia masterpiece saga",
    pattern: /the godfather/i,
  },
  {
    id: "franchise_indiana_jones",
    name: "Indiana Jones Adventures",
    description: "Archaeological globe-trotting escapades",
    pattern: /indiana jones|raiders of the lost ark|temple of doom|the last crusade|kingdom of the crystal skull|dial of destiny/i,
  },
  {
    id: "franchise_alien_predator",
    name: "Alien & Predator Universe",
    description: "Sci-fi horror xenomorphs and hunters",
    pattern: /alien:|aliens|alien 3|alien resurrection|prometheus|alien: covenant|alien: romulus|predator|prey/i,
  },
  {
    id: "franchise_terminator",
    name: "The Terminator Collection",
    description: "Time-traveling cyborgs and the resistance",
    pattern: /terminator|judgment day|rise of the machines|salvation|genisys|dark fate/i,
  },
  {
    id: "franchise_planet_apes",
    name: "Planet of the Apes Saga",
    description: "Caesar and the rise of the ape civilization",
    pattern: /planet of the apes|rise of the planet|dawn of the planet|war for the planet|kingdom of the planet/i,
  },
  {
    id: "franchise_kung_fu_panda",
    name: "Kung Fu Panda",
    description: "Po the Dragon Warrior and the Furious Five",
    pattern: /kung fu panda/i,
  },
  {
    id: "franchise_httyd",
    name: "How to Train Your Dragon",
    description: "Hiccup, Toothless, and the Isle of Berk",
    pattern: /how to train your dragon|the hidden world/i,
  },
  {
    id: "franchise_mad_max",
    name: "Mad Max Wasteland",
    description: "George Miller's post-apocalyptic road epics",
    pattern: /mad max|the road warrior|beyond thunderdome|fury road|furiosa/i,
  },
  {
    id: "franchise_conjuring",
    name: "The Conjuring Universe",
    description: "Ed & Lorraine Warren cases, Annabelle, and The Nun",
    pattern: /the conjuring|annabelle|the nun|the curse of la llorona/i,
  },
  {
    id: "franchise_saw",
    name: "Saw Collection",
    description: "Jigsaw puzzles and twisted traps",
    pattern: /saw [0-9]|saw ii|saw iii|saw iv|saw v|saw vi|saw 3d|jigsaw|spiral: from the book of saw|saw x/i,
  },
  {
    id: "franchise_transformers",
    name: "Transformers Universe",
    description: "Autobots vs. Decepticons robotic battles",
    pattern: /transformers|bumblebee|rise of the beasts|revenge of the fallen|dark of the moon|age of extinction|the last knight/i,
  },
];

// -------------------------------------------------------------
// Custom Collections Storage Management
// -------------------------------------------------------------

export function getLocalCollections(): MovieCollection[] {
  try {
    const raw = localStorage.getItem(COLLECTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((c) => c && typeof c === "object" && typeof c.id === "string" && typeof c.name === "string");
    }
  } catch (err) {
    console.error("Failed to load local collections:", err);
  }
  return [];
}

export function saveLocalCollections(collections: MovieCollection[]): void {
  try {
    localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(collections));
  } catch (err) {
    console.error("Failed to save local collections:", err);
  }
}

export function createCustomCollection(
  name: string,
  description?: string,
  movieIds: string[] = []
): MovieCollection {
  const collections = getLocalCollections();
  const newCollection: MovieCollection = {
    id: `custom_col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    description: description?.trim() || undefined,
    movie_ids: Array.from(new Set(movieIds)),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_custom: true,
  };
  collections.unshift(newCollection);
  saveLocalCollections(collections);
  return newCollection;
}

export function updateCustomCollection(updated: MovieCollection): void {
  const collections = getLocalCollections();
  const index = collections.findIndex((c) => c.id === updated.id);
  if (index !== -1) {
    collections[index] = {
      ...updated,
      updated_at: new Date().toISOString(),
    };
    saveLocalCollections(collections);
  }
}

export function deleteCustomCollection(id: string): void {
  const collections = getLocalCollections();
  const filtered = collections.filter((c) => c.id !== id);
  saveLocalCollections(filtered);
}

export function addMovieToCollection(collectionId: string, movieId: string): void {
  const collections = getLocalCollections();
  const collection = collections.find((c) => c.id === collectionId);
  if (collection) {
    if (!collection.movie_ids.includes(movieId)) {
      collection.movie_ids.push(movieId);
      collection.updated_at = new Date().toISOString();
      saveLocalCollections(collections);
    }
  }
}

export function removeMovieFromCollection(collectionId: string, movieId: string): void {
  const collections = getLocalCollections();
  const collection = collections.find((c) => c.id === collectionId);
  if (collection) {
    collection.movie_ids = collection.movie_ids.filter((id) => id !== movieId);
    collection.updated_at = new Date().toISOString();
    saveLocalCollections(collections);
  }
}

export function toggleMovieInCollection(collectionId: string, movieId: string): boolean {
  const collections = getLocalCollections();
  const collection = collections.find((c) => c.id === collectionId);
  if (!collection) return false;

  const exists = collection.movie_ids.includes(movieId);
  if (exists) {
    collection.movie_ids = collection.movie_ids.filter((id) => id !== movieId);
  } else {
    collection.movie_ids.push(movieId);
  }
  collection.updated_at = new Date().toISOString();
  saveLocalCollections(collections);
  return !exists;
}

// -------------------------------------------------------------
// Computation Engine
// -------------------------------------------------------------

export function computeCollectionStats(
  id: string,
  name: string,
  description: string | undefined,
  type: "franchise" | "custom",
  movies: WatchlistMovie[],
  rawCollection?: MovieCollection
): ComputedCollection {
  // Sort movies chronologically by release year or title
  const sortedMovies = [...movies].sort((a, b) => {
    const yearA = parseInt(a.release_year || "0", 10) || 0;
    const yearB = parseInt(b.release_year || "0", 10) || 0;
    if (yearA !== yearB) return yearA - yearB;
    return a.title.localeCompare(b.title);
  });

  const totalMovies = sortedMovies.length;
  const watchedMovies = sortedMovies.filter((m) => m.watched);
  const watchedMoviesCount = watchedMovies.length;
  const progressPercent = totalMovies > 0 ? Math.round((watchedMoviesCount / totalMovies) * 100) : 0;

  // Rating computation
  const ratedWatched = watchedMovies.filter((m) => m.rating && m.rating > 0);
  let avgRating: string | null = null;
  if (ratedWatched.length > 0) {
    const sum = ratedWatched.reduce((acc, m) => acc + (m.rating || 0), 0);
    avgRating = (sum / ratedWatched.length).toFixed(1);
  }

  // Estimated Duration: movies ~ 115m, TV ~ 300m
  let totalDurationMinutes = 0;
  sortedMovies.forEach((m) => {
    if (m.media_type === "tv") {
      totalDurationMinutes += 300;
    } else {
      totalDurationMinutes += 115;
    }
  });

  const posters = sortedMovies.map((m) => m.poster_path).filter((p): p is string => Boolean(p));
  const coverPoster = posters[0] || null;

  return {
    id,
    name,
    description,
    type,
    movies: sortedMovies,
    totalMovies,
    watchedMoviesCount,
    progressPercent,
    avgRating,
    totalDurationMinutes,
    posters,
    coverPoster,
    isCustom: type === "custom",
    rawCollection,
  };
}

/**
 * Calculates all franchise groupings and user custom collections based on watchlist items
 */
export function getAllComputedCollections(
  allWatchlist: WatchlistMovie[],
  customCollections: MovieCollection[],
  options?: { onlyWatched?: boolean }
): ComputedCollection[] {
  const result: ComputedCollection[] = [];

  // 1. Process Custom Collections
  const movieMapById = new Map<string, WatchlistMovie>();
  allWatchlist.forEach((m) => movieMapById.set(m.id, m));

  customCollections.forEach((customCol) => {
    const matchedMovies: WatchlistMovie[] = [];
    customCol.movie_ids.forEach((id) => {
      const found = movieMapById.get(id);
      if (found) {
        if (!options?.onlyWatched || found.watched) {
          matchedMovies.push(found);
        }
      }
    });

    // Custom collections are shown even if empty or have 1 item so user can curate them
    result.push(
      computeCollectionStats(
        customCol.id,
        customCol.name,
        customCol.description,
        "custom",
        matchedMovies,
        customCol
      )
    );
  });

  // 2. Process Auto-Discovered Franchises
  FRANCHISE_RULES.forEach((rule) => {
    const matched = allWatchlist.filter((m) => {
      if (options?.onlyWatched && !m.watched) return false;
      return rule.pattern.test(m.title);
    });

    // Only create a franchise group if at least 1 or 2 titles exist in the user's list
    if (matched.length >= 1) {
      result.push(
        computeCollectionStats(
          rule.id,
          rule.name,
          rule.description,
          "franchise",
          matched
        )
      );
    }
  });

  return result;
}
