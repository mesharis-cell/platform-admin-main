"use client";

import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import React, { useContext } from "react";

// -------------------Context-------------------

interface AuthContextType {
    user: any | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    logout: () => void;
    setUser: React.Dispatch<React.SetStateAction<any | null>>;
    setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AuthContext = React.createContext<AuthContextType>({
    user: null,
    setUser: () => {},
    isAuthenticated: false,
    isLoading: true,
    setIsAuthenticated: () => {},
    logout: () => {},
});

// -------------------Provider-------------------

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = React.useState<any | null>(null);
    const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(false);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);

    const getUser = React.useCallback(async () => {
        const token = Cookies.get("access_token");
        if (token && !isAuthenticated) {
            try {
                const decodedToken = jwtDecode(token || "");
                setUser(decodedToken);
                setIsAuthenticated(true);
            } catch (error) {
                console.log(error);
            }
        }
    }, [isAuthenticated]);

    const logout = React.useCallback(() => {
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        setUser(null);
        setIsAuthenticated(false);
    }, []);

    React.useEffect(() => {
        const checkAuth = async () => {
            const token = Cookies.get("access_token");
            if (token && !isAuthenticated) {
                await getUser();
            }
            setIsLoading(false);
        };
        checkAuth();
    }, [isAuthenticated, getUser]);

    const value = {
        user,
        setUser,
        isAuthenticated,
        isLoading,
        setIsAuthenticated,
        logout,
    };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
