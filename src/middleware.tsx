import { NextResponse, type NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

const apiAuthPrefix: string = '/api/auth'
const apiCronPrefix: string = '/api/cron'
const authRoutes: string[] = ['/login', '/signup', '/reset-password']
const publicRoutes: string[] = ['/']
const DEFAULT_LOGIN_REDIRECT: string = '/'

export async function middleware(request: NextRequest) {
	const session = getSessionCookie(request)

	const isApiAuth = request.nextUrl.pathname.startsWith(apiAuthPrefix)

	const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname)

	const isAuthRoute = () => {
		return authRoutes.some(path =>
			request.nextUrl.pathname.startsWith(path)
		)
	}

	const referer = request.headers.get('referer');
	const isComingFromAuth = referer && authRoutes.some((route) => referer.includes(route));

	if (isComingFromAuth) {
		return NextResponse.next();
	}

	if (isApiAuth) {
		return NextResponse.next()
	}

	const isApiCron = request.nextUrl.pathname.startsWith(apiCronPrefix)
	if (isApiCron) {
		return NextResponse.next()
	}

	if (isAuthRoute()) {
		if (session) {
			return NextResponse.redirect(
				new URL(DEFAULT_LOGIN_REDIRECT, request.url)
			)
		}
		return NextResponse.next()
	}

	if (!session && !isPublicRoute) {
		return NextResponse.redirect(new URL('/login', request.url))
	}

	return NextResponse.next()
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * Feel free to modify this pattern to include more paths.
		 */
		'/((?!api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
	],
}
