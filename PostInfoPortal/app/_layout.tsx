import {enableScreens} from 'react-native-screens';
import {SplashScreen as ExpoSplashScreen, Stack} from 'expo-router';
import "./global.css";
import {StatusBar} from "react-native";
import {useState} from "react";
import SplashScreen from '@/components/SplashScreen';
import {ThemeProvider} from "@/components/ThemeContext";

enableScreens();

export default function RootLayout() {

    const [showCustomSplash, setShowCustomSplash] = useState(true);

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
                <Stack.Screen name="post-details" options={{headerShown: false}}/>
            </Stack>
        </ThemeProvider>
    )

}
