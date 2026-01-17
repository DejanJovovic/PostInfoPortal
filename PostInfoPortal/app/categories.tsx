import BottomAdBanner from "@/components/BottomAdBanner";
import CustomCategoryFilter from "@/components/CustomCategoryFilter";
import CustomFooter from "@/components/CustomFooter";
import CustomHeader from "@/components/CustomHeader";
import CustomSearchBar from "@/components/CustomSearchBar";
import LoadingOverlay from "@/components/LoadingOverlay";
import SearchHeader from "@/components/SearchHeader";
import { useTheme } from "@/components/ThemeContext";
import { pickRandomAd } from "@/constants/ads";
import colors from "@/constants/colors";
import { usePostsByCategory } from "@/hooks/usePostsByCategory";
import { WPPost } from "@/types/wp";
import { router, useNavigation } from "expo-router";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PAGE_SIZE = 5;
const ALL_EXCLUDE = new Set(["Naslovna", "Danas"]);
const months = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Jun",
  "Jul",
  "Avgust",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

const Categories = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { groupedPosts, posts, fetchPostsForCategory } = usePostsByCategory();

  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [filteredPosts, setFilteredPosts] = useState<WPPost[]>([]);
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<{
    month?: number;
    year?: number;
  }>({});
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [triggerSearchOpen, setTriggerSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [globalSort, setGlobalSort] = useState<"desc" | "asc">("desc");

  const [bottomAdVisible, setBottomAdVisible] = useState(false);
  const [bottomAd, setBottomAd] = useState(() => pickRandomAd());

  const adTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAdTimer = () => {
    if (adTimerRef.current) {
      clearTimeout(adTimerRef.current);
      adTimerRef.current = null;
    }
  };

  const scheduleAd = (ms: number) => {
    clearAdTimer();
    adTimerRef.current = setTimeout(() => {
      setBottomAd(pickRandomAd());
      setBottomAdVisible(true);
    }, ms);
  };

  const dismissBottomAd = () => {
    setBottomAdVisible(false);
    scheduleAd(15000);
  };

  useEffect(() => {
    scheduleAd(10000);
    return () => clearAdTimer();
  }, []);

  const uniqueById = (arr: WPPost[]) => {
    const map: Record<number, WPPost> = {};
    for (const p of arr || []) map[p.id] = p;
    return Object.values(map);
  };

  const flattenAllPosts = (groups: Record<string, WPPost[]>) => {
    const merged = Object.entries(groups)
      .filter(([k]) => !ALL_EXCLUDE.has(k))
      .flatMap(([, arr]) => arr || []);
    const unique = uniqueById(merged);
    return unique.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  };

  const basePosts = useMemo(() => {
    if (selectedCategory) {
      const unique = uniqueById(posts || []);
      return unique.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    }
    return flattenAllPosts(groupedPosts);
  }, [selectedCategory, posts, groupedPosts]);

  const activeDataset = useMemo(() => {
    return isFilterApplied ? filteredPosts : basePosts;
  }, [isFilterApplied, filteredPosts, basePosts]);

  const sortedActiveDataset = useMemo(() => {
    const arr = [...activeDataset];
    if (globalSort === "asc") {
      return arr.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    }
    return arr.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [activeDataset, globalSort]);

  const visibleData = useMemo(() => {
    return sortedActiveDataset.slice(0, visibleCount);
  }, [sortedActiveDataset, visibleCount]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [
    selectedCategory,
    isFilterApplied,
    selectedDate.month,
    selectedDate.year,
    groupedPosts,
  ]);

  useEffect(() => {
    const unsub = navigation.addListener("blur", () => setIsLoading(false));
    return unsub;
  }, [navigation]);

  const toggleGlobalSort = () => {
    setGlobalSort((prev) => (prev === "desc" ? "asc" : "desc"));
    setVisibleCount(PAGE_SIZE); // reset
  };

  const searchFromActive = (query: string): WPPost[] => {
    const q = query.toLowerCase().trim();
    if (!q) return activeDataset;
    return activeDataset.filter((p) =>
      p.title.rendered.toLowerCase().includes(q),
    );
  };

  const searchResults = useMemo(() => {
    if (!isSearchActive) return [];
    const res = searchFromActive(searchQuery);
    return [...res].sort((a, b) =>
      globalSort === "asc"
        ? (a.date || "").localeCompare(b.date || "")
        : (b.date || "").localeCompare(a.date || ""),
    );
  }, [isSearchActive, searchQuery, activeDataset, globalSort]);

  const animationRefs = useRef<Animated.Value[]>([]);
  const listForAnimations = isSearchActive ? searchResults : visibleData;

  useEffect(() => {
    animationRefs.current = listForAnimations.map(() => new Animated.Value(0));
    const anims = animationRefs.current.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    );
    Animated.stagger(80, anims).start();
  }, [listForAnimations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSelectedDate({});
    setIsFilterApplied(false);
    setFilteredPosts([]);
    setSearchQuery("");
    setIsSearchActive(false);
    setVisibleCount(PAGE_SIZE);

    if (selectedCategory) {
      setIsCategoryLoading(true);
      fetchPostsForCategory(selectedCategory).finally(() => {
        setIsCategoryLoading(false);
        setRefreshing(false);
      });
    } else {
      setRefreshing(false);
    }
  }, [selectedCategory, fetchPostsForCategory]);

  const handleFooterSearch = () => {
    setSearchQuery("");
    setIsSearchActive(true);
    setTriggerSearchOpen(true);
  };

  const handleBackWithLoading = () => {
    if (isLoading) return;
    setIsLoading(true);
    requestAnimationFrame(() => {
      router.back();
    });
  };

  const goToPost = (postId: number) => {
    if (isLoading) return;
    setIsLoading(true);
    requestAnimationFrame(() => {
      router.push({
        pathname: "/post-details",
        params: { postId: String(postId), category: selectedCategory || "" },
      });
    });
  };

  const highlightSearchTerm = (text: string, term: string) => {
    if (!term)
      return (
        <Text
          className="mb-1"
          style={{
            color: isDark ? colors.grey : colors.black,
            fontFamily: "Roboto-ExtraBold",
          }}
        >
          {text}
        </Text>
      );
    const parts = text.split(new RegExp(`(${term})`, "gi"));
    return (
      <Text
        className="mb-1"
        style={{
          color: isDark ? colors.grey : colors.black,
          fontFamily: "Roboto-ExtraBold",
        }}
      >
        {parts.map((part, i) => (
          <Text
            key={`${part}-${i}`}
            className={
              part.toLowerCase() === term.toLowerCase() ? "text-[#FA0A0F]" : ""
            }
          >
            {part}
          </Text>
        ))}
      </Text>
    );
  };

  const renderItem = useCallback(
    ({ item, index }: { item: WPPost; index: number }) => {
      const animVal = animationRefs.current[index] || new Animated.Value(1);
      const animStyle = {
        opacity: animVal,
        transform: [
          {
            translateY: animVal.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            }),
          },
        ],
      };

      const image = item._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
      const date = new Date(item.date).toLocaleDateString("sr-RS");
      const excerpt = item.excerpt?.rendered.replace(/<[^>]+>/g, "");

      return (
        <Animated.View style={animStyle}>
          <TouchableOpacity
            onPress={() => goToPost(item.id)}
            disabled={isLoading}
          >
            <View
              className="rounded-2xl shadow-md mb-6 mx-3 p-4 border"
              style={{
                backgroundColor: isDark ? colors.black : colors.grey,
                borderColor: isDark ? "#525050" : "#e5e7eb",
              }}
            >
              {image && (
                <View className="mb-3">
                  <Animated.Image
                    source={{ uri: image }}
                    className="w-full h-48 rounded-xl"
                    resizeMode="cover"
                  />
                </View>
              )}
              {highlightSearchTerm(item.title.rendered, searchQuery)}
              <Text
                className="text-xs mt-1 mb-1"
                style={{
                  color: colors.darkerGray,
                  fontSize: 12,
                }}
              >
                {date}
              </Text>
              <Text
                className="text-sm"
                numberOfLines={3}
                style={{
                  color: isDark ? colors.grey : colors.black,
                  fontFamily: "Roboto-Light",
                }}
              >
                {excerpt}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [isDark, searchQuery, selectedCategory],
  );

  const loadMore = () => {
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, sortedActiveDataset.length));
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: isDark ? colors.black : colors.grey }}
    >
      <CustomHeader
        showMenu={false}
        activeCategory=""
        onCategorySelected={() => {}}
        onMenuToggle={(visible) => {
          setTriggerSearchOpen(visible);
          if (!visible) setTriggerSearchOpen(false);
        }}
        onSearchQuery={setSearchQuery}
        triggerSearchOpen={triggerSearchOpen}
        onBackPress={handleBackWithLoading}
        loadingNav={isLoading}
      />

      {isSearchActive && (
        <SearchHeader
          isDark={isDark}
          labelClassName="mt-2 px-2"
          label={
            searchQuery.trim().length > 0 ? (
              <>
                Rezultati pretrage{" "}
                <Text
                  style={{
                    color: colors.red,
                    fontFamily: "Roboto-Bold",
                  }}
                >
                  &#34;{searchQuery}&#34;
                </Text>
              </>
            ) : (
              "Unesite željenu reč za pretragu ispod"
            )
          }
          rightAction={
            searchQuery.trim().length > 0 ? (
              <Text
                onPress={() => {
                  setSearchQuery("");
                  setIsSearchActive(false);
                }}
                className="mr-3"
                style={{ color: colors.red }}
              >
                ✕
              </Text>
            ) : null
          }
          searchBar={
            <CustomSearchBar
              key={searchQuery}
              query={searchQuery}
              onSearch={setSearchQuery}
              onReset={() => {
                setSearchQuery("");
                setIsSearchActive(false);
              }}
              backgroundColor={colors.blue}
            />
          }
        />
      )}

      {isSearchActive ? (
        <FlatList
          data={searchResults}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            !isCategoryLoading ? (
              <View className="px-4 mt-10">
                <Text
                  className="text-center"
                  style={{
                    color: isDark ? colors.grey : colors.black,
                    fontFamily: "Roboto-Regular",
                  }}
                >
                  Nema rezultata za prikaz.
                </Text>
              </View>
            ) : null
          }
          removeClippedSubviews
          initialNumToRender={5}
          maxToRenderPerBatch={8}
          windowSize={7}
        />
      ) : (
        <FlatList
          pointerEvents={isCategoryLoading ? "none" : "auto"}
          data={visibleData}
          ListHeaderComponent={() => (
            <>
              <CustomCategoryFilter
                selectedCategory={selectedCategory}
                onCategorySelect={(cat) => {
                  if (cat === "Latin | Ćirilica" || cat === selectedCategory)
                    return;

                  setSelectedCategory(cat);
                  setIsFilterApplied(false);
                  setFilteredPosts([]);
                  setSelectedDate({});
                  setSearchQuery("");
                  setIsSearchActive(false);
                  setIsCategoryLoading(true);
                  fetchPostsForCategory(cat).finally(() =>
                    setIsCategoryLoading(false),
                  );
                }}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                groupedPostsCache={groupedPosts}
                filteredPosts={filteredPosts}
                setFilteredPosts={(posts) => {
                  setVisibleCount(PAGE_SIZE);
                  setFilteredPosts(uniqueById(posts));
                }}
                isFilterApplied={isFilterApplied}
                setIsFilterApplied={(v) => {
                  setVisibleCount(PAGE_SIZE);
                  setIsFilterApplied(v);
                }}
              />

              <View className="flex-row justify-end items-center mb-3 pr-4">
                <TouchableOpacity
                  onPress={toggleGlobalSort}
                  className="flex-row items-center"
                >
                  <Text
                    className="mr-1"
                    style={{
                      color: isDark ? colors.grey : colors.black,
                      fontFamily: "YesevaOne-Regular",
                    }}
                  >
                    {globalSort === "desc" ? "Najnoviji" : "Najstariji"}
                  </Text>
                  {globalSort === "desc" ? (
                    <ChevronDown
                      size={18}
                      color={isDark ? colors.grey : colors.black}
                    />
                  ) : (
                    <ChevronUp
                      size={18}
                      color={isDark ? colors.grey : colors.black}
                    />
                  )}
                </TouchableOpacity>
              </View>

              {isFilterApplied && selectedDate.month && selectedDate.year && (
                <View className="px-4 mb-3">
                  <Text
                    className="text-center"
                    style={{
                      color: isDark ? colors.grey : colors.black,
                      fontFamily: "Roboto-Medium",
                    }}
                  >
                    {filteredPosts.length > 0 ? (
                      <>
                        Rezultati pretrage za{" "}
                        <Text
                          style={{
                            color: colors.red,
                            fontFamily: "Roboto-Bold",
                          }}
                        >
                          {selectedCategory || "sve kategorije"}
                        </Text>{" "}
                        za{" "}
                        <Text
                          style={{
                            color: colors.red,
                            fontFamily: "Roboto-Bold",
                          }}
                        >
                          {(
                            months?.[selectedDate?.month - 1] ?? ""
                          ).toLowerCase()}
                        </Text>{" "}
                        <Text
                          style={{
                            color: colors.red,
                            fontFamily: "Roboto-Bold",
                          }}
                        >
                          {selectedDate?.year}
                        </Text>
                        .
                      </>
                    ) : (
                      "Nema rezultata za izabrane filtere."
                    )}
                  </Text>
                </View>
              )}

              {selectedCategory &&
                !isFilterApplied &&
                !isCategoryLoading &&
                visibleData.length > 0 && (
                  <View className="px-4 mb-3">
                    <Text
                      className="text-center"
                      style={{
                        color: isDark ? colors.grey : colors.black,
                        fontFamily: "Roboto-Medium",
                      }}
                    >
                      Prikazuju se objave za kategoriju:{" "}
                      <Text
                        style={{ fontFamily: "Roboto-Bold", color: colors.red }}
                      >
                        {selectedCategory}
                      </Text>
                    </Text>
                  </View>
                )}
            </>
          )}
          ListFooterComponent={
            sortedActiveDataset.length > visibleData.length ? (
              <View className="px-4 mt-2 mb-16">
                <TouchableOpacity
                  onPress={loadMore}
                  className="rounded-xl py-3"
                  style={{ backgroundColor: colors.blue }}
                >
                  <View className="flex-row items-center justify-center">
                    <Text
                      className="mr-2 text-center"
                      style={{
                        color: isDark ? colors.grey : colors.black,
                        fontFamily: "Roboto-Bold",
                      }}
                    >
                      Prikaži još
                    </Text>
                    <ChevronDown
                      color={isDark ? colors.grey : colors.black}
                      size={18}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            ) : null
          }
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            !isCategoryLoading && sortedActiveDataset.length === 0 ? (
              <View className="px-4 mt-10">
                <Text
                  className="text-base text-center"
                  style={{
                    color: isDark ? colors.grey : colors.black,
                    fontFamily: "Roboto-Regular",
                  }}
                >
                  Nema rezultata za prikaz.
                </Text>
              </View>
            ) : null
          }
          removeClippedSubviews
          initialNumToRender={5}
          maxToRenderPerBatch={8}
          windowSize={7}
        />
      )}
      {(isCategoryLoading || isLoading) && (
        <LoadingOverlay isDark={isDark} message="Učitavanje..." />
      )}

      <CustomFooter onSearchPress={handleFooterSearch} />

      <BottomAdBanner
        visible={bottomAdVisible}
        ad={bottomAd}
        onClose={dismissBottomAd}
      />
    </SafeAreaView>
  );
};

export default Categories;
