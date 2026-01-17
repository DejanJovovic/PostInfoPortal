import { useTheme } from "@/components/ThemeContext";
import colors from "@/constants/colors";
import { menuData } from "@/types/menuData";
import React, { useEffect, useRef } from "react";
import {
  findNodeHandle,
  View as RNView,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

type Props = {
  onSelectCategory: (categoryName: string) => void;
  activeCategory: string;
  extraCategories?: string[];
};

const CustomMenuCategories: React.FC<Props> = ({
  onSelectCategory,
  activeCategory,
  extraCategories,
}) => {
  const baseCategories = menuData
    .map((item) => (typeof item === "string" ? item : item.title))
    .filter((category) => category !== "Latin | Ćirilica");

  const available = new Set([
    ...(baseCategories || []),
    ...((extraCategories as string[] | undefined) || []),
  ]);

  const societyLabel = available.has("Društvo")
    ? "Društvo"
    : available.has("Drustvo")
      ? "Drustvo"
      : undefined;

  const categories = [
    "Naslovna",
    "Danas",
    "Politika",
    "Svet",
    "Crna hronika",
    "Ekonomija",
    societyLabel,
    "Sport",
    "Lokal",
    "Region",
  ].filter(
    (category): category is string => !!category && available.has(category),
  );

  const scrollViewRef = useRef<ScrollView>(null);
  const categoryRefs = useRef<Record<string, RNView | null>>({});

  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const node = categoryRefs.current[activeCategory];
    const scrollNode = scrollViewRef.current;

    if (node && scrollNode) {
      const handle = findNodeHandle(node);
      const scrollHandle = findNodeHandle(scrollNode);

      if (handle && scrollHandle) {
        UIManager.measureLayout(
          handle,
          scrollHandle,
          () => console.warn("Greška pri pomeranju na kategoriju."),
          (x: number) => {
            scrollNode.scrollTo({ x: x - 16, animated: true });
          },
        );
      }
    }
  }, [activeCategory]);

  return (
    <View
      className="h-[60px] w-full"
      style={{ backgroundColor: isDark ? colors.black : colors.grey }}
    >
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={{ paddingHorizontal: 16, alignItems: "center" }}
        className="flex-row"
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            onPress={() => onSelectCategory(category)}
            className="mr-4"
            ref={(el: RNView | null) => {
              categoryRefs.current[category] = el;
            }}
          >
            <Text
              className={`uppercase ${
                activeCategory === category
                  ? "text-[#FA0A0F]"
                  : isDark
                    ? "text-[#F9F9F9]"
                    : "text-black"
              }`}
              style={{ fontFamily: "Roboto-Bold", fontSize: 20 }}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default CustomMenuCategories;
