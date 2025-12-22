import { db } from "@/db";
import { user, account } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PERMISSION_TEMPLATES } from "@/types/auth";
import { auth } from "../auth/server";

/**
 * Seed initial PMG Admin account
 * Email: admin@pmg.com
 * Password: from INITIAL_ADMIN_PASSWORD env var or default "Admin123!"
 */
export async function seedInitialAdmin() {
	try {
		const adminEmail = "admin@pmg.com";

		// Check if admin already exists
		const existingAdmin = await db.query.user.findFirst({
			where: eq(user.email, adminEmail),
		});

		if (existingAdmin) {
			console.log("✅ Initial admin account already exists");
			return;
		}

		// Get password from env or use default
		const password = process.env.INITIAL_ADMIN_PASSWORD || "Admin123!";

		// Get permission template defaults
		const template = PERMISSION_TEMPLATES.PMG_ADMIN;

		// Create user using better-auth server API
		const result = await auth.api.signUpEmail({
			body: {
				email: adminEmail,
				password: password,
				name: "PMG Admin",
				// Additional fields will be set after user creation
			},
		});

		if (!result) {
			throw new Error("Failed to create admin user");
		}

		// Update user with permission template and permissions
		await db
			.update(user)
			.set({
				permissionTemplate: "PMG_ADMIN",
				permissions: template.permissions,
				companies: template.defaultCompanies,
				isActive: true,
				updatedAt: new Date(),
			})
			.where(eq(user.email, adminEmail));

		console.log("✅ Initial admin account created successfully");
		console.log(`   Email: ${adminEmail}`);
		console.log(`   Password: ${password}`);
		console.log(
			"   ⚠️  Please change this password after first login in production!",
		);
	} catch (error) {
		console.error("❌ Error seeding initial admin:", error);
		throw error;
	}
}

/**
 * Seed system user for automated transitions (Phase 10)
 * Email: system@system.internal
 * Used for: Cron jobs, automatic status transitions
 */
export async function seedSystemUser() {
	try {
		const systemEmail = "system@system.internal";

		// Check if system user already exists
		const existingSystem = await db.query.user.findFirst({
			where: eq(user.email, systemEmail),
		});

		if (existingSystem) {
			console.log("✅ System user already exists");
			return;
		}

		// Get permission template defaults
		const template = PERMISSION_TEMPLATES.PMG_ADMIN;

		// Generate a secure random password (never to be used for login)
		const systemPassword = crypto.randomUUID() + crypto.randomUUID();

		// Create system user using better-auth server API
		const result = await auth.api.signUpEmail({
			body: {
				email: systemEmail,
				password: systemPassword,
				name: "System",
			},
		});

		if (!result) {
			throw new Error("Failed to create system user");
		}

		// Update user with permission template and permissions
		await db
			.update(user)
			.set({
				permissionTemplate: "PMG_ADMIN",
				permissions: template.permissions,
				companies: template.defaultCompanies,
				isActive: true,
				updatedAt: new Date(),
			})
			.where(eq(user.email, systemEmail));

		console.log("✅ System user created successfully");
		console.log(`   Email: ${systemEmail}`);
		console.log(`   Name: System`);
		console.log(`   Note: System user has a secure random password for security`);
	} catch (error) {
		console.error("❌ Error seeding system user:", error);
		throw error;
	}
}

/**
 * Run all seeds
 * Pass includeDemoData=true to also seed comprehensive demo data
 */
export async function runSeeds(includeDemoData: boolean = false) {
	console.log("🌱 Starting database seeding...");
	await seedInitialAdmin();
	await seedSystemUser(); // Phase 10: System user for automated transitions

	if (includeDemoData) {
		console.log("\n🎨 Seeding demo data...");
		const { seedDemoData } = await import('./seed-demo');
		await seedDemoData();
	}

	console.log("✅ Database seeding completed!");
}
