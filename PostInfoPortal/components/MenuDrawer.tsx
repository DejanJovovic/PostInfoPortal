import { useTheme } from "@/components/ThemeContext";
import colors from "@/constants/colors";
import icons from "@/constants/icons";
import { menuData } from "@/types/menuData";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
    Image,
    Linking,
    ScrollView,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MenuCategoryItem from "./MenuCategoryItem";

type MenuDrawerProps = {
  onCategorySelect: (categoryName: string) => void;
  activeCategory: string;
};

const MenuDrawer: React.FC<MenuDrawerProps> = ({
  onCategorySelect,
  activeCategory,
}) => {
  const { theme, toggleTheme } = useTheme();

  const isDarkMode = theme === "dark";

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) => {
      console.warn("Failed to open url:", url, err);
    });
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
      style={{ backgroundColor: colors.black }}
    >
      {menuData.map((item) => (
        <MenuCategoryItem
          key={typeof item === "string" ? item : item.title}
          item={item}
          onPress={onCategorySelect}
          activeCategory={activeCategory}
        />
      ))}

      <View style={{ marginTop: "auto" }}>
        <View className="flex-row justify-around items-center mt-6 px-4">
          <TouchableOpacity
            onPress={() => openLink("https://www.facebook.com/postinfo.rs")}
          >
            <Image
              source={icons.facebook}
              className="w-5 h-5"
              tintColor={colors.grey}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openLink("https://x.com/postinfo_rs")}
          >
            <Image
              source={icons.twitter}
              className="w-5 h-5"
              tintColor={colors.grey}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openLink("https://youtube.com/@postinfotv")}
          >
            <Image
              source={icons.youtube}
              className="w-5 h-5"
              tintColor={colors.grey}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openLink("https://www.instagram.com/postinfo.rs")}
          >
            <Image
              source={icons.instagram}
              className="w-5 h-5"
              tintColor={colors.grey}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              openLink("https://www.linkedin.com/company/postinfo-rs")
            }
          >
            <Image
              source={icons.linkedin}
              className="w-5 h-5"
              tintColor={colors.grey}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openLink("https://www.postinfo.rs")}>
            <Image
              source={icons.wifi}
              className="w-5 h-5"
              tintColor={colors.grey}
            />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center justify-between px-4 mt-6">
          <View className="flex-row items-center gap-2">
            <Feather
              name="sun"
              size={20}
              color={isDarkMode ? "#aaa" : "#333"}
            />
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: "#ccc", true: "#666" }}
              thumbColor={isDarkMode ? colors.grey : colors.black}
            />
            <Feather
              name="moon"
              size={20}
              color={isDarkMode ? "#fff" : "#888"}
            />
          </View>
        </View>

        <View className="mt-6 px-4 pb-10">
          <Text
            className="text-xs flex-wrap leading-5"
            style={{
              color: colors.grey,
              fontFamily: "YesevaOne-Regular",
            }}
          >
            © 2026{" "}
            <Text
              className="underline"
              onPress={() => openLink("https://www.postinfo.rs")}
              style={{
                color: colors.grey,
                fontFamily: "YesevaOne-Regular",
              }}
            >
              POSTINFO
            </Text>{" "}
            - Sva prava zadržava{" "}
            <Text
              className="underline"
              onPress={() => openLink("https://www.digitalthinking.rs")}
              style={{
                color: colors.grey,
                fontFamily: "YesevaOne-Regular",
              }}
            >
              Digital Thinking d.o.o.
            </Text>
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default MenuDrawer;
