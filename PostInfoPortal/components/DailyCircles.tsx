import colors from "@/constants/colors";
import { WPPost } from "@/types/wp";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DailyStoriesModal from "./DailyStoriesModal";
import { useTheme } from "./ThemeContext";

const formatDateKey = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

export default function DailyCircles({ posts }: { posts: WPPost[] }) {
  const [modalPosts, setModalPosts] = useState<WPPost[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [todayKey, setTodayKey] = useState(() => formatDateKey(new Date()));

  useEffect(() => {
    const checkDate = () => {
      const k = formatDateKey(new Date());
      if (k !== todayKey) setTodayKey(k);
    };
    const id = setInterval(checkDate, 60 * 1000);
    return () => clearInterval(id);
  }, [todayKey]);

  const lastDays = useMemo(() => {
    const arr: string[] = [];
    const parts = todayKey.split(".");
    const base = new Date(
      Number(parts[2]),
      Number(parts[1]) - 1,
      Number(parts[0]),
    );
    for (let i = 0; i < 6; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      arr.push(formatDateKey(d));
    }
    return arr;
  }, [todayKey]);

  const groups = useMemo(() => {
    const map: Record<string, WPPost[]> = {};
    for (const p of posts || []) {
      const d = new Date(p.date);
      const key = formatDateKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }

    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => +new Date(b.date) - +new Date(a.date));
      map[k] = map[k].slice(0, 5);
    }
    return map;
  }, [posts]);

  const circleItems = lastDays.map((key) => {
    const arr = groups[key] || [];
    return {
      key,
      posts: arr,
    };
  });

  const openFor = (items: WPPost[]) => {
    setModalPosts(items);
    setModalVisible(true);
  };

  if (circleItems.length === 0) return null;

  return (
    <View style={{ paddingVertical: 12 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {circleItems.map((c) => {
          const newest = c.posts[0];
          const media = newest?._embedded?.["wp:featuredmedia"]?.[0];
          const sizes = media?.media_details?.sizes;
          const imgUrl =
            sizes?.medium?.source_url ||
            sizes?.medium_large?.source_url ||
            media?.source_url;

          const dParts = c.key.split(".");
          const dd = dParts[0];
          const mm = dParts[1];

          return (
            <View key={c.key} style={{ alignItems: "center", marginRight: 18 }}>
              <TouchableOpacity
                onPress={() => openFor(c.posts)}
                disabled={!newest}
              >
                <View style={styles.circleWrap}>
                  <Image
                    source={{
                      uri:
                        imgUrl ||
                        "https://via.placeholder.com/300x300?text=" +
                          encodeURIComponent(c.key.split(".")[0] + "."),
                    }}
                    style={[
                      styles.circleImage,
                      !newest ? { opacity: 0.35 } : {},
                    ]}
                    contentFit="cover"
                  />
                </View>
              </TouchableOpacity>
              <Text
                style={[
                  styles.dateText,
                  { color: isDark ? colors.grey : colors.black },
                ]}
              >{`${dd}.${mm}.`}</Text>
            </View>
          );
        })}
      </ScrollView>

      <DailyStoriesModal
        visible={modalVisible}
        posts={modalPosts}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  circleWrap: {
    width: 106,
    height: 106,
    borderRadius: 106 / 2,
    borderWidth: 4,
    borderColor: colors.red,
    padding: 4,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  circleImage: {
    width: 86,
    height: 86,
    borderRadius: 86 / 2,
  },
  dateText: {
    marginTop: 8,
    fontSize: 20,
    fontFamily: "Roboto-Bold",
    color: colors.black,
    textAlign: "center",
  },
});
