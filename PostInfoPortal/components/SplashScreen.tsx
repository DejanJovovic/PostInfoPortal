import colors from "@/constants/colors";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Animated, Dimensions } from "react-native";

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
    }, 7000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={{
        flex: 1,
        transform: [{ translateX }],
        backgroundColor: colors.blue,
      }}
    >
      <StatusBar hidden />
      <Image
        source={require("@/assets/animations/intro.gif")}
        style={{ width: "100%", height: "100%" }}
        contentFit="contain"
        contentPosition="center"
      />
    </Animated.View>
  );
}
