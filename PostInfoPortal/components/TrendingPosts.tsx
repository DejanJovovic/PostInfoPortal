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

type NewestPostsTickerProps = {
  posts: WPPost[];
  onPostPress?: (postId: number, categoryName: string) => void;
  loadingNav?: boolean;
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

const AUTO_ADVANCE_MS = 4000;
const MAX_NEWEST = 14;

export default function NewestPostsTicker({
  posts,
  onPostPress,
  loadingNav,
}: NewestPostsTickerProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const anim = useRef(new Animated.Value(0)).current;

  const newestPosts = useMemo(() => {
    const cleaned = (posts || []).filter((p) => p && p.date);
    const sorted = [...cleaned].sort((a, b) =>
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
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [anim, index, direction]);

  if (newestPosts.length === 0) return null;

  const current = newestPosts[index];
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [direction === 1 ? 16 : -16, 0],
  });

  const handlePrev = () => {
    setDirection(-1);
    setIndex((prev) => (prev - 1 + newestPosts.length) % newestPosts.length);
  };

  const handleNext = () => {
    setDirection(1);
    setIndex((prev) => (prev + 1) % newestPosts.length);
  };

  const handlePress = () => {
    if (!current || !onPostPress) return;
    onPostPress(current.id, deriveCategoryName(current) || "");
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.row,
          {
            backgroundColor: isDark ? "#1b1b1b" : "#ffffff",
            borderColor: isDark ? "#2a2a2a" : "#e6e6e6",
          },
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: isDark ? "#ffffff" : "#ffffff" },
          ]}
        >
          <Image
            source={require("../assets/icons/favicon_new.png")}
            style={styles.favicon}
            contentFit="contain"
          />
        </View>

        <TouchableOpacity
          style={styles.titleWrap}
          onPress={handlePress}
          disabled={loadingNav || !current}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ translateX }], opacity: anim }}>
            <Text
              style={[
                styles.titleText,
                { color: isDark ? colors.grey : colors.black },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {current?.title?.rendered || ""}
            </Text>
          </Animated.View>
        </TouchableOpacity>

        <View
          style={[
            styles.controls,
            { borderLeftColor: isDark ? "#2a2a2a" : "#e6e6e6" },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.controlButton,
              { borderLeftColor: isDark ? "#2a2a2a" : "#e6e6e6" },
            ]}
            onPress={handlePrev}
            disabled={newestPosts.length < 2}
            activeOpacity={0.7}
          >
            <Image
              source={require("../assets/icons/backArrow.png")}
              style={[
                styles.controlIcon,
                { tintColor: isDark ? "#ffffff" : "#000000" },
              ]}
              contentFit="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.controlButton,
              styles.controlButtonRight,
              { borderLeftColor: isDark ? "#2a2a2a" : "#e6e6e6" },
            ]}
            onPress={handleNext}
            disabled={newestPosts.length < 2}
            activeOpacity={0.7}
          >
            <Image
              source={require("../assets/icons/right-arrow.png")}
              style={[
                styles.controlIcon,
                { tintColor: isDark ? "#ffffff" : "#000000" },
              ]}
              contentFit="contain"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  iconWrap: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  favicon: {
    width: 26,
    height: 26,
  },
  titleWrap: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  titleText: {
    fontSize: 16,
    fontFamily: "Roboto-Bold",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 1,
  },
  controlButton: {
    width: 44,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
  },
  controlButtonRight: {},
  controlIcon: {
    width: 18,
    height: 18,
  },
});
