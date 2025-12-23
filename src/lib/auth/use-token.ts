'use client';

import { useEffect, useState } from "react";
import Cookies from "js-cookie";

export const useToken = () => {
	const [access_token, setAccessToken] = useState<string | null>(null);
	const [refresh_token, setRefreshToken] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const isAuthenticated = !!access_token;

	useEffect(() => {
		setLoading(true);
		const token = Cookies.get("access_token") || null;
		const refresh_token = Cookies.get("refresh_token") || null;
		setAccessToken(token);
		setRefreshToken(refresh_token);
		setLoading(false);
	}, []);

	return { access_token, setAccessToken, refresh_token, setRefreshToken, isAuthenticated, loading };
};