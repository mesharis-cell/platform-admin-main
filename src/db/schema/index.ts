import { sql } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable(
    "users",
    {
        id: text("id").primaryKey(),
        name: text("name").notNull(),
        email: text("email").notNull(),
        emailVerified: timestamp("email_verified"),
        image: text("image"),
        role: text("role").notNull().default("CLIENT"),
        permissions: text("permissions")
            .array()
            .notNull()
            .default(sql`ARRAY[]::text[]`),
        companies: text("companies")
            .array()
            .notNull()
            .default(sql`ARRAY[]::text[]`),
        permissionTemplate: text("permission_template"),
        isActive: boolean("is_active").notNull().default(true),
        lastLoginAt: timestamp("last_login_at"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => new Date())
            .notNull(),
        deletedAt: timestamp("deleted_at"),
    },
    (table) => [index("user_email_idx").on(table.email)]
);

export const account = pgTable(
    "account",
    {
        id: text("id").primaryKey(),
        accountId: text("account_id").notNull(),
        providerId: text("provider_id").notNull(),
        userId: text("user_id").notNull(),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        idToken: text("id_token"),
        accessTokenExpiresAt: timestamp("access_token_expires_at"),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
        scope: text("scope"),
        password: text("password"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [index("account_userId_idx").on(table.userId)]
);

export const session = pgTable(
    "session",
    {
        id: text("id").primaryKey(),
        expiresAt: timestamp("expires_at").notNull(),
        token: text("token").notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => new Date())
            .notNull(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        userId: text("user_id").notNull(),
    },
    (table) => [index("session_userId_idx").on(table.userId)]
);

export const verification = pgTable(
    "verification",
    {
        id: text("id").primaryKey(),
        identifier: text("identifier").notNull(),
        value: text("value").notNull(),
        expiresAt: timestamp("expires_at").notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [index("verification_identifier_idx").on(table.identifier)]
);

// TODO: Replace placeholders with full schema for seed/demo scripts
export const companies = {} as any;
export const warehouses = {} as any;
export const zones = {} as any;
export const brands = {} as any;
export const assets = {} as any;
export const assetConditionHistory = {} as any;
export const assetBookings = {} as any;
export const collections = {} as any;
export const collectionItems = {} as any;
export const pricingTiers = {} as any;
export const orders = {} as any;
export const orderItems = {} as any;
export const orderStatusHistory = {} as any;
export const scanEvents = {} as any;
export const notificationLogs = {} as any;
