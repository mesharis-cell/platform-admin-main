import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import './globals.css'
import Providers from "@/providers";

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
})

// Update this
export const metadata: Metadata = {
	title: {
		default: 'Creatr',
		template: '%s | Creatr',
	},
	description: 'A modern web application built with Next.js and TypeScript',
	applicationName: 'Creatr',
	keywords: ['next.js', 'react', 'typescript', 'web application'],
	authors: [{ name: 'Creatr Team' }],
	creator: 'Creatr Team',
	publisher: 'Creatr Team',
	icons: {
		icon: [
			{ url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
			{ url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
			{ url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
		],
		apple: [
			{
				url: '/apple-touch-icon.png',
				sizes: '180x180',
				type: 'image/png',
			},
		],
	},
	manifest: '/site.webmanifest',
	appleWebApp: {
		capable: true,
		statusBarStyle: 'default',
		title: 'Creatr',
	},
	formatDetection: {
		telephone: false,
	},
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang='en' suppressHydrationWarning>
			<head>
				<script
					async
					crossOrigin="anonymous"
					src="https://tweakcn.com/live-preview.min.js"
				/>
			</head>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<Providers>
					{children}
				</Providers>
			</body>
		</html>
	)
}
