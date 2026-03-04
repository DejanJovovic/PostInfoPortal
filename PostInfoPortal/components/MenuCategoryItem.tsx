import { useTheme } from "@/components/ThemeContext";
import colors from "@/constants/colors";
import icons from "@/constants/icons";
import React, { useEffect, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

type CategoryItem = {
  title: string;
  children?: (CategoryItem | string)[];
};

type MenuCategoryItemProps = {
  item: CategoryItem | string;
  level?: number;
  onPress?: (title: string) => void;
  activeCategory?: string;
  rootParent?: string;
};

const MenuCategoryItem: React.FC<MenuCategoryItemProps> = ({
  item,
  level = 0,
  onPress,
  activeCategory,
  rootParent,
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const [expanded, setExpanded] = useState(false);

  const hasChildren = typeof item === "object" && item.children;
  const title = typeof item === "string" ? item : item.title;
  const isActive = title === activeCategory;

  const topLevelColor = isDarkMode ? colors.grey : colors.black;
  const subLevelColor = isDarkMode ? "#d1d5db" : "#4b5563";
  const chevronColor = isDarkMode ? "#d1d5db" : "#4b5563";
  const lokalDividerColor = isDarkMode ? "#374151" : "#d1d5db";

  const hasActiveSubCategory = (
    children: (CategoryItem | string)[],
  ): boolean => {
    return children.some((child) => {
      if (typeof child === "string") {
        return child === activeCategory;
      }
      if (child.title === activeCategory) return true;
      if (child.children) {
        return hasActiveSubCategory(child.children);
      }
      return false;
    });
  };

  useEffect(() => {
    if (hasChildren && item.children && hasActiveSubCategory(item.children)) {
      setExpanded(true);
    }
  }, [activeCategory, hasChildren, item]);

  const handleCategoryPress = () => {
    if (title !== "Latin | Ćirilica") {
      onPress?.(title);
    }
  };

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <View>
      <View className="flex-row items-center justify-between px-4 py-2">
        <TouchableOpacity onPress={handleCategoryPress} className="flex-1">
          <Text
            style={{
              color: isActive
                ? colors.red
                : level === 0
                  ? topLevelColor
                  : subLevelColor,
              fontSize: 20,
              fontFamily: "Roboto-Regular",
              marginLeft: level * 12,
            }}
          >
            {title}
          </Text>
        </TouchableOpacity>

        {hasChildren && (
          <TouchableOpacity onPress={toggleExpand} className="ml-2">
            <Image
              source={expanded ? icons.downArrow : icons.rightArrow}
              className="w-4 h-4"
              tintColor={chevronColor}
            />
          </TouchableOpacity>
        )}
      </View>

      {expanded &&
        hasChildren &&
        item.children?.map((child, idx) => {
          const childTitle = typeof child === "string" ? child : child.title;
          const isFromLokal = rootParent === "Lokal" || title === "Lokal";

          return (
            <View key={`${childTitle}-${idx}`}>
              <MenuCategoryItem
                item={child}
                level={level + 1}
                onPress={onPress}
                activeCategory={activeCategory}
                rootParent={title === "Lokal" ? "Lokal" : rootParent}
              />
              {isFromLokal && (
                <View
                  style={{
                    height: 1,
                    backgroundColor: lokalDividerColor,
                    marginHorizontal: 16,
                  }}
                />
              )}
            </View>
          );
        })}
    </View>
  );
};

export default MenuCategoryItem;
