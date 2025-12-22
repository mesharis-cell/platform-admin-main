import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./server";

export const { signIn, signUp, signOut, useSession } =
	createAuthClient({
		baseURL: process.env.NEXT_PUBLIC_BASE_URL!,
		plugins: [inferAdditionalFields<typeof auth>()],
	});