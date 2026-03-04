import { useTheme } from "@/components/ThemeContext";
import colors from "@/constants/colors";
import icons from "@/constants/icons";
import images from "@/constants/images";
import { router, usePathname } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const navItems = [
  { key: "home", label: "Naslovna", icon: icons.home },
  { key: "newest", label: "Najnovije", icon: icons.stopwatch },
  { key: "favorites", label: "Omiljeno", icon: icons.bookmark },
  { key: "categories", label: "Sve kategorije", icon: icons.allCategories },
  { key: "search", label: "Pretraga", icon: icons.search },
];

type RouteTarget = "/" | "/newest" | "/favorites" | "/categories" | "/search";

type FooterButtonProps = {
  item: (typeof navItems)[number];
  active: boolean;
  disabled: boolean;
  onPress: () => void;
};

const FooterNavButton = ({
  item,
  active,
  disabled,
  onPress,
}: FooterButtonProps) => {
  const [pressed, setPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(active ? 1.05 : 1)).current;
  const liftAnim = useRef(new Animated.Value(active ? -2 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: active ? 1.06 : pressed ? 1.02 : 1,
        useNativeDriver: true,
        speed: 18,
        bounciness: 8,
      }),
      Animated.spring(liftAnim, {
        toValue: active ? -2 : 0,
        useNativeDriver: true,
        speed: 18,
        bounciness: 8,
      }),
    ]).start();
  }, [active, pressed, liftAnim, scaleAnim]);

  const tintColor = active ? "#ffffff" : "#756f6f";

  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      style={styles.navItem}
      disabled={disabled}
    >
      <Animated.View
        style={{
          alignItems: "center",
          transform: [{ scale: scaleAnim }, { translateY: liftAnim }],
        }}
      >
        <View style={styles.iconSlot}>
          <View style={active ? styles.activeIconShadow : undefined}>
            <Image
              source={item.icon}
              style={{ width: 22, height: 22, tintColor }}
            />
          </View>
        </View>

        <Text style={[styles.label, { color: tintColor }]}>{item.label}</Text>
      </Animated.View>
    </Pressable>
  );
};

const CustomFooter: React.FC = () => {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isLoading) setIsLoading(false);
  }, [pathname, isLoading]);

  const active = useMemo(() => {
    if (pathname === "/") return "home";
    if (pathname === "/newest") return "newest";
    if (pathname === "/favorites") return "favorites";
    if (pathname === "/search") return "search";
    if (pathname === "/categories") return "categories";
    return "";
  }, [pathname]);

  const navigateWithLoader = (target: RouteTarget) => {
    if (isLoading) return;
    setIsLoading(true);
    requestAnimationFrame(() => {
      router.replace(target as any);
    });
  };

  const handlePress = (key: string) => {
    if (key === active) return;

    switch (key) {
      case "home":
        navigateWithLoader("/");
        break;
      case "newest":
        navigateWithLoader("/newest");
        break;
      case "favorites":
        navigateWithLoader("/favorites");
        break;
      case "categories":
        navigateWithLoader("/categories");
        break;
      case "search":
        navigateWithLoader("/search");
        break;
    }
  };

  return (
    <>
      <ImageBackground
        source={images.postInfoWallpaper}
        resizeMode="cover"
        style={[
          styles.footerBar,
          {
            height: 62 + insets.bottom,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {navItems.map((item) => (
          <FooterNavButton
            key={item.key}
            item={item}
            active={active === item.key}
            disabled={isLoading}
            onPress={() => handlePress(item.key)}
          />
        ))}
      </ImageBackground>

      {isLoading && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.35)",
              zIndex: 9999,
              elevation: 9999,
            },
          ]}
          pointerEvents="auto"
        >
          <ActivityIndicator
            size="large"
            color={isDark ? colors.grey : colors.black}
          />
          <Text
            style={{
              marginTop: 10,
              color: isDark ? colors.grey : colors.black,
              fontFamily: "Roboto-SemiBold",
            }}
          >
            Učitavanje...
          </Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  footerBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingTop: 4,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSlot: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 8,
    fontFamily: "Roboto",
    marginTop: 1,
  },
  activeIconShadow: {
    shadowColor: "#ffffff",
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
});

export default CustomFooter;
