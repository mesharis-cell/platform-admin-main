'use client';

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import NextTopLoader from "nextjs-toploader";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { PlatformProvider } from "@/contexts/platform-context";
import { AuthProvider } from "@/contexts/user-context";

export default function Providers({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 60 * 1000, // 1 minute
						gcTime: 5 * 60 * 1000, // 5 minutes
						retry: 1,
						refetchOnWindowFocus: false,
					},
				},
			})
	);

	return (
		<>
			<PlatformProvider>
				<AuthProvider>
					<QueryClientProvider client={queryClient}>
						<ThemeProvider
							attribute="class"
							defaultTheme="light"
							enableSystem
							disableTransitionOnChange
						>
							<NextTopLoader easing="ease" showSpinner={false} color="var(--primary)" />
							{children}
							<Toaster position="top-center" richColors />
						</ThemeProvider>
					</QueryClientProvider>
				</AuthProvider>
			</PlatformProvider>
		</>
	);
}