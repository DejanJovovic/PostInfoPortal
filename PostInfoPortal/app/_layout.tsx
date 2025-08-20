import { enableScreens } from "react-native-screens";
import { SplashScreen as ExpoSplashScreen, Stack, useRouter } from "expo-router";
import "./global.css";
import { StatusBar } from "react-native";
import React from "react";
import SplashScreen from "@/components/SplashScreen";
import { ThemeProvider } from "@/components/ThemeContext";
import { useOneSignalDeepLinks } from "@/hooks/useOneSignalDeepLinks";
import { RouteTarget } from "@/types/routeDeepLink";
import { useFonts } from "expo-font";

enableScreens();

ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

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

    React.useEffect(() => {
        if (fontsLoaded && !showCustomSplash) {
            ExpoSplashScreen.hideAsync().catch(() => {});
        }
    }, [fontsLoaded, showCustomSplash]);

    const fastRoute = (to: RouteTarget) => {
        setShowCustomSplash(false); // ovo će trigger-ovati hide gore kad fontsLoaded === true
        requestAnimationFrame(() => router.push(to as any));
    };

    useOneSignalDeepLinks({
        navigate: fastRoute,
        onesignalAppId: "9f87ae6e-83b5-4f3b-b49f-1f293096109d",
        debug: true,
    });

    if (!fontsLoaded || showCustomSplash) {
        return (
            <SplashScreen
                onFinish={() => setShowCustomSplash(false)}
            />
        );
    }

    return (
        <ThemeProvider>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent animated />
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