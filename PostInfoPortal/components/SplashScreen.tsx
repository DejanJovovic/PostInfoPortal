import colors from "@/constants/colors";
import images from "@/constants/images";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Animated, Dimensions, View } from "react-native";

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.35)).current;
  const dot2 = useRef(new Animated.Value(0.35)).current;
  const dot3 = useRef(new Animated.Value(0.35)).current;
  const EXIT_ANIMATION_MS = 500;
  const TOTAL_SPLASH_MS = 3000;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(translateX, {
        toValue: -Dimensions.get("window").width,
        duration: EXIT_ANIMATION_MS,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, Math.max(0, TOTAL_SPLASH_MS - EXIT_ANIMATION_MS));

    return () => clearTimeout(timer);
  }, [onFinish, translateX, EXIT_ANIMATION_MS, TOTAL_SPLASH_MS]);

  useEffect(() => {
    const createDotLoop = (dot: Animated.Value, delayMs: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(dot, {
            toValue: 1,
            duration: 380,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.35,
            duration: 380,
            useNativeDriver: true,
          }),
          Animated.delay(220),
        ])
      );

    const dot1Loop = createDotLoop(dot1, 0);
    const dot2Loop = createDotLoop(dot2, 120);
    const dot3Loop = createDotLoop(dot3, 240);

    dot1Loop.start();
    dot2Loop.start();
    dot3Loop.start();

    return () => {
      dot1Loop.stop();
      dot2Loop.stop();
      dot3Loop.stop();
    };
  }, [dot1, dot2, dot3]);

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
      <View
        style={{
          marginTop: 18,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            marginHorizontal: 4,
            backgroundColor: colors.grey,
            opacity: dot1,
            transform: [
              {
                scale: dot1.interpolate({
                  inputRange: [0.35, 1],
                  outputRange: [0.8, 1.2],
                }),
              },
            ],
          }}
        />
        <Animated.View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            marginHorizontal: 4,
            backgroundColor: colors.grey,
            opacity: dot2,
            transform: [
              {
                scale: dot2.interpolate({
                  inputRange: [0.35, 1],
                  outputRange: [0.8, 1.2],
                }),
              },
            ],
          }}
        />
        <Animated.View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            marginHorizontal: 4,
            backgroundColor: colors.grey,
            opacity: dot3,
            transform: [
              {
                scale: dot3.interpolate({
                  inputRange: [0.35, 1],
                  outputRange: [0.8, 1.2],
                }),
              },
            ],
          }}
        />
      </View>
    </Animated.View>
  );
}
