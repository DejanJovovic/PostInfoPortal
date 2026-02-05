import colors from "@/constants/colors";
import images from "@/constants/images";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Dimensions } from "react-native";

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(translateX, {
        toValue: -Dimensions.get("window").width,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, [onFinish, translateX]);

  const h = Dimensions.get("window").height;
  const w = Dimensions.get("window").width;

  return (
    <Animated.View
      style={{
        flex: 1,
        transform: [{ translateX }],
        backgroundColor: colors.black,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <StatusBar hidden />
      <Image
        source={images.postInfoWallpaper}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        contentFit="cover"
        contentPosition="center"
      />
      <Image
        source={images.postInfoLogo}
        style={{
          width: Math.min(280, Math.max(180, w * 0.7)),
          height: Math.min(160, Math.max(110, h * 0.16)),
        }}
        contentFit="contain"
        contentPosition="center"
      />
      <ActivityIndicator
        size="large"
        color={colors.grey}
        style={{ marginTop: 18 }}
      />
    </Animated.View>
  );
}
