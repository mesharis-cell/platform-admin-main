import { cache } from "react";
import { auth } from "./server";
import { headers } from "next/headers";

/**
 * Get current session on the server side (cached)
 * Use this in Server Components and Server Actions
 */
const getSession = cache(async () => {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		return session;
	} catch (error) {
		console.error("Error getting session:", error);
		return null;
	}
});

export default getSession;
