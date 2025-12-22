import { db } from "@/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
	}),
	emailAndPassword: {
		enabled: true,
	},
	trustedOrigins: ['http://localhost:3000', 'http://172.20.10.64:3000'],
	user: {
		additionalFields: {
			permissions: {
				type: "string[]",
				required: false,
				defaultValue: [],
				input: false,
			},
			companies: {
				type: "string[]",
				required: false,
				defaultValue: [],
				input: false,
			},
			permissionTemplate: {
				type: "string",
				required: false,
			},
			isActive: {
				type: "boolean",
				required: false,
				defaultValue: true,
			},
			lastLoginAt: {
				type: "date",
				required: false,
			},
			deletedAt: {
				type: "date",
				required: false,
			},
		}
	},
	hooks: {
		after: createAuthMiddleware(async (ctx) => {
			// Update lastLoginAt after successful sign-in
			if (ctx.path === "/sign-in/email") {
				const session = ctx.context.newSession;
				if (session && session.user) {
					await db
						.update(user)
						.set({
							lastLoginAt: new Date(),
							updatedAt: new Date(),
						})
						.where(eq(user.id, session.user.id));
				}
			}
		}),
	},
});