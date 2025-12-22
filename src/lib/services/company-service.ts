/**
 * Company Service
 * Business logic for company management (CRUD operations)
 */

import { db } from "@/db";
import { companies } from "@/db/schema";
import { eq, and, ilike, isNull, isNotNull, sql, desc, inArray } from "drizzle-orm";
import type {
	Company,
	CreateCompanyRequest,
	UpdateCompanyRequest,
	CompanyListParams,
	CompanyListResponse,
} from "@/types";

/**
 * Create a new company
 */
export async function createCompany(
	data: CreateCompanyRequest,
): Promise<Company> {
	// Format margin percent to 2 decimal places
	const formattedMargin = data.pmgMarginPercent
		? Number(data.pmgMarginPercent).toFixed(2)
		: "25.00";

	// Validate margin is non-negative
	if (parseFloat(formattedMargin) < 0) {
		throw new Error("PMG margin percent must be non-negative");
	}

	// Validate email format if provided
	if (data.contactEmail && !isValidEmail(data.contactEmail)) {
		throw new Error("Invalid email format");
	}

	// Validate logo URL if provided
	if (
		data.contactPhone &&
		(data.contactPhone.length < 1 || data.contactPhone.length > 50)
	) {
		throw new Error("Contact phone must be between 1 and 50 characters");
	}

	const [company] = await db
		.insert(companies)
		.values({
			name: data.name.trim(),
			description: data.description?.trim() || null,
			logoUrl: data.logoUrl?.trim() || null,
			pmgMarginPercent: formattedMargin,
			contactEmail: data.contactEmail?.trim() || null,
			contactPhone: data.contactPhone?.trim() || null,
		})
		.returning();

	return mapDbCompanyToCompany(company);
}

/**
 * Get company by ID
 */
export async function getCompanyById(id: string): Promise<Company | null> {
	const [company] = await db
		.select()
		.from(companies)
		.where(eq(companies.id, id));

	return company ? mapDbCompanyToCompany(company) : null;
}

/**
 * List companies with filtering and pagination
 */
export async function listCompanies(
	params: CompanyListParams,
	userCompanies: string[] | null, // null means wildcard access ["*"]
): Promise<CompanyListResponse> {
	const {
		includeArchived = false,
		search,
		limit = 50,
		offset = 0,
	} = params;

	// Validate limit
	const validLimit = Math.min(Math.max(1, limit), 100);

	// Build where conditions
	const conditions = [];

	// Company scope filtering
	if (userCompanies !== null && userCompanies.length > 0) {
		conditions.push(inArray(companies.id, userCompanies));
	}

	// Archive filtering
	if (!includeArchived) {
		conditions.push(isNull(companies.archivedAt));
	}

	// Search filtering
	if (search && search.trim()) {
		conditions.push(ilike(companies.name, `%${search.trim()}%`));
	}

	// Combine conditions
	const whereClause =
		conditions.length > 0 ? and(...conditions) : undefined;

	// Get total count
	const [countResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(companies)
		.where(whereClause);

	const total = countResult?.count || 0;

	// Get paginated results
	const results = await db
		.select()
		.from(companies)
		.where(whereClause)
		.orderBy(desc(companies.createdAt))
		.limit(validLimit)
		.offset(offset);

	return {
		companies: results.map(mapDbCompanyToCompany),
		total,
		limit: validLimit,
		offset,
	};
}

/**
 * Update company
 */
export async function updateCompany(
	id: string,
	data: UpdateCompanyRequest,
): Promise<Company> {
	const updates: Record<string, unknown> = {
		updatedAt: new Date(),
	};

	if (data.name !== undefined) {
		updates.name = data.name.trim();
	}

	if (data.description !== undefined) {
		updates.description = data.description?.trim() || null;
	}

	if (data.logoUrl !== undefined) {
		updates.logoUrl = data.logoUrl?.trim() || null;
	}

	if (data.pmgMarginPercent !== undefined) {
		const formattedMargin = Number(data.pmgMarginPercent).toFixed(2);
		if (parseFloat(formattedMargin) < 0) {
			throw new Error("PMG margin percent must be non-negative");
		}
		updates.pmgMarginPercent = formattedMargin;
	}

	if (data.contactEmail !== undefined) {
		if (data.contactEmail && !isValidEmail(data.contactEmail)) {
			throw new Error("Invalid email format");
		}
		updates.contactEmail = data.contactEmail?.trim() || null;
	}

	if (data.contactPhone !== undefined) {
		if (
			data.contactPhone &&
			(data.contactPhone.length < 1 || data.contactPhone.length > 50)
		) {
			throw new Error("Contact phone must be between 1 and 50 characters");
		}
		updates.contactPhone = data.contactPhone?.trim() || null;
	}

	const [company] = await db
		.update(companies)
		.set(updates)
		.where(eq(companies.id, id))
		.returning();

	if (!company) {
		throw new Error("Company not found");
	}

	return mapDbCompanyToCompany(company);
}

/**
 * Archive company (soft delete)
 */
export async function archiveCompany(id: string): Promise<void> {
	const [company] = await db
		.update(companies)
		.set({
			archivedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(companies.id, id))
		.returning();

	if (!company) {
		throw new Error("Company not found");
	}
}

/**
 * Map database company record to API Company type
 */
function mapDbCompanyToCompany(dbCompany: typeof companies.$inferSelect): Company {
	return {
		id: dbCompany.id,
		name: dbCompany.name,
		description: dbCompany.description,
		logoUrl: dbCompany.logoUrl,
		pmgMarginPercent: dbCompany.pmgMarginPercent,
		contactEmail: dbCompany.contactEmail,
		contactPhone: dbCompany.contactPhone,
		archivedAt: dbCompany.archivedAt,
		createdAt: dbCompany.createdAt,
		updatedAt: dbCompany.updatedAt,
	};
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}
