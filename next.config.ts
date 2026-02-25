import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    trailingSlash: false,
    images: {
        unoptimized: true,
        remotePatterns: [
            {
                protocol: "https",
                hostname: "*",
                pathname: "**",
            },
        ],
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    productionBrowserSourceMaps: true,
    serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
