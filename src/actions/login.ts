"use server";

import { cookies } from "next/headers";

export async function setAuthCookies(accessToken: string, refreshToken: string) {
    const cookieStore = await cookies();

    cookieStore.set("access_token", accessToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
    });

    cookieStore.set("refresh_token", refreshToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 60, // 60 days
        path: "/",
    });
}

export const login = async (email: string, password: string, platformId: string) => {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-platform": platformId,
            },
            body: JSON.stringify({
                email,
                password,
            }),
        });

        const data = await res.json();

        if (res.ok && data.data.role === "ADMIN") {
            await setAuthCookies(data.data.access_token, data.data.refresh_token);
        }

        return data;
    } catch (error) {
        console.log(error);
        return error;
    }
};
