import {enableScreens} from 'react-native-screens';
import {SplashScreen as ExpoSplashScreen, Stack, useRouter} from 'expo-router';
import "./global.css";
import {Platform, StatusBar} from "react-native";
import {useEffect, useState} from "react";
import SplashScreen from '@/components/SplashScreen';
import {ThemeProvider} from "@/components/ThemeContext";
import {LogLevel, NotificationClickEvent, OneSignal} from "react-native-onesignal";

enableScreens();

export default function RootLayout() {

    const [showCustomSplash, setShowCustomSplash] = useState(true);

    const router = useRouter();

    useEffect(() => {
        if (Platform.OS !== "android") return; // avoid web/ios until configured

        OneSignal.Debug.setLogLevel(LogLevel.Verbose); // remove in prod
        OneSignal.initialize("9f87ae6e-83b5-4f3b-b49f-1f293096109d");
        OneSignal.Notifications.requestPermission(true);

        const onClick = (event: NotificationClickEvent) => {
            const data = event.notification?.additionalData as { postId?: string; route?: string } | undefined;
            if (data?.postId) {
                router.push({ pathname: "/post-details", params: { postId: String(data.postId) } });
            } else if (data?.route) {
                router.push(data.route as any);
            }
        };

        // ✅ Typed and supported across 5.x
        OneSignal.Notifications.addEventListener("click", onClick);

        return () => {
            OneSignal.Notifications.removeEventListener("click", onClick);
        };
    }, []);

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
        <ThemeProvider>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} animated={true}/>
            <Stack>
                <Stack.Screen name="index" options={{headerShown: false}}/>
                <Stack.Screen name="favorites" options={{headerShown: false}}/>
                <Stack.Screen name="categories" options={{headerShown: false}}/>
                <Stack.Screen name="post-details" options={{headerShown: false}}/>
            </Stack>
        </ThemeProvider>
    )

}
