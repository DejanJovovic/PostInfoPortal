import CustomSearchBar from "@/components/CustomSearchBar";
import colors from "@/constants/colors";
import icons from "@/constants/icons";
import images from "@/constants/images";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  TouchableOpacity,
  View,
} from "react-native";
import MenuDrawer from "./MenuDrawer";
import { useTheme } from "./ThemeContext";

type CustomHeaderProps = {
  onMenuToggle?: (visible: boolean) => void;
  onCategorySelected?: (category: string) => void;
  activeCategory: string;
  onSearchQuery?: (query: string) => void;
  triggerSearchOpen?: boolean;
  showMenu?: boolean;
  onBackPress?: () => void;
  loadingNav?: boolean;
};

const CustomHeader: React.FC<CustomHeaderProps> = ({
  onMenuToggle,
  onCategorySelected,
  activeCategory,
  onSearchQuery,
  triggerSearchOpen,
  showMenu,
  onBackPress,
  loadingNav = false,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const TOP_LEVEL_ROUTES = new Set([
    "/",
    "/newest",
    "/favorites",
    "/categories",
    "/search",
  ]);
  const showBackButton = !TOP_LEVEL_ROUTES.has(pathname);
  const drawerBackground = isDarkMode ? colors.black : "#ffffff";
  const dividerColor = isDarkMode ? "#374151" : "#d1d5db";
  const drawerSearchBackground = isDarkMode ? "#222" : "#e5e7eb";
  const drawerSearchTextColor = isDarkMode ? colors.grey : colors.black;
  const drawerSearchPlaceholderColor = isDarkMode ? "#9ca3af" : "#6b7280";
  const drawerSearchIconColor = isDarkMode ? "#9ca3af" : "#4b5563";

  const spinAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(
    new Animated.Value(-Dimensions.get("window").width * 0.8),
  ).current;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const [menuVisible, setMenuVisible] = useState(false);
  const [drawerSearchQuery, setDrawerSearchQuery] = useState("");

  const openMenu = () => {
    setMenuVisible(true);
    onMenuToggle?.(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const spinAndClose = () => {
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      spinAnim.setValue(0);
      closeMenu();
    });
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -Dimensions.get("window").width * 0.8,
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      setMenuVisible(false);
      onMenuToggle?.(false);
    });
  };

  useEffect(() => {
    if (triggerSearchOpen && !menuVisible) {
      openMenu();
    }
  }, [triggerSearchOpen]);

  return (
    <View className="w-full h-[100px] relative">
      <ImageBackground
        source={images.postInfoWallpaper}
        className="w-full h-full"
        resizeMode="cover"
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 44,
            left: 0,
            right: 0,
            alignItems: "center",
            transform: [{ translateY: -24 }],
          }}
        >
          <Image
            source={images.postInfoLogo}
            style={{ width: 220, height: 48 }}
            resizeMode="contain"
          />
        </View>
      </ImageBackground>

      {showBackButton && (
        <TouchableOpacity
          onPress={
            onBackPress ??
            (() => {
              if (router.canGoBack()) {
                router.back();
                return;
              }
              router.replace("/");
            })
          }
          disabled={loadingNav}
          className="absolute left-4 top-11 -translate-y-1/2 z-10"
          activeOpacity={0.8}
          style={{ opacity: loadingNav ? 0.5 : 1 }}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Image
            source={icons.backArrow}
            className="w-5 h-5"
            tintColor={colors.grey}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}

      {showMenu !== false && (
        <TouchableOpacity
          onPress={openMenu}
          className="absolute right-4 top-11 -translate-y-1/2 z-10"
          activeOpacity={0.8}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Image
            source={icons.menu}
            className="w-6 h-6"
            tintColor={colors.grey}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}

      {menuVisible && showMenu !== false && (
        <View className="absolute top-0 left-0 w-full h-screen flex-row z-50">
          <Animated.View
            style={{
              width: "80%",
              height: "100%",
              backgroundColor: drawerBackground,
              transform: [{ translateX: slideAnim }],
            }}
          >
            <CustomSearchBar
              query={drawerSearchQuery}
              onSearch={(query: string) => {
                if (onCategorySelected) onCategorySelected("");
                onSearchQuery?.(query);
                setDrawerSearchQuery("");
                closeMenu();
              }}
              onQueryChange={setDrawerSearchQuery}
              onReset={() => setDrawerSearchQuery("")}
              backgroundColor={drawerSearchBackground}
              inputTextColor={drawerSearchTextColor}
              placeholderColor={drawerSearchPlaceholderColor}
              iconColor={drawerSearchIconColor}
              autoFocus={triggerSearchOpen}
            />

            <View
              style={{
                height: 1,
                backgroundColor: dividerColor,
                marginTop: 16,
                marginBottom: 8,
                marginHorizontal: 8,
              }}
            />
            <MenuDrawer
              onCategorySelect={(category) => {
                onCategorySelected?.(category);
                closeMenu();
              }}
              activeCategory={activeCategory}
              onOpenNotifications={() => {
                closeMenu();
                setTimeout(() => {
                  router.push("/notifications");
                }, 260);
              }}
            />
          </Animated.View>

          <TouchableOpacity
            className="flex-1 bg-gray-200 opacity-80"
            activeOpacity={1}
            onPress={spinAndClose}
          >
            <Animated.View
              style={{
                transform: [{ rotate: spin }],
                position: "absolute",
                top: 40,
                right: 24,
              }}
            >
              <Image
                source={icons.close}
                className="w-5 h-5"
                tintColor="black"
              />
            </Animated.View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default CustomHeader;
