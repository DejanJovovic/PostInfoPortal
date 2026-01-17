import colors from "@/constants/colors";
import React from "react";
import { Text, View } from "react-native";

type SearchHeaderProps = {
  isDark: boolean;
  label: React.ReactNode;
  searchBar: React.ReactNode;
  rightAction?: React.ReactNode;
  layout?: "row" | "stacked";
  containerClassName?: string;
  rowClassName?: string;
  labelClassName?: string;
};

const SearchHeader = ({
  isDark,
  label,
  searchBar,
  rightAction,
  layout = "row",
  containerClassName = "px-2 py-4",
  rowClassName = "flex-row items-center justify-between px-2 mt-2",
  labelClassName = "mt-2 px-4",
}: SearchHeaderProps) => {
  if (layout === "stacked") {
    return (
      <View className={containerClassName}>
        <Text
          className={labelClassName}
          style={{
            color: isDark ? colors.grey : colors.black,
            fontFamily: "Roboto-Medium",
          }}
        >
          {label}
        </Text>
        {searchBar}
      </View>
    );
  }

  return (
    <View className={containerClassName}>
      <View className={rowClassName}>
        <Text
          className={labelClassName}
          style={{
            color: isDark ? colors.grey : colors.black,
            fontFamily: "Roboto-Medium",
          }}
        >
          {label}
        </Text>
        {rightAction || null}
      </View>
      {searchBar}
    </View>
  );
};

export default SearchHeader;
