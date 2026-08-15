import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Linking,
  Alert,
  useWindowDimensions,
} from "react-native";
import {
  Bookmark,
  Search,
  X,
  Plus,
  Check,
  Film,
  CheckCircle2,
  Trash2,
  Star,
  PlayCircle,
  SlidersHorizontal,
} from "lucide-react-native";
import { supabase } from "./src/lib/supabase";
import {
  searchMovies,
  getPosterUrl,
  type WatchlistMovie,
  type SearchResult,
} from "./src/lib/api";

type Tab = "towatch" | "watched";

export default function App() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [tab, setTab] = useState<Tab>("towatch");
  const [movies, setMovies] = useState<WatchlistMovie[]>([]);
  const [watched, setWatched] = useState<WatchlistMovie[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);

  // Modal states
  const [watchedModalMovie, setWatchedModalMovie] = useState<WatchlistMovie | null>(null);
  const [userRating, setUserRating] = useState<number>(5);
  const [detailMovie, setDetailMovie] = useState<WatchlistMovie | SearchResult | null>(null);
  const [genreModalOpen, setGenreModalOpen] = useState(false);
  const [detailExtra, setDetailExtra] = useState<{
    overview?: string | null;
    tagline?: string;
    voteAverage?: number;
    voteCount?: number;
    runtime?: string;
    cast?: string[];
    director?: string;
    trailerKey?: string;
    backdropPath?: string;
  } | null>(null);

  // Filter & Sort
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [sortBy] = useState<"newest" | "rating" | "release">("newest");

  const requestIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("watchlist")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch error:", error);
        return;
      }

      const all = (data || []) as WatchlistMovie[];
      setMovies(all.filter((m) => !m.watched));
      setWatched(
        all
          .filter((m) => m.watched)
          .sort((a, b) => (b.watched_date || "").localeCompare(a.watched_date || ""))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Search debounce effect
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setSearchOpen(true);
    const currentRequestId = ++requestIdRef.current;

    const timer = setTimeout(async () => {
      try {
        const res = await searchMovies(trimmed);
        if (currentRequestId === requestIdRef.current) {
          setSearchResults(res);
        }
      } catch {
        if (currentRequestId === requestIdRef.current) {
          setSearchResults([]);
        }
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setSearchLoading(false);
        }
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch extra details when detail modal opens with automatic endpoint fallback (tv vs movie)
  useEffect(() => {
    if (!detailMovie?.tmdb_id) {
      setDetailExtra(null);
      return;
    }

    const tmdbKey = "9869c47c4b6c6a4990c1c71057aaaf5a";
    const primaryType = detailMovie.media_type === "tv" ? "tv" : "movie";
    const secondaryType = primaryType === "tv" ? "movie" : "tv";

    async function fetchTmdbDetail(type: "tv" | "movie") {
      const res = await fetch(
        `https://api.themoviedb.org/3/${type}/${detailMovie!.tmdb_id}?api_key=${tmdbKey}&append_to_response=credits,videos&language=en-US`
      );
      if (!res.ok) return null;
      return res.json();
    }

    (async () => {
      try {
        let data = await fetchTmdbDetail(primaryType);
        if (!data || (!data.overview && !data.backdrop_path)) {
          const fallbackData = await fetchTmdbDetail(secondaryType);
          if (fallbackData) data = fallbackData;
        }

        if (!data) return;
        const isTv = data.number_of_seasons !== undefined || primaryType === "tv";
        let runtimeStr = "";
        if (isTv) {
          if (data.number_of_seasons) {
            runtimeStr = `${data.number_of_seasons} Season${data.number_of_seasons > 1 ? "s" : ""}`;
            if (data.number_of_episodes) {
              runtimeStr += ` • ${data.number_of_episodes} Ep`;
            }
          }
        } else if (data.runtime) {
          const hrs = Math.floor(data.runtime / 60);
          const mins = data.runtime % 60;
          runtimeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
        }

        const castList = (data.credits?.cast || [])
          .slice(0, 4)
          .map((c: { name: string }) => c.name);

        const directorObj = (data.credits?.crew || []).find(
          (c: { job: string }) => c.job === "Director"
        );
        const creatorObj = data.created_by?.[0];
        const directorName = directorObj?.name || creatorObj?.name;

        const videos = data.videos?.results || [];
        const trailer = videos.find((v: { type: string; site: string }) => v.type === "Trailer" && v.site === "YouTube") || videos[0];

        const storedOverview = detailMovie && "overview" in detailMovie ? detailMovie.overview : null;
        setDetailExtra({
          overview: data.overview || storedOverview,
          tagline: data.tagline,
          voteAverage: data.vote_average ? Number(data.vote_average.toFixed(1)) : undefined,
          voteCount: data.vote_count,
          runtime: runtimeStr,
          cast: castList,
          director: directorName,
          trailerKey: trailer?.key,
          backdropPath: data.backdrop_path,
        });
      } catch (e) {
        console.error("Detail fetch error:", e);
      }
    })();
  }, [detailMovie]);

  async function handleAdd(item: SearchResult) {
    setAddingId(item.tmdb_id);
    try {
      const { error } = await supabase.from("watchlist").insert({
        tmdb_id: item.tmdb_id,
        title: item.title,
        poster_path: item.poster_path,
        release_year: item.release_year,
        media_type: item.media_type || "movie",
        genres: item.genres || [],
        platforms: item.platforms || [],
      });
      if (error) {
        if (error.code === "23505") {
          Alert.alert("Already Added", `"${item.title}" is already in your watchlist.`);
        } else {
          Alert.alert("Error", error.message);
        }
      } else {
        fetchAll();
        setSearchOpen(false);
        setQuery("");
      }
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Failed to add title";
      Alert.alert("Error", msg);
    } finally {
      setAddingId(null);
    }
  }

  async function handleSaveWatched() {
    if (!watchedModalMovie) return;
    const todayDate = new Date().toISOString().split("T")[0];
    try {
      const { error } = await supabase
        .from("watchlist")
        .update({
          watched: true,
          watched_date: todayDate,
          rating: userRating,
        })
        .eq("id", watchedModalMovie.id);

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        setWatchedModalMovie(null);
        fetchAll();
      }
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Failed to mark as watched";
      Alert.alert("Error", msg);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from("watchlist").delete().eq("id", id);
      if (!error) fetchAll();
    } catch (e) {
      console.error(e);
    }
  }

  const existingTmdbIds = useMemo(
    () => new Set<number>([...movies.map((m) => m.tmdb_id), ...watched.map((m) => m.tmdb_id)]),
    [movies, watched]
  );

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    [...movies, ...watched].forEach((m) => (m.genres || []).forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [movies, watched]);

  const allPlatforms = useMemo(() => {
    const set = new Set<string>();
    [...movies, ...watched].forEach((m) => (m.platforms || []).forEach((p) => set.add(p)));
    return Array.from(set).sort();
  }, [movies, watched]);

  const processList = useCallback(
    (list: WatchlistMovie[]) => {
      let filtered = list;
      if (selectedGenre) filtered = filtered.filter((m) => (m.genres || []).includes(selectedGenre));
      if (selectedPlatform) filtered = filtered.filter((m) => (m.platforms || []).includes(selectedPlatform));

      return [...filtered].sort((a, b) => {
        if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
        if (sortBy === "release") return (b.release_year || "").localeCompare(a.release_year || "");
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
    },
    [selectedGenre, selectedPlatform, sortBy]
  );

  const displayMovies = useMemo(() => processList(movies), [movies, processList]);
  const displayWatched = useMemo(() => processList(watched), [watched, processList]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />

      {/* Main Responsive Content Area */}
      <View style={[styles.mainWrapper, { maxWidth: isDesktop ? 860 : "100%" }]}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.logoBadge}>
              <Bookmark size={20} color="#09090b" fill="#09090b" />
            </View>
            <Text style={styles.headerTitle}>Bucklist</Text>
          </View>

          {/* Top Badges */}
          <View style={styles.statsBadges}>
            <View style={styles.badgePill}>
              <Film size={13} color="#60a5fa" />
              <Text style={styles.badgeText}>{movies.length}</Text>
            </View>
            <View style={styles.badgePill}>
              <CheckCircle2 size={13} color="#4ade80" />
              <Text style={styles.badgeText}>{watched.length}</Text>
            </View>
          </View>
        </View>

        {/* Search Input Bar with Integrated Filter Toggle */}
        <View style={styles.searchContainer}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={[styles.searchInputRow, { flex: 1 }]}>
              <Search size={16} color="#71717a" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search movies or TV series..."
                placeholderTextColor="#71717a"
                value={query}
                onChangeText={setQuery}
                onFocus={() => (searchResults.length > 0 || searchLoading) && setSearchOpen(true)}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => { setQuery(""); setSearchResults([]); setSearchOpen(false); }}>
                  <X size={16} color="#71717a" />
                </TouchableOpacity>
              )}
            </View>

            {/* Integrated Filter Button */}
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              style={[styles.filterButton, (showFilters || selectedGenre || selectedPlatform) && styles.activeFilterButton]}
            >
              <SlidersHorizontal size={16} color={(showFilters || selectedGenre || selectedPlatform) ? "#f59e0b" : "#a1a1aa"} />
              {(selectedGenre || selectedPlatform) && (
                <View style={styles.filterDot} />
              )}
            </TouchableOpacity>
          </View>

          {/* Integrated Streamlined Filter Strip (ONLY OTT Pills + Genre Selector at End) */}
          {(showFilters || selectedGenre || selectedPlatform) && (
            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: "#71717a", textTransform: "uppercase", letterSpacing: 0.5 }}>Filters</Text>
                {(selectedGenre || selectedPlatform) && (
                  <TouchableOpacity onPress={() => { setSelectedGenre(null); setSelectedPlatform(null); }}>
                    <Text style={{ fontSize: 10, color: "#f59e0b", fontWeight: "600" }}>Reset all</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: "center" }}>
                {/* All OTTs Pill */}
                <TouchableOpacity
                  onPress={() => setSelectedPlatform(null)}
                  style={[styles.compactOttPill, selectedPlatform === null && styles.activeCompactOttPill]}
                >
                  <Text style={[styles.compactOttPillText, selectedPlatform === null && styles.activeCompactOttPillText]}>All OTTs</Text>
                </TouchableOpacity>

                {/* List ONLY OTT Platforms */}
                {allPlatforms.map((p) => {
                  const active = selectedPlatform === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setSelectedPlatform(active ? null : p)}
                      style={[styles.compactOttPill, active && styles.activeCompactOttPill]}
                    >
                      <Text style={[styles.compactOttPillText, active && styles.activeCompactOttPillText]}>{p}</Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Genre Selector Pill at the End - OPENS DROPDOWN MODAL */}
                {allGenres.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setGenreModalOpen(true)}
                    style={[styles.compactGenrePill, Boolean(selectedGenre) && styles.activeCompactGenrePill]}
                  >
                    <Text style={[styles.compactGenrePillText, Boolean(selectedGenre) && styles.activeCompactGenrePillText]}>
                      Genre: {selectedGenre || "All"} ▾
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          )}

          {/* Search Results Dropdown */}
          {searchOpen && (
            <View style={styles.searchDropdown}>
              {searchLoading ? (
                <ActivityIndicator color="#f59e0b" style={{ padding: 16 }} />
              ) : searchResults.length === 0 ? (
                <Text style={styles.noResultsText}>No titles found</Text>
              ) : (
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {searchResults.map((item) => {
                    const poster = getPosterUrl(item.poster_path);
                    const isAdded = existingTmdbIds.has(item.tmdb_id);
                    const isTv = item.media_type === "tv";
                    return (
                      <View key={item.tmdb_id} style={styles.searchResultItem}>
                        <Image source={{ uri: poster || "https://via.placeholder.com/100" }} style={styles.searchPoster} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.searchTitle} numberOfLines={1}>{item.title}</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                            <Text style={[styles.typeBadge, isTv ? styles.tvBadge : styles.movieBadge]}>
                              {isTv ? "TV Series" : "Movie"}
                            </Text>
                            {item.release_year && <Text style={styles.searchYear}>{item.release_year}</Text>}
                          </View>
                          {item.platforms.length > 0 && (
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                              {item.platforms.slice(0, 2).map((p) => (
                                <Text key={p} style={styles.ottTag}>{p}</Text>
                              ))}
                            </View>
                          )}
                        </View>
                        <TouchableOpacity
                          disabled={isAdded || addingId === item.tmdb_id}
                          onPress={() => handleAdd(item)}
                          style={[styles.addButton, isAdded && styles.addedButton]}
                        >
                          {isAdded ? (
                            <Check size={14} color="#4ade80" />
                          ) : (
                            <Plus size={14} color="#09090b" />
                          )}
                          <Text style={[styles.addButtonText, isAdded && styles.addedButtonText]}>
                            {isAdded ? "Added" : "Add"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}
        </View>

        {/* Main Movie List with Responsive Grid Layout */}
        {loading ? (
          <ActivityIndicator size="large" color="#f59e0b" style={{ flex: 1 }} />
        ) : (
          <FlatList
            key={isDesktop ? 2 : 1}
            numColumns={isDesktop ? 2 : 1}
            showsVerticalScrollIndicator={false}
            data={tab === "towatch" ? displayMovies : displayWatched}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 12 }}
            columnWrapperStyle={isDesktop ? { gap: 12 } : undefined}
            renderItem={({ item }) => {
              const poster = getPosterUrl(item.poster_path);
              const isTv = item.media_type === "tv";
              return (
                <TouchableOpacity
                  onPress={() => setDetailMovie(item)}
                  style={[styles.card, isDesktop && { flex: 1 }]}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: poster || "https://via.placeholder.com/100" }} style={styles.cardPoster} />
                  <View style={{ flex: 1, justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                          {isTv && <Text style={styles.tvBadge}>TV Series</Text>}
                          {item.release_year && <Text style={styles.cardYear}>{item.release_year}</Text>}
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => handleDelete(item.id)}>
                        <Trash2 size={16} color="#71717a" />
                      </TouchableOpacity>
                    </View>

                    {/* Platforms */}
                    {(item.platforms || []).length > 0 && (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {item.platforms.map((p) => (
                          <Text key={p} style={styles.ottTag}>{p}</Text>
                        ))}
                      </View>
                    )}

                    {/* Bottom Action */}
                    <View style={{ marginTop: 10 }}>
                      {!item.watched ? (
                        <TouchableOpacity
                          onPress={() => { setWatchedModalMovie(item); setUserRating(5); }}
                          style={styles.actionButton}
                        >
                          <Check size={14} color="#09090b" />
                          <Text style={styles.actionButtonText}>Mark as Watched</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={14}
                              color="#f59e0b"
                              fill={s <= (item.rating || 0) ? "#f59e0b" : "transparent"}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* Floating Bottom Nav */}
      <View style={styles.floatingNavContainer}>
        <View style={styles.floatingNav}>
          <TouchableOpacity
            onPress={() => setTab("towatch")}
            style={[styles.navTab, tab === "towatch" && styles.activeNavTab]}
          >
            <Film size={16} color={tab === "towatch" ? "#09090b" : "#a1a1aa"} />
            <Text style={[styles.navTabText, tab === "towatch" && styles.activeNavTabText]}>To Watch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTab("watched")}
            style={[styles.navTab, tab === "watched" && styles.activeNavTab]}
          >
            <CheckCircle2 size={16} color={tab === "watched" ? "#09090b" : "#a1a1aa"} />
            <Text style={[styles.navTabText, tab === "watched" && styles.activeNavTabText]}>Watched</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mark Watched Modal */}
      <Modal visible={Boolean(watchedModalMovie)} transparent animationType="slide">
        <TouchableOpacity
          style={[styles.modalOverlay, isDesktop && { justifyContent: "center" }]}
          activeOpacity={1}
          onPress={() => setWatchedModalMovie(null)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, isDesktop && styles.desktopModalContent]}>
            <View style={styles.dragHandle} />
            <Text style={styles.modalTitle}>Rate & Mark Watched</Text>
            <Text style={styles.modalSub}>{watchedModalMovie?.title}</Text>

            <View style={{ flexDirection: "row", gap: 8, marginVertical: 16, justifyContent: "center" }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setUserRating(s)}>
                  <Star size={28} color="#f59e0b" fill={s <= userRating ? "#f59e0b" : "transparent"} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={handleSaveWatched} style={styles.modalSaveButton}>
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setWatchedModalMovie(null)} style={{ marginTop: 12 }}>
              <Text style={{ color: "#a1a1aa", textAlign: "center" }}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Movie Details Modal */}
      <Modal visible={Boolean(detailMovie)} transparent animationType="slide">
        <TouchableOpacity
          style={[styles.modalOverlay, isDesktop && { justifyContent: "center" }]}
          activeOpacity={1}
          onPress={() => setDetailMovie(null)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, isDesktop && styles.desktopModalContent, { maxHeight: "88%", paddingHorizontal: 0, paddingTop: 10 }]}>
            <View style={styles.dragHandle} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              {/* Close Button Header */}
              <TouchableOpacity onPress={() => setDetailMovie(null)} style={{ alignSelf: "flex-end", marginBottom: 8 }}>
                <X size={20} color="#a1a1aa" />
              </TouchableOpacity>

              {/* Main Poster & Header Details Card */}
              {detailMovie && (
                <View style={{ flexDirection: "row", gap: 14, marginBottom: 16 }}>
                  <Image
                    source={{ uri: getPosterUrl(detailMovie.poster_path) || "https://via.placeholder.com/150" }}
                    style={{ width: 84, height: 126, borderRadius: 12, backgroundColor: "#27272a" }}
                  />
                  <View style={{ flex: 1, justifyContent: "center" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Text style={[styles.typeBadge, detailMovie.media_type === "tv" ? styles.tvBadge : styles.movieBadge]}>
                        {detailMovie.media_type === "tv" ? "TV Series" : "Movie"}
                      </Text>
                      {detailMovie.release_year && (
                        <Text style={{ fontSize: 12, color: "#a1a1aa" }}>{detailMovie.release_year}</Text>
                      )}
                      {detailExtra?.runtime && (
                        <Text style={{ fontSize: 12, color: "#a1a1aa" }}>• {detailExtra.runtime}</Text>
                      )}
                    </View>

                    <Text style={{ fontSize: 18, fontWeight: "bold", color: "#f4f4f5", lineHeight: 22 }}>
                      {detailMovie.title}
                    </Text>

                    {/* TMDB Star Rating */}
                    {detailExtra?.voteAverage && detailExtra.voteAverage > 0 && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                        <Star size={13} color="#f59e0b" fill="#f59e0b" />
                        <Text style={{ fontSize: 12, fontWeight: "bold", color: "#fbbf24" }}>
                          {detailExtra.voteAverage} / 10
                        </Text>
                        {detailExtra.voteCount && (
                          <Text style={{ fontSize: 10, color: "#71717a" }}>({detailExtra.voteCount.toLocaleString()})</Text>
                        )}
                      </View>
                    )}

                    {"watched" in detailMovie && detailMovie.watched && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                        <Check size={12} color="#4ade80" />
                        <Text style={{ fontSize: 11, color: "#4ade80", fontWeight: "600" }}>
                          Watched {detailMovie.rating ? `(${detailMovie.rating}★)` : ""}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Tagline */}
              {detailExtra?.tagline && (
                <Text style={{ color: "#fbbf24", fontStyle: "italic", fontSize: 12, marginBottom: 12 }}>
                  "{detailExtra.tagline}"
                </Text>
              )}

              {/* Synopsis Section */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 11, fontWeight: "bold", color: "#71717a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                  Synopsis
                </Text>
                <Text style={{ color: "#e4e4e7", fontSize: 13, lineHeight: 19 }}>
                  {detailExtra?.overview || (detailMovie && "overview" in detailMovie ? detailMovie.overview : null) || "No synopsis available for this title."}
                </Text>
              </View>

              {/* Director / Creator & Cast */}
              {(detailExtra?.director || (detailExtra?.cast && detailExtra.cast.length > 0)) && (
                <View style={{ marginBottom: 16, gap: 8 }}>
                  {detailExtra.director && (
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: "bold", color: "#71717a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                        Director / Creator
                      </Text>
                      <Text style={{ color: "#f4f4f5", fontSize: 12, backgroundColor: "#27272a", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start" }}>
                        {detailExtra.director}
                      </Text>
                    </View>
                  )}

                  {detailExtra.cast && detailExtra.cast.length > 0 && (
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: "bold", color: "#71717a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                        Cast
                      </Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {detailExtra.cast.map((actor) => (
                          <Text key={actor} style={{ color: "#d4d4d8", fontSize: 11, backgroundColor: "#27272a", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                            {actor}
                          </Text>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Genres */}
              {detailMovie && (detailMovie.genres || []).length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: "#71717a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                    Genres
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {detailMovie.genres.map((g) => (
                      <Text key={g} style={{ color: "#d4d4d8", fontSize: 11, backgroundColor: "#27272a", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                        {g}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* Stream On / OTT Platforms */}
              {detailMovie && (detailMovie.platforms || []).length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: "#fbbf24", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                    Stream On
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {detailMovie.platforms.map((p) => (
                      <Text key={p} style={{ color: "#fbbf24", fontSize: 11, fontWeight: "600", backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                        📺 {p}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {/* Watch Official Trailer Button */}
              {detailExtra?.trailerKey && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${detailExtra.trailerKey}`)}
                  style={styles.trailerButton}
                >
                  <PlayCircle size={16} color="#ef4444" />
                  <Text style={{ color: "#ef4444", fontWeight: "600", fontSize: 13 }}>Watch Official Trailer</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Genre Dropdown Picker Modal */}
      <Modal visible={genreModalOpen} transparent animationType="slide">
        <TouchableOpacity
          style={[styles.modalOverlay, isDesktop && { justifyContent: "center" }]}
          activeOpacity={1}
          onPress={() => setGenreModalOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, isDesktop && styles.desktopModalContent, { maxHeight: "75%" }]}>
            <View style={styles.dragHandle} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={styles.modalTitle}>Filter by Genre</Text>
              <TouchableOpacity onPress={() => setGenreModalOpen(false)}>
                <X size={20} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginTop: 4 }} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                onPress={() => { setSelectedGenre(null); setGenreModalOpen(false); }}
                style={[styles.genreOptionRow, selectedGenre === null && styles.activeGenreOptionRow]}
              >
                <Text style={[styles.genreOptionText, selectedGenre === null && styles.activeGenreOptionText]}>All Genres</Text>
                {selectedGenre === null && <Check size={16} color="#f59e0b" />}
              </TouchableOpacity>

              {allGenres.map((g) => {
                const isSelected = selectedGenre === g;
                return (
                  <TouchableOpacity
                    key={g}
                    onPress={() => { setSelectedGenre(g); setGenreModalOpen(false); }}
                    style={[styles.genreOptionRow, isSelected && styles.activeGenreOptionRow]}
                  >
                    <Text style={[styles.genreOptionText, isSelected && styles.activeGenreOptionText]}>{g}</Text>
                    {isSelected && <Check size={16} color="#f59e0b" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" },
  mainWrapper: { flex: 1, alignSelf: "center", width: "100%" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#18181b",
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#f4f4f5" },
  statsBadges: { flexDirection: "row", gap: 6 },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#18181b",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  badgeText: { fontSize: 12, fontWeight: "bold", color: "#f4f4f5" },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 10, zIndex: 100, elevation: 10, position: "relative" },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181b",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: "#f4f4f5", fontSize: 14 },
  searchDropdown: {
    position: "absolute",
    top: 54,
    left: 16,
    right: 16,
    backgroundColor: "#18181b",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#27272a",
    overflow: "hidden",
    zIndex: 1000,
    elevation: 20,
  },
  noResultsText: { color: "#71717a", textAlign: "center", padding: 16, fontSize: 13 },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
    gap: 10,
  },
  searchPoster: { width: 40, height: 60, borderRadius: 6, backgroundColor: "#27272a" },
  searchTitle: { color: "#f4f4f5", fontSize: 13, fontWeight: "600" },
  searchYear: { color: "#71717a", fontSize: 11 },
  typeBadge: { fontSize: 9, fontWeight: "bold", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  movieBadge: { backgroundColor: "rgba(59,130,246,0.2)", color: "#60a5fa" },
  tvBadge: { backgroundColor: "rgba(168,85,247,0.2)", color: "#c084fc" },
  ottTag: { fontSize: 9, color: "#fbbf24", backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  addButton: { backgroundColor: "#f4f4f5", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 2 },
  addedButton: { backgroundColor: "rgba(74,222,128,0.15)" },
  addButtonText: { color: "#09090b", fontSize: 11, fontWeight: "600" },
  addedButtonText: { color: "#4ade80" },
  filterButton: {
    backgroundColor: "#18181b",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeFilterButton: {
    borderColor: "rgba(245,158,11,0.5)",
    backgroundColor: "rgba(245,158,11,0.15)",
  },
  filterDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f59e0b",
  },
  compactOttPill: {
    backgroundColor: "#18181b",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  activeCompactOttPill: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },
  compactOttPillText: {
    color: "#fbbf24",
    fontSize: 11,
    fontWeight: "500",
  },
  activeCompactOttPillText: {
    color: "#09090b",
    fontWeight: "bold",
  },
  compactGenrePill: {
    backgroundColor: "#18181b",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  activeCompactGenrePill: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },
  compactGenrePillText: {
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: "500",
  },
  activeCompactGenrePillText: {
    color: "#09090b",
    fontWeight: "bold",
  },
  genreOptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  activeGenreOptionRow: {
    backgroundColor: "rgba(245,158,11,0.15)",
  },
  genreOptionText: {
    fontSize: 14,
    color: "#e4e4e7",
  },
  activeGenreOptionText: {
    color: "#fbbf24",
    fontWeight: "bold",
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#18181b",
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  cardPoster: { width: 64, height: 96, borderRadius: 10, backgroundColor: "#27272a" },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#f4f4f5" },
  cardYear: { fontSize: 12, color: "#71717a" },
  actionButton: {
    backgroundColor: "#f4f4f5",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  actionButtonText: { color: "#09090b", fontSize: 12, fontWeight: "600" },
  floatingNavContainer: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  floatingNav: {
    flexDirection: "row",
    backgroundColor: "rgba(24,24,27,0.95)",
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    borderColor: "#27272a",
    width: "90%",
    maxWidth: 340,
  },
  navTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 14, gap: 6 },
  activeNavTab: { backgroundColor: "#f4f4f5" },
  navTabText: { color: "#a1a1aa", fontSize: 13, fontWeight: "500" },
  activeNavTabText: { color: "#09090b", fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end", padding: 0 },
  modalContent: {
    backgroundColor: "#18181b",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: "#27272a",
    width: "100%",
  },
  desktopModalContent: {
    borderRadius: 24,
    maxWidth: 560,
    alignSelf: "center",
    width: "90%",
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3f3f46",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#f4f4f5" },
  modalSub: { fontSize: 14, color: "#a1a1aa", marginTop: 4 },
  modalSaveButton: { backgroundColor: "#f4f4f5", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  modalSaveText: { color: "#09090b", fontWeight: "bold" },
  trailerButton: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, backgroundColor: "rgba(239,68,68,0.15)", padding: 10, borderRadius: 10 },
});
