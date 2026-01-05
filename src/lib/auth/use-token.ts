'use client';

import { useCallback, useEffect, useState } from "react";
import Cookies from "js-cookie";

export const useToken = () => {
	const [access_token, setAccessToken] = useState<string | null>(null);
	const [refresh_token, setRefreshToken] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [user, setUser] = useState<any>(null);

	useEffect(() => {
		if (!isAuthenticated) {
			setLoading(true);
			const token = Cookies.get("access_token") || null;
			const refresh_token = Cookies.get("refresh_token") || null;
			if (typeof window !== "undefined") {
				setUser(JSON.parse(localStorage.getItem("user") || "null"));
			}
			setAccessToken(token);
			setRefreshToken(refresh_token);
			setLoading(false);
			setIsAuthenticated(!!token);
		}
	}, [isAuthenticated]);

	const logout = useCallback(() => {
		Cookies.remove("access_token");
		Cookies.remove("refresh_token");
		if (typeof window !== "undefined") {
			// eslint-disable-next-line creatr/no-browser-globals-in-ssr
			localStorage.removeItem("user");
		}
		setUser(null);
		setIsAuthenticated(false);
	}, []);

	return { access_token, setAccessToken, refresh_token, setRefreshToken, isAuthenticated, loading, logout, user, setUser };
};