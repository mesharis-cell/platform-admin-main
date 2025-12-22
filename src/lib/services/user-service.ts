import { db } from "@/db";
import { user } from "@/db/schema";
import { eq, and, or, sql, ilike } from "drizzle-orm";
import {
	CreateUserRequest,
	UpdateUserRequest,
	User,
	UserListParams,
	PERMISSION_TEMPLATES,
} from "@/types/auth";

/**
 * Create a new user
 */
export async function createUser(
	data: CreateUserRequest,
): Promise<User | { error: string }> {
	try {
		// Check if email already exists
		const existingUser = await db.query.user.findFirst({
			where: eq(user.email, data.email),
		});

		if (existingUser) {
			return { error: "Email already exists" };
		}

		// Apply permission template defaults if specified
		let permissions = data.permissions || [];
		let companies = data.companies || [];

		if (data.permissionTemplate) {
			const template = PERMISSION_TEMPLATES[data.permissionTemplate];
			permissions = [...template.permissions];

			// For templates, use provided companies or template defaults
			if (data.companies && data.companies.length > 0) {
				companies = data.companies;
			} else {
				companies = [...template.defaultCompanies];
			}
		}

		// Validate CLIENT_USER has exactly one company
		if (data.permissionTemplate === 'CLIENT_USER') {
			if (!companies || companies.length !== 1) {
				return { error: "CLIENT_USER must belong to exactly one company" };
			}
			if (companies[0] === '*') {
				return { error: "CLIENT_USER cannot have wildcard company access" };
			}
		}

		// Validate admin users have wildcard access
		if (data.permissionTemplate === 'PMG_ADMIN' || data.permissionTemplate === 'A2_STAFF') {
			if (!companies.includes('*')) {
				return { error: "Admin users must have wildcard company access" };
			}
		}

		// Create user via better-auth (handles password hashing and account creation)
		const { auth } = await import("@/lib/auth/server");

		const result = await auth.api.signUpEmail({
			body: {
				email: data.email,
				password: data.password,
				name: data.name,
			},
		});

		if (!result) {
			return { error: "Failed to create user account" };
		}

		// Update user with RBAC fields (permissions, companies, template)
		await db
			.update(user)
			.set({
				permissions,
				companies,
				permissionTemplate: data.permissionTemplate || null,
				isActive: true,
				updatedAt: new Date(),
			})
			.where(eq(user.email, data.email));

		// Fetch created user with updated permissions
		const createdUser = await db.query.user.findFirst({
			where: eq(user.email, data.email),
		});

		if (!createdUser) {
			return { error: "Failed to fetch created user" };
		}

		return mapDbUserToUser(createdUser);
	} catch (error) {
		console.error("Error creating user:", error);
		return { error: error instanceof Error ? error.message : "Failed to create user" };
	}
}

/**
 * Get user by ID
 */
export async function getUserById(
	userId: string,
): Promise<User | { error: string }> {
	try {
		const dbUser = await db.query.user.findFirst({
			where: eq(user.id, userId),
		});

		if (!dbUser) {
			return { error: "User not found" };
		}

		return mapDbUserToUser(dbUser);
	} catch (error) {
		console.error("Error getting user:", error);
		return { error: "Failed to get user" };
	}
}

/**
 * List users with filtering
 */
export async function listUsers(params: UserListParams) {
	try {
		const {
			company,
			permissionTemplate,
			isActive,
			search,
			limit = 50,
			offset = 0,
		} = params;

		// Build where conditions
		const conditions = [];

		if (company) {
			// Check if user has access to this company
			// User's companies array should contain this company ID
			conditions.push(sql`${user.companies} @> ARRAY[${company}]::text[]`);
		}

		if (permissionTemplate) {
			conditions.push(eq(user.permissionTemplate, permissionTemplate));
		}

		if (isActive !== undefined) {
			conditions.push(eq(user.isActive, isActive));
		}

		if (search) {
			conditions.push(
				or(
					ilike(user.name, `%${search}%`),
					ilike(user.email, `%${search}%`),
				),
			);
		}

		// Get users with pagination
		const users = await db.query.user.findMany({
			where: conditions.length > 0 ? and(...conditions) : undefined,
			limit,
			offset,
			orderBy: (user, { desc }) => [desc(user.createdAt)],
		});

		// Get total count
		const countResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(user)
			.where(conditions.length > 0 ? and(...conditions) : undefined);

		const total = Number(countResult[0]?.count || 0);

		return {
			users: users.map(mapDbUserToUser),
			total,
			limit,
			offset,
		};
	} catch (error) {
		console.error("Error listing users:", error);
		return { error: "Failed to list users" };
	}
}

/**
 * Update user
 */
export async function updateUser(
	userId: string,
	data: UpdateUserRequest,
): Promise<User | { error: string }> {
	try {
		const existingUser = await db.query.user.findFirst({
			where: eq(user.id, userId),
		});

		if (!existingUser) {
			return { error: "User not found" };
		}

		// Build update data
		const updateData: any = {
			updatedAt: new Date(),
		};

		if (data.name !== undefined) {
			updateData.name = data.name;
		}

		if (data.permissions !== undefined) {
			updateData.permissions = data.permissions;
		}

		if (data.companies !== undefined) {
			updateData.companies = data.companies;
		}

		if (data.permissionTemplate !== undefined) {
			updateData.permissionTemplate = data.permissionTemplate;
		}

		// Validate CLIENT_USER company constraints
		const finalTemplate = data.permissionTemplate !== undefined ? data.permissionTemplate : existingUser.permissionTemplate;
		const finalCompanies = data.companies !== undefined ? data.companies : existingUser.companies;

		if (finalTemplate === 'CLIENT_USER') {
			if (!finalCompanies || finalCompanies.length !== 1) {
				return { error: "CLIENT_USER must belong to exactly one company" };
			}
			if (finalCompanies[0] === '*') {
				return { error: "CLIENT_USER cannot have wildcard company access" };
			}
		}

		// Validate admin users have wildcard access
		if (finalTemplate === 'PMG_ADMIN' || finalTemplate === 'A2_STAFF') {
			if (!finalCompanies || !finalCompanies.includes('*')) {
				return { error: "Admin users must have wildcard company access" };
			}
		}

		// Update user
		await db.update(user).set(updateData).where(eq(user.id, userId));

		// Fetch updated user
		const updatedUser = await db.query.user.findFirst({
			where: eq(user.id, userId),
		});

		if (!updatedUser) {
			return { error: "Failed to update user" };
		}

		return mapDbUserToUser(updatedUser);
	} catch (error) {
		console.error("Error updating user:", error);
		return { error: "Failed to update user" };
	}
}

/**
 * Deactivate user (soft delete)
 */
export async function deactivateUser(
	userId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		await db
			.update(user)
			.set({
				isActive: false,
				deletedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(user.id, userId));

		return { success: true };
	} catch (error) {
		console.error("Error deactivating user:", error);
		return { success: false, error: "Failed to deactivate user" };
	}
}

/**
 * Reactivate user
 */
export async function reactivateUser(
	userId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		await db
			.update(user)
			.set({
				isActive: true,
				deletedAt: null,
				updatedAt: new Date(),
			})
			.where(eq(user.id, userId));

		return { success: true };
	} catch (error) {
		console.error("Error reactivating user:", error);
		return { success: false, error: "Failed to reactivate user" };
	}
}

/**
 * Map database user to API User type
 */
function mapDbUserToUser(dbUser: any): User {
	return {
		id: dbUser.id,
		email: dbUser.email,
		name: dbUser.name,
		permissions: dbUser.permissions || [],
		companies: dbUser.companies || [],
		permissionTemplate: dbUser.permissionTemplate,
		isActive: dbUser.isActive ?? true,
		lastLoginAt: dbUser.lastLoginAt,
		createdAt: dbUser.createdAt,
		updatedAt: dbUser.updatedAt,
		deletedAt: dbUser.deletedAt,
	};
}
