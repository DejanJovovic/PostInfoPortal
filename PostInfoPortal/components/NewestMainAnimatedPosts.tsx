import colors from "@/constants/colors";
import { WPPost } from "@/types/wp";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "./ThemeContext";

type NewestMainCarouselProps = {
  posts: WPPost[];
  onPostPress?: (postId: number, categoryName: string) => void;
  loadingNav?: boolean;
};

const AUTO_ADVANCE_MS = 4000;
const MAX_NEWEST = 4;

const getFirstImageFromContent = (html?: string) => {
  if (!html) return undefined;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : undefined;
};

const deriveCategoryName = (post: WPPost): string | undefined => {
  const groups = (post?._embedded as any)?.["wp:term"];
  if (Array.isArray(groups)) {
    const flat = groups.flat().filter(Boolean);
    const cat = flat.find((t: any) => t?.taxonomy === "category" && t?.name);
    if (cat?.name) return String(cat.name);
  }
  return undefined;
};

const getImg = (p: WPPost) => {
  const media = p?._embedded?.["wp:featuredmedia"]?.[0];
  if (media) {
    const sizes = media.media_details?.sizes;
    const featured =
      sizes?.medium?.source_url ||
      sizes?.medium_large?.source_url ||
      sizes?.large?.source_url ||
      media.source_url;
    if (featured) return featured;
  }
  const yoast = (p as any)?.yoast_head_json?.og_image?.[0]?.url;
  if (yoast) return String(yoast);
  return getFirstImageFromContent(p?.content?.rendered);
};

export default function NewestMainCarousel({
  posts,
  onPostPress,
  loadingNav,
}: NewestMainCarouselProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const anim = useRef(new Animated.Value(0)).current;

  const newestPosts = useMemo(() => {
    const cleaned = (posts || []).filter((p) => p && p.date);
    const withImages = cleaned.filter((p) => !!getImg(p));
    const base = withImages.length >= 2 ? withImages : cleaned;
    const sorted = [...base].sort((a, b) =>
      (b.date || "").localeCompare(a.date || ""),
    );
    return sorted.slice(0, MAX_NEWEST);
  }, [posts]);

  useEffect(() => {
    if (newestPosts.length < 2) return;
    const id = setInterval(() => {
      setDirection(1);
      setIndex((prev) => (prev + 1) % newestPosts.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [newestPosts.length]);

  useEffect(() => {
    if (index >= newestPosts.length) setIndex(0);
  }, [index, newestPosts.length]);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [anim, index, direction]);

  if (newestPosts.length === 0) return null;

  const current = newestPosts[index];
  const image = current ? getImg(current) : undefined;
  const date = current?.date
    ? new Date(current.date).toLocaleDateString("sr-RS")
    : "";
  const categoryLabel =
    index === 0
      ? "GLAVNA VEST"
      : (deriveCategoryName(current) || "").toUpperCase();
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [direction === 1 ? 18 : -18, 0],
  });

  const handlePrev = () => {
    setDirection(-1);
    setIndex((prev) => (prev - 1 + newestPosts.length) % newestPosts.length);
  };

  const handleNext = () => {
    setDirection(1);
    setIndex((prev) => (prev + 1) % newestPosts.length);
  };

  const handlePress = (post: WPPost) => {
    if (!onPostPress || loadingNav) return;
    onPostPress(post.id, deriveCategoryName(post) || "");
  };

  const fallbackThumb =
    image || newestPosts.map((post) => getImg(post)).find(Boolean);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          { backgroundColor: isDark ? "#1b1b1b" : "#ffffff" },
        ]}
      >
        <View style={styles.mainImageWrap}>
          <TouchableOpacity
            onPress={() => current && handlePress(current)}
            disabled={!current || loadingNav}
            activeOpacity={0.85}
          >
            {image ? (
              <Image
                source={{ uri: image }}
                style={styles.mainImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.mainImageFallback} />
            )}
            <View style={styles.mainOverlay}>
              {categoryLabel.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{categoryLabel}</Text>
                </View>
              )}
              <Animated.View
                style={{ transform: [{ translateX }], opacity: anim }}
              >
                <Text style={styles.mainTitle} numberOfLines={3}>
                  {current?.title?.rendered || ""}
                </Text>
              </Animated.View>
              <Text style={styles.dateText}>{date}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.arrowStack}>
            <TouchableOpacity
              style={styles.arrowButtonPrimary}
              onPress={handleNext}
              disabled={newestPosts.length < 2}
              activeOpacity={0.75}
            >
              <Image
                source={require("../assets/icons/right-arrow.png")}
                style={[styles.arrowIcon, styles.arrowIconLight]}
                contentFit="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.arrowButtonSecondary}
              onPress={handlePrev}
              disabled={newestPosts.length < 2}
              activeOpacity={0.75}
            >
              <Image
                source={require("../assets/icons/backArrow.png")}
                style={[styles.arrowIcon, styles.arrowIconRed]}
                contentFit="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.thumbRow}>
        {newestPosts.map((post, idx) => {
          const thumb = getImg(post) || fallbackThumb;
          if (!thumb) return null;
          const isActive = idx === index;
          return (
            <View key={post.id} style={styles.thumbItem}>
              <TouchableOpacity
                style={styles.thumbTouchable}
                onPress={() => {
                  if (idx === index) {
                    handlePress(post);
                    return;
                  }
                  setDirection(idx >= index ? 1 : -1);
                  setIndex(idx);
                }}
                disabled={loadingNav}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: thumb }}
                  style={styles.thumbImage}
                  contentFit="cover"
                />
              </TouchableOpacity>
              {isActive && <View style={styles.thumbPointer} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },
  mainImageWrap: {
    position: "relative",
  },
  mainImage: {
    width: "100%",
    height: 220,
  },
  mainImageFallback: {
    width: "100%",
    height: 220,
    backgroundColor: "#1b1b1b",
  },
  mainOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#0f1b2d",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 8,
  },
  badgeText: {
    color: "#ffffff",
    fontFamily: "Roboto-Bold",
    fontSize: 12,
    letterSpacing: 0.8,
  },
  mainTitle: {
    color: "#ffffff",
    fontFamily: "Roboto-ExtraBold",
    fontSize: 20,
    lineHeight: 26,
  },
  dateText: {
    color: "#ffffff",
    fontFamily: "Roboto-Medium",
    marginTop: 6,
  },
  arrowStack: {
    position: "absolute",
    right: 12,
    bottom: 16,
  },
  arrowButtonPrimary: {
    width: 46,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.red,
  },
  arrowButtonSecondary: {
    width: 46,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    marginTop: 8,
  },
  arrowIcon: {
    width: 16,
    height: 16,
  },
  arrowIconLight: {
    tintColor: "#ffffff",
  },
  arrowIconRed: {
    tintColor: colors.red,
  },
  thumbRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 10,
    marginBottom: 6,
  },
  thumbItem: {
    width: "24%",
    alignItems: "center",
    position: "relative",
  },
  thumbImage: {
    width: "100%",
    height: 62,
    borderRadius: 6,
    backgroundColor: "#f2f2f2",
    marginTop: 8,
  },
  thumbTouchable: {
    width: "100%",
  },
  thumbPointer: {
    width: 0,
    height: 0,
    position: "absolute",
    top: 0,
    left: "50%",
    marginLeft: -8,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#ffffff",
  },
});
