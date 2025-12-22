'use client';

/**
 * Root Page - Role-Based Redirect
 *
 * Automatically redirects users based on their authentication state and role:
 * - Not authenticated → /login
 * - PMG Admin → /admin/analytics (or /admin/orders)
 * - A2 Staff → /admin/orders
 * - Client → /client-dashboard
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
	const router = useRouter();
	const { data: session, isPending } = useSession();

	useEffect(() => {
		if (isPending) return; // Wait for session to load

		if (!session) {
			// Not authenticated, redirect to login
			router.push('/login');
			return;
		}

		// User is authenticated, redirect based on role
		const permissionTemplate = session.user.permissionTemplate;

		if (permissionTemplate === 'PMG_ADMIN') {
			// PMG Admin goes to analytics dashboard
			router.push('/admin/analytics');
		} else if (permissionTemplate === 'A2_STAFF') {
			// A2 Staff goes to orders dashboard
			router.push('/admin/orders');
		} else if (permissionTemplate === 'CLIENT_USER') {
			// Client goes to client dashboard
			router.push('/client-dashboard');
		} else {
			// Unknown role, redirect to login
			router.push('/login');
		}
	}, [session, isPending, router]);

	// Show loading state while determining redirect
	return (
		<div className="min-h-screen bg-background flex items-center justify-center">
			<div className="text-center space-y-4">
				<Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
				<p className="text-sm text-muted-foreground font-mono">Loading...</p>
			</div>
		</div>
	);
}
