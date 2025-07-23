import React, {createContext, useContext, useState, useEffect, useCallback} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AuthContextType {
    auth_token: string | null;
    email: string | null;
    password: string | null;
    setAuth: (auth_token: string, email: string, password: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}: { children: React.ReactNode }) => {
    const [auth_token, setToken] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [password, setPassword] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadToken = async () => {
            try {
                const storedToken = await AsyncStorage.getItem("auth_token");
                const storedEmail = await AsyncStorage.getItem("email");
                const storedPassword = await AsyncStorage.getItem("password");

                if (storedToken && storedEmail && storedPassword) {
                    setToken(storedToken);
                    setEmail(storedEmail);
                    setPassword(storedPassword);
                }
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadToken();
    }, []);

    const setAuth = useCallback(async (userToken: string, userEmail: string, userPassword: string) => {
        setToken(userToken);
        setEmail(userEmail);
        setPassword(userPassword);

        await AsyncStorage.setItem("auth_token", userToken);
        await AsyncStorage.setItem("email", userEmail);
        await AsyncStorage.setItem("password", userPassword);
    }, []);

    const logout = useCallback(async () => {
        setToken(null);
        setEmail(null);
        setPassword(null);

        await AsyncStorage.removeItem("auth_token");
        await AsyncStorage.removeItem("email");
        await AsyncStorage.removeItem("password");
    }, []);

    if (loading) return null; // Prevent rendering before data is loaded

    return (
        <AuthContext.Provider value={{auth_token, email, password, setAuth, logout}}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};