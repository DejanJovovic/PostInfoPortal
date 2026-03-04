import BottomAdBanner from "@/components/BottomAdBanner";
import CustomFooter from "@/components/CustomFooter";
import CustomHeader from "@/components/CustomHeader";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useTheme } from "@/components/ThemeContext";
import { pickRandomAd } from "@/constants/ads";
import colors from "@/constants/colors";
import icons from "@/constants/icons";
import { cleanWpRenderedText, getPostTitleText } from "@/hooks/postsUtils";
import { WPPost } from "@/types/wp";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FavoritePost = WPPost & { category: string };

const Favorites = () => {
  const [groupedFavorites, setGroupedFavorites] = useState<
    Record<string, WPPost[]>
  >({});
  const activeCategory = "Naslovna";
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const closeButtonBorderColor = isDark ? "#6b7280" : "#9ca3af";

  const loadFavorites = async () => {
    const saved = await AsyncStorage.getItem("favorites");
    if (!saved) {
      setGroupedFavorites({});
      return;
    }

    const parsed: FavoritePost[] = JSON.parse(saved);
    const grouped: Record<string, WPPost[]> = {};
    for (const post of parsed) {
      if (!grouped[post.category]) grouped[post.category] = [];
      grouped[post.category].push(post);
    }
    setGroupedFavorites(grouped);
  };

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
    scheduleAd(10000);
  };

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, []),
  );

  useEffect(() => {
    scheduleAd(5000);
    return () => clearAdTimer();
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("blur", () => setIsLoading(false));
    return unsub;
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  }, []);

  const handleBackWithLoading = () => {
    if (isLoading) return;
    setIsLoading(true);
    requestAnimationFrame(() => {
      router.back();
    });
  };

  const goToPost = (postId: number, category?: string) => {
    if (isLoading) return;
    setIsLoading(true);
    requestAnimationFrame(() => {
      router.push({
        pathname: "/post-details",
        params: {
          postId: String(postId),
          category: category || activeCategory,
        },
      });
    });
  };

  const removePost = (postId: number) => {
    Alert.alert(
      "Brisanje objave",
      "Da li ste sigurni da želite da obrišete ovu objavu iz omiljenih?",
      [
        { text: "Ne", style: "cancel" },
        {
          text: "Da",
          style: "destructive",
          onPress: async () => {
            const saved = await AsyncStorage.getItem("favorites");
            if (!saved) return;
            let parsed: FavoritePost[] = JSON.parse(saved);
            parsed = parsed.filter((p) => p.id !== postId);
            await AsyncStorage.setItem("favorites", JSON.stringify(parsed));
            loadFavorites();
          },
        },
      ],
    );
  };

  const removeCategory = (category: string) => {
    Alert.alert(
      "Brisanje kategorije",
      "Da li ste sigurni da želite da obrišete ovu kategoriju iz omiljenih?",
      [
        { text: "Ne", style: "cancel" },
        {
          text: "Da",
          style: "destructive",
          onPress: async () => {
            const saved = await AsyncStorage.getItem("favorites");
            if (!saved) return;
            let parsed: FavoritePost[] = JSON.parse(saved);
            parsed = parsed.filter((p) => p.category !== category);
            await AsyncStorage.setItem("favorites", JSON.stringify(parsed));
            loadFavorites();
          },
        },
      ],
    );
  };

  const renderPost = ({ item }: { item: WPPost }) => {
    const image = item._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
    const date = new Date(item.date).toLocaleDateString("sr-RS");
    const excerpt = cleanWpRenderedText(item.excerpt?.rendered);
    const meta = date;

    return (
      <View className="w-[260px] mr-3">
        <View
          className="rounded-2xl p-3 border"
          style={{
            backgroundColor: isDark ? colors.black : colors.grey,
            borderColor: isDark ? "#525050" : "#e5e7eb",
            height: 250,
            overflow: "hidden",
            ...(Platform.OS === "ios"
              ? {
                  shadowColor: "transparent",
                  shadowOpacity: 0,
                  shadowRadius: 0,
                  shadowOffset: { width: 0, height: 0 },
                }
              : {
                  elevation: 0,
                }),
          }}
        >
          <TouchableOpacity
            onPress={() =>
              goToPost(
                item.id,
                (item as FavoritePost).category || activeCategory,
              )
            }
            disabled={isLoading}
          >
            {image && (
              <Image
                source={{ uri: image }}
                className="w-full h-[110px] rounded-xl mb-2"
                resizeMode="cover"
              />
            )}
            <View>
              <Text
                numberOfLines={2}
                className="mb-1"
                style={{
                  color: isDark ? colors.grey : colors.black,
                  fontFamily: "Roboto-ExtraBold",
                }}
              >
                {getPostTitleText(item)}
              </Text>
            </View>

            <View className="flex-row justify-between items-center mb-1">
              <Text
                className="text-xs mt-1 mb-1"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  color: colors.darkerGray,
                  fontSize: 12,
                  flex: 1,
                  flexShrink: 1,
                  marginRight: 8,
                }}
              >
                {meta}
              </Text>
              <TouchableOpacity
                onPress={() => removePost(item.id)}
                disabled={isLoading}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: closeButtonBorderColor,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  source={icons.close}
                  style={{
                    width: 8,
                    height: 8,
                    tintColor: isDark ? colors.grey : colors.black,
                  }}
                />
              </TouchableOpacity>
            </View>

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
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: isDark ? colors.black : colors.grey }}
    >
      <CustomHeader
        onCategorySelected={() => {}}
        activeCategory={activeCategory}
        onMenuToggle={setMenuOpen}
        onBackPress={handleBackWithLoading}
        loadingNav={isLoading}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        className="px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {Object.entries(groupedFavorites).length === 0 ? (
          <Text
            className="text-center mt-10"
            style={{
              color: isDark ? colors.grey : colors.black,
              fontFamily: "Roboto-Regular",
            }}
          >
            Nema sačuvanih omiljenih objava.
          </Text>
        ) : (
          Object.entries(groupedFavorites).map(([category, posts]) => (
            <View key={category} className="mb-6">
              <View className="flex-row items-center justify-between mt-5 mb-3">
                <Text
                  className="text-xl"
                  style={{
                    fontSize: 24,
                    color: isDark ? colors.grey : colors.black,
                    fontFamily: "Roboto-Bold",
                  }}
                >
                  {category}
                </Text>
                <TouchableOpacity
                  onPress={() => removeCategory(category)}
                  disabled={isLoading}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: closeButtonBorderColor,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image
                    source={icons.close}
                    style={{
                      width: 8,
                      height: 8,
                      tintColor: isDark ? colors.grey : colors.black,
                    }}
                  />
                </TouchableOpacity>
              </View>

              <FlatList
                data={posts}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderPost}
                scrollEnabled={!isLoading}
              />

              <View
                className="h-[1px] mt-5"
                style={{ backgroundColor: isDark ? colors.grey : colors.black }}
              />
            </View>
          ))
        )}
      </ScrollView>

      {isLoading && <LoadingOverlay isDark={isDark} message="Učitavanje..." />}

      {!menuOpen && <CustomFooter />}

      <BottomAdBanner
        visible={bottomAdVisible && !menuOpen}
        ad={bottomAd}
        onClose={dismissBottomAd}
      />
    </SafeAreaView>
  );
};

export default Favorites;
