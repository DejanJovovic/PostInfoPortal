import SplashScreen from "@/components/SplashScreen";
import { ThemeProvider } from "@/components/ThemeContext";
import { useOneSignalDeepLinks } from "@/hooks/useOneSignalDeepLinks";
import { RouteTarget } from "@/types/routeDeepLink";
import { useFonts } from "expo-font";
import {
  SplashScreen as ExpoSplashScreen,
  Stack,
  useRouter,
} from "expo-router";
import React from "react";
import { StatusBar } from "react-native";
import { enableScreens } from "react-native-screens";
import "./global.css";

enableScreens();

export default function RootLayout() {
  const router = useRouter();
  const [showCustomSplash, setShowCustomSplash] = React.useState(true);

  const [fontsLoaded] = useFonts({
    "Roboto-Bold": require("../assets/fonts/Roboto-Bold.ttf"),
    "Roboto-ExtraBold": require("../assets/fonts/Roboto-ExtraBold.ttf"),
    "Roboto-Light": require("../assets/fonts/Roboto-Light.ttf"),
    "Roboto-Medium": require("../assets/fonts/Roboto-Medium.ttf"),
    "Roboto-Regular": require("../assets/fonts/Roboto-Regular.ttf"),
    "Roboto-SemiBold": require("../assets/fonts/Roboto-SemiBold.ttf"),
    "YesevaOne-Regular": require("../assets/fonts/YesevaOne-Regular.ttf"),
  });

  // hides splash when openning the notification
  const hideSplashFromNotification = (to: RouteTarget) => {
    setShowCustomSplash(false);
    try {
      ExpoSplashScreen.hideAsync();
    } catch {}
    requestAnimationFrame(() => router.push(to as any));
  };

  // OneSignal (Android-only for now)
  useOneSignalDeepLinks({
    navigate: hideSplashFromNotification,
    onesignalAppId: "9f87ae6e-83b5-4f3b-b49f-1f293096109d",
    debug: true, // set false in production
  });

  const rootKey = fontsLoaded ? "fonts-ready" : "fonts-loading";

  if (showCustomSplash) {
    return (
      <SplashScreen
        onFinish={() => {
          setShowCustomSplash(false);
          ExpoSplashScreen.hideAsync();
        }}
      />
    );
  }

  return (
    <ThemeProvider key={rootKey}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
        animated
      />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="favorites" options={{ headerShown: false }} />
        <Stack.Screen name="categories" options={{ headerShown: false }} />
        <Stack.Screen name="post-details" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
