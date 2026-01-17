import { WPPost } from "@/types/wp";
import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function DailyStoriesModal({
  visible,
  posts,
  onClose,
}: {
  visible: boolean;
  posts: WPPost[];
  onClose: () => void;
}) {
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      clearTimer();
      setIndex(0);
      return;
    }
    scheduleAdvance(0);
    return () => clearTimer();
  }, [visible, posts]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const scheduleAdvance = (currentIndex: number) => {
    clearTimer();
    const isLast = currentIndex >= posts.length - 1;
    const delay = isLast ? 3000 : 3500;
    timerRef.current = setTimeout(() => {
      if (isLast) {
        onClose();
        return;
      }
      const next = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setIndex(next);
      scheduleAdvance(next);
    }, delay);
  };

  const onScrollEnd = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(x / width);
    setIndex(newIndex);
    scheduleAdvance(newIndex);
  };

  if (!posts || posts.length === 0) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={styles.container}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={true}
          onMomentumScrollEnd={onScrollEnd}
        >
          {posts.map((p, i) => {
            const media = p._embedded?.["wp:featuredmedia"]?.[0];
            const sizes = media?.media_details?.sizes;
            const imgUrl =
              sizes?.large?.source_url ||
              sizes?.medium_large?.source_url ||
              media?.source_url;

            const excerpt = (p.excerpt?.rendered || "").replace(/<[^>]+>/g, "");

            return (
              <View key={p.id} style={{ width, height }}>
                <Image
                  source={{
                    uri: imgUrl || "https://via.placeholder.com/800x600",
                  }}
                  style={[styles.image, { height: height }]}
                  contentFit="cover"
                />

                <View style={styles.bottom} pointerEvents="box-none">
                  <Text style={styles.title} numberOfLines={2}>
                    {p.title?.rendered}
                  </Text>
                  <Text style={styles.excerpt} numberOfLines={2}>
                    {excerpt}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.indicator} pointerEvents="none">
          <Text style={styles.indicatorText}>◀︎ ▶︎</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  image: {
    width: width,
    height: height,
    position: "absolute",
    top: 0,
    left: 0,
  },
  bottom: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 56,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Roboto-ExtraBold",
    marginBottom: 6,
  },
  excerpt: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Roboto-Light",
  },
  closeBtn: {
    position: "absolute",
    top: 40,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    padding: 8,
  },
  closeText: { color: "#fff", fontSize: 18 },
  indicator: {
    position: "absolute",
    top: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  indicatorText: {
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 14,
    fontFamily: "Roboto-Medium",
  },
});
