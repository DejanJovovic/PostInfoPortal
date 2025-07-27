import {enableScreens} from 'react-native-screens';

enableScreens();

import {SplashScreen as ExpoSplashScreen, Stack} from 'expo-router';
import "./global.css";
import {StatusBar} from "react-native";
import {AuthProvider} from "@/components/AuthContext";
import {useState} from "react";
import SplashScreen from '@/components/SplashScreen';

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
        <AuthProvider>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} animated={true}/>
            <Stack>
                <Stack.Screen name="index" options={{headerShown: false}}/>
                <Stack.Screen name="favorites" options={{headerShown: false}}/>
                <Stack.Screen name="post-details" options={{headerShown: false}}/>
            </Stack>
        </AuthProvider>
    )

}
