import { db } from "@/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import * as schema from "@/db/schema";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: ["http://localhost:4000", "http://172.20.10.64:4000"],
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "CLIENT",
            },
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
            accessPolicyId: {
                type: "string",
                required: false,
            },
            permissionGrants: {
                type: "string[]",
                required: false,
                defaultValue: [],
                input: false,
            },
            permissionRevokes: {
                type: "string[]",
                required: false,
                defaultValue: [],
                input: false,
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
        },
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
