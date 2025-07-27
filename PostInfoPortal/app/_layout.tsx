import {Stack} from "expo-router";

import "./global.css";
import {StatusBar} from "react-native";
import {AuthProvider} from "@/components/AuthContext";

export default function RootLayout() {
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
