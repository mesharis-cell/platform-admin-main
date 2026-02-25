import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/providers";
import MainLayout from "@/components/layout/main-layout";
import { headers } from "next/headers";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

// Update this
export async function generateMetadata(): Promise<Metadata> {
    try {
        const headersList = await headers();
        const host = headersList.get("host") || "";

        // Pass the host to your backend so it can identify the tenant
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/context`, {
            headers: {
                "x-forwarded-host": host,
            },
            cache: "no-store",
        });

        if (!res.ok) throw new Error("Failed to fetch context");

        const data = await res.json();

        return {
            title: {
                default: `${data.data.platform_name || "Admin"}`,
                template: "%s | Admin",
            },
            description: "Admin Platform - Asset Management Platform",
            applicationName: "Admin",
            keywords: ["admin", "asset management", "inventory", "tracking"],
            authors: [{ name: "Platform Team" }],
            creator: "Platform Team",
            publisher: "Platform Team",
            icons: {
                icon: [
                    { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
                    { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
                    { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
                ],
                apple: [
                    {
                        url: "/apple-touch-icon.png",
                        sizes: "180x180",
                        type: "image/png",
                    },
                ],
            },
            manifest: "/site.webmanifest",
            appleWebApp: {
                capable: true,
                statusBarStyle: "default",
                title: `${data.data.platform_name || "Admin"}`,
            },
            formatDetection: {
                telephone: false,
            },
        };
    } catch (error) {
        // Fallback to static metadata
        return {
            title: {
                default: "Admin",
                template: "%s | Admin",
            },
            description: "Admin - Asset Management Platform",
            applicationName: "Admin",
            keywords: ["admin", "asset management", "inventory", "tracking"],
            authors: [{ name: "Platform Team" }],
            creator: "Platform Team",
            publisher: "Platform Team",
            icons: {
                icon: [
                    { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
                    { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
                    { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
                ],
                apple: [
                    {
                        url: "/apple-touch-icon.png",
                        sizes: "180x180",
                        type: "image/png",
                    },
                ],
            },
            manifest: "/site.webmanifest",
            appleWebApp: {
                capable: true,
                statusBarStyle: "default",
                title: "Admin",
            },
            formatDetection: {
                telephone: false,
            },
        };
    }
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    async
                    crossOrigin="anonymous"
                    src="https://tweakcn.com/live-preview.min.js"
                />
            </head>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <Providers>
                    <MainLayout>{children}</MainLayout>
                </Providers>
            </body>
        </html>
    );
}
