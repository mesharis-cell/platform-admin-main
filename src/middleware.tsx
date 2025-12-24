import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't require authentication
const publicRoutes = ['/', '/reset-password']

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl
	const cookieStore = await cookies()

	// Check if the current path is a public route
	const isPublicRoute = publicRoutes.some(route =>
		pathname === route || pathname.startsWith(`${route}/`)
	)

	// Allow public routes without authentication
	if (isPublicRoute) {
		return NextResponse.next()
	}

	// Check for access_token cookie
	const accessToken = cookieStore.get('access_token')?.value || null

	// If no token and trying to access protected route, redirect to homepage
	if (!accessToken) {
		return NextResponse.redirect(new URL('/', request.url))
	}

	return NextResponse.next()
}

export const config = {
	matcher: [
		'/((?!api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
	],
}
