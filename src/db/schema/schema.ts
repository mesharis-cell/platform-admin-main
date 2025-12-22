import { relations, sql } from 'drizzle-orm'
import {
	pgTable,
	text,
	timestamp,
	boolean,
	index,
	varchar,
	uuid,
	decimal,
	unique,
	integer,
	pgEnum,
} from 'drizzle-orm/pg-core'

export const user = pgTable(
	'user',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		email: text('email').notNull().unique(),
		emailVerified: boolean('email_verified').default(false).notNull(),
		image: text('image'),
		// RBAC fields for Phase 1
		permissions: text('permissions')
			.array()
			.notNull()
			.default(sql`ARRAY[]::text[]`),
		companies: text('companies')
			.array()
			.notNull()
			.default(sql`ARRAY[]::text[]`),
		permissionTemplate: varchar('permission_template', { length: 50 }),
		isActive: boolean('is_active').notNull().default(true),
		lastLoginAt: timestamp('last_login_at'),
		deletedAt: timestamp('deleted_at'),
		createdAt: timestamp('created_at').notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull(),
	},
	table => [
		index('user_companies_idx').on(table.companies),
		index('user_permissionTemplate_idx').on(table.permissionTemplate),
		index('user_isActive_idx').on(table.isActive),
		index('user_createdAt_idx').on(table.createdAt),
	]
)

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at').notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at').notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
	},
	table => [index('session_userId_idx').on(table.userId)]
)

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at'),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at').notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull(),
	},
	table => [index('account_userId_idx').on(table.userId)]
)

export const verification = pgTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull(),
	},
	table => [index('verification_identifier_idx').on(table.identifier)]
)

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	orders: many(orders),
}))

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}))

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}))

// ============================================================
// Phase 2: Multi-Tenancy & Core Configuration Tables
// ============================================================

// Companies table - Top-level tenant entities representing asset owners
export const companies = pgTable(
	'companies',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: varchar('name', { length: 255 }).notNull(),
		description: text('description'),
		logoUrl: varchar('logo_url', { length: 500 }),
		pmgMarginPercent: decimal('pmg_margin_percent', {
			precision: 5,
			scale: 2,
		})
			.notNull()
			.default('25.00'),
		contactEmail: varchar('contact_email', { length: 255 }),
		contactPhone: varchar('contact_phone', { length: 50 }),
		archivedAt: timestamp('archived_at'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull()
			.defaultNow(),
	},
	table => [
		index('companies_name_idx').on(table.name),
		index('companies_archived_at_idx').on(table.archivedAt),
		index('companies_created_at_idx').on(table.createdAt),
	]
)

// Warehouses table - Physical storage locations shared across all companies
export const warehouses = pgTable(
	'warehouses',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: varchar('name', { length: 255 }).notNull(),
		country: varchar('country', { length: 100 }).notNull(),
		city: varchar('city', { length: 100 }).notNull(),
		address: text('address').notNull(),
		archivedAt: timestamp('archived_at'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull()
			.defaultNow(),
	},
	table => [
		index('warehouses_name_idx').on(table.name),
		index('warehouses_country_idx').on(table.country),
		index('warehouses_city_idx').on(table.city),
		index('warehouses_country_city_idx').on(table.country, table.city),
		index('warehouses_archived_at_idx').on(table.archivedAt),
		// Partial unique constraint: name must be unique only for active (non-archived) warehouses
		// This is created via raw SQL in migration since Drizzle doesn't support partial indexes directly
	]
)

// Zones table - Company-exclusive areas within warehouses for physical asset storage
export const zones = pgTable(
	'zones',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		warehouse: uuid('warehouse')
			.notNull()
			.references(() => warehouses.id),
		company: uuid('company')
			.notNull()
			.references(() => companies.id),
		name: varchar('name', { length: 100 }).notNull(),
		description: text('description'),
		deletedAt: timestamp('deleted_at'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull()
			.defaultNow(),
	},
	table => [
		index('zones_warehouse_idx').on(table.warehouse),
		index('zones_company_idx').on(table.company),
		index('zones_deleted_at_idx').on(table.deletedAt),
		unique('zones_warehouse_company_name_unique').on(
			table.warehouse,
			table.company,
			table.name
		),
	]
)

// Brands table - Optional organizational units within companies for categorizing assets
export const brands = pgTable(
	'brands',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		company: uuid('company')
			.notNull()
			.references(() => companies.id),
		name: varchar('name', { length: 255 }).notNull(),
		description: text('description'),
		logoUrl: varchar('logo_url', { length: 500 }),
		deletedAt: timestamp('deleted_at'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull()
			.defaultNow(),
	},
	table => [
		index('brands_company_idx').on(table.company),
		index('brands_deleted_at_idx').on(table.deletedAt),
		unique('brands_company_name_unique').on(table.company, table.name),
	]
)

// Relations for Phase 2 tables (updated in Phase 3 to include assets, Phase 4 to include collections, Phase 6 to include orders)
export const companiesRelations = relations(companies, ({ many }) => ({
	brands: many(brands),
	zones: many(zones),
	assets: many(assets),
	collections: many(collections),
	orders: many(orders),
}))

export const warehousesRelations = relations(warehouses, ({ many }) => ({
	zones: many(zones),
	assets: many(assets),
}))

export const zonesRelations = relations(zones, ({ one, many }) => ({
	warehouse: one(warehouses, {
		fields: [zones.warehouse],
		references: [warehouses.id],
	}),
	company: one(companies, {
		fields: [zones.company],
		references: [companies.id],
	}),
	assets: many(assets),
}))

export const brandsRelations = relations(brands, ({ one, many }) => ({
	company: one(companies, {
		fields: [brands.company],
		references: [companies.id],
	}),
	assets: many(assets),
	collections: many(collections),
}))

// ============================================================
// Phase 3: Asset Management & QR Code Generation Tables
// ============================================================

// Enums for Phase 3
export const trackingMethodEnum = pgEnum('tracking_method', [
	'INDIVIDUAL',
	'BATCH',
])
export const conditionEnum = pgEnum('condition', ['GREEN', 'ORANGE', 'RED'])
export const assetStatusEnum = pgEnum('asset_status', [
	'AVAILABLE',
	'BOOKED',
	'OUT',
	'IN_MAINTENANCE',
])

// Assets table - Physical inventory items tracked individually or in batches
// Feedback #4 & #5: Removed quantity fields, availability now calculated from asset_bookings
export const assets = pgTable(
	'assets',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		company: uuid('company')
			.notNull()
			.references(() => companies.id),
		brand: uuid('brand').references(() => brands.id),
		warehouse: uuid('warehouse')
			.notNull()
			.references(() => warehouses.id),
		zone: uuid('zone')
			.notNull()
			.references(() => zones.id),
		name: varchar('name', { length: 255 }).notNull(),
		description: text('description'),
		category: varchar('category', { length: 100 }).notNull(),
		images: text('images')
			.array()
			.notNull()
			.default(sql`ARRAY[]::text[]`),
		trackingMethod: trackingMethodEnum('tracking_method').notNull(),
		totalQuantity: integer('total_quantity').notNull().default(1),
		qrCode: varchar('qr_code', { length: 255 }).notNull().unique(),
		packaging: varchar('packaging', { length: 255 }),
		weight: decimal('weight', { precision: 10, scale: 2 }).notNull(),
		dimensionLength: decimal('dimension_length', {
			precision: 10,
			scale: 2,
		}).notNull(),
		dimensionWidth: decimal('dimension_width', {
			precision: 10,
			scale: 2,
		}).notNull(),
		dimensionHeight: decimal('dimension_height', {
			precision: 10,
			scale: 2,
		}).notNull(),
		volume: decimal('volume', { precision: 10, scale: 3 }).notNull(),
		condition: conditionEnum('condition').notNull().default('GREEN'),
		status: assetStatusEnum('status').notNull().default('AVAILABLE'),
		// Feedback #2: Add refurb days estimate for damaged items
		refurbDaysEstimate: integer('refurb_days_estimate'),
		handlingTags: text('handling_tags')
			.array()
			.notNull()
			.default(sql`ARRAY[]::text[]`),
		lastScannedAt: timestamp('last_scanned_at'),
		lastScannedBy: text('last_scanned_by').references(() => user.id),
		deletedAt: timestamp('deleted_at'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull()
			.defaultNow(),
	},
	table => [
		index('assets_company_idx').on(table.company),
		index('assets_brand_idx').on(table.brand),
		index('assets_warehouse_idx').on(table.warehouse),
		index('assets_zone_idx').on(table.zone),
		index('assets_qr_code_idx').on(table.qrCode),
		index('assets_category_idx').on(table.category),
		index('assets_condition_idx').on(table.condition),
		index('assets_status_idx').on(table.status),
		index('assets_company_name_idx').on(table.company, table.name),
		index('assets_deleted_at_idx').on(table.deletedAt),
	]
)

// Asset Condition History table - Timestamped log of all condition changes
export const assetConditionHistory = pgTable(
	'asset_condition_history',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		asset: uuid('asset')
			.notNull()
			.references(() => assets.id, { onDelete: 'cascade' }),
		condition: conditionEnum('condition').notNull(),
		notes: text('notes'),
		photos: text('photos')
			.array()
			.notNull()
			.default(sql`ARRAY[]::text[]`),
		updatedBy: text('updated_by')
			.notNull()
			.references(() => user.id),
		timestamp: timestamp('timestamp').notNull().defaultNow(),
	},
	table => [
		index('asset_condition_history_asset_idx').on(table.asset),
		index('asset_condition_history_timestamp_idx').on(table.timestamp),
		index('asset_condition_history_asset_timestamp_idx').on(
			table.asset,
			table.timestamp
		),
	]
)

// Asset Bookings table - Date-based availability tracking (Feedback #4 & #5)
export const assetBookings = pgTable(
	'asset_bookings',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		asset: uuid('asset')
			.notNull()
			.references(() => assets.id, { onDelete: 'cascade' }),
		order: uuid('order')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		quantity: integer('quantity').notNull(),
		blockedFrom: timestamp('blocked_from', { mode: 'date' }).notNull(),
		blockedUntil: timestamp('blocked_until', { mode: 'date' }).notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull()
			.defaultNow(),
	},
	table => [
		index('asset_bookings_asset_idx').on(table.asset),
		index('asset_bookings_order_idx').on(table.order),
		index('asset_bookings_dates_idx').on(
			table.blockedFrom,
			table.blockedUntil
		),
		index('asset_bookings_asset_dates_idx').on(
			table.asset,
			table.blockedFrom,
			table.blockedUntil
		),
	]
)

// ========================================
// Phase 4: Collections & Catalog System
// ========================================

// Collections table - Pre-defined bundles of assets
export const collections = pgTable(
	'collections',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		company: uuid('company')
			.notNull()
			.references(() => companies.id),
		brand: uuid('brand').references(() => brands.id),
		name: varchar('name', { length: 255 }).notNull(),
		description: text('description'),
		images: text('images')
			.array()
			.notNull()
			.default(sql`ARRAY[]::text[]`),
		category: varchar('category', { length: 100 }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull()
			.defaultNow(),
		deletedAt: timestamp('deleted_at'),
	},
	table => [
		index('collections_company_idx').on(table.company),
		index('collections_brand_idx').on(table.brand),
		index('collections_company_name_idx').on(table.company, table.name),
		index('collections_deleted_at_idx').on(table.deletedAt),
	]
)

// Collection Items table - Junction table linking collections to assets
export const collectionItems = pgTable(
	'collection_items',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		collection: uuid('collection')
			.notNull()
			.references(() => collections.id, { onDelete: 'cascade' }),
		asset: uuid('asset')
			.notNull()
			.references(() => assets.id),
		defaultQuantity: integer('default_quantity').notNull().default(1),
		notes: text('notes'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	table => [
		index('collection_items_collection_idx').on(table.collection),
		index('collection_items_asset_idx').on(table.asset),
		unique('collection_items_collection_asset_unique').on(
			table.collection,
			table.asset
		),
	]
)

// Relations for Phase 3 tables (updated in Phase 6 to include orderItems)
export const assetsRelations = relations(assets, ({ one, many }) => ({
	company: one(companies, {
		fields: [assets.company],
		references: [companies.id],
	}),
	brand: one(brands, {
		fields: [assets.brand],
		references: [brands.id],
	}),
	warehouse: one(warehouses, {
		fields: [assets.warehouse],
		references: [warehouses.id],
	}),
	zone: one(zones, {
		fields: [assets.zone],
		references: [zones.id],
	}),
	lastScannedByUser: one(user, {
		fields: [assets.lastScannedBy],
		references: [user.id],
	}),
	conditionHistory: many(assetConditionHistory),
	collectionItems: many(collectionItems),
	orderItems: many(orderItems),
	scanEvents: many(scanEvents), // Phase 11
	bookings: many(assetBookings), // Feedback #4 & #5
}))

export const assetConditionHistoryRelations = relations(
	assetConditionHistory,
	({ one }) => ({
		asset: one(assets, {
			fields: [assetConditionHistory.asset],
			references: [assets.id],
		}),
		updatedByUser: one(user, {
			fields: [assetConditionHistory.updatedBy],
			references: [user.id],
		}),
	})
)

// Relations for Phase 4 tables (updated in Phase 6 to include orderItems)
export const collectionsRelations = relations(collections, ({ one, many }) => ({
	company: one(companies, {
		fields: [collections.company],
		references: [companies.id],
	}),
	brand: one(brands, {
		fields: [collections.brand],
		references: [brands.id],
	}),
	items: many(collectionItems),
	orderItems: many(orderItems),
}))

export const collectionItemsRelations = relations(
	collectionItems,
	({ one }) => ({
		collection: one(collections, {
			fields: [collectionItems.collection],
			references: [collections.id],
		}),
		asset: one(assets, {
			fields: [collectionItems.asset],
			references: [assets.id],
		}),
	})
)

// ============================================================
// Phase 5: Pricing Configuration Tables
// ============================================================

// Pricing Tiers table - Volume-based and location-based pricing structures
export const pricingTiers = pgTable(
	'pricing_tiers',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		country: varchar('country', { length: 100 }).notNull(),
		city: varchar('city', { length: 100 }).notNull(),
		volumeMin: decimal('volume_min', { precision: 10, scale: 3 }).notNull(),
		volumeMax: decimal('volume_max', { precision: 10, scale: 3 }).notNull(),
		basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull()
			.defaultNow(),
	},
	table => [
		index('pricing_tiers_location_idx').on(table.country, table.city),
		index('pricing_tiers_active_idx').on(table.isActive),
		index('pricing_tiers_lookup_idx').on(
			table.country,
			table.city,
			table.volumeMin,
			table.volumeMax
		),
	]
)

// Relations for Phase 5 tables
export const pricingTiersRelations = relations(pricingTiers, ({ many }) => ({
	orders: many(orders),
}))

// ============================================================
// Phase 6: Order Creation & Submission Tables
// ============================================================

// Order Status enum - Fulfillment lifecycle only (Feedback #1)
export const orderStatusEnum = pgEnum('order_status', [
	'DRAFT',
	'SUBMITTED',
	'PRICING_REVIEW',
	'PENDING_APPROVAL',
	'QUOTED',
	'DECLINED',
	'CONFIRMED',
	'IN_PREPARATION',
	'READY_FOR_DELIVERY',
	'IN_TRANSIT',
	'DELIVERED',
	'IN_USE',
	'AWAITING_RETURN',
	'CLOSED',
])

export const financialStatusEnum = pgEnum('financial_status', [
	'PENDING_QUOTE',
	'QUOTE_SENT',
	'QUOTE_ACCEPTED',
	'PENDING_INVOICE',
	'INVOICED',
	'PAID',
])

// Orders table - Event-based requests for assets progressing through multi-stage lifecycle
export const orders = pgTable(
	'orders',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		orderId: varchar('order_id', { length: 50 }).notNull().unique(),
		company: uuid('company')
			.notNull()
			.references(() => companies.id),
		brand: uuid('brand').references(() => brands.id),
		userId: text('user_id')
			.notNull()
			.references(() => user.id),
		// Contact information
		contactName: varchar('contact_name', { length: 255 }),
		contactEmail: varchar('contact_email', { length: 255 }),
		contactPhone: varchar('contact_phone', { length: 50 }),
		// Event details
		eventStartDate: timestamp('event_start_date', { mode: 'date' }),
		eventEndDate: timestamp('event_end_date', { mode: 'date' }),
		// Venue information
		venueName: varchar('venue_name', { length: 255 }),
		venueCountry: varchar('venue_country', { length: 100 }),
		venueCity: varchar('venue_city', { length: 100 }),
		venueAddress: text('venue_address'),
		venueAccessNotes: text('venue_access_notes'),
		// Special instructions
		specialInstructions: text('special_instructions'),
		// Calculated totals
		calculatedVolume: decimal('calculated_volume', {
			precision: 10,
			scale: 3,
		})
			.notNull()
			.default('0'),
		calculatedWeight: decimal('calculated_weight', {
			precision: 10,
			scale: 2,
		})
			.notNull()
			.default('0'),
		// Pricing tier reference
		pricingTier: uuid('pricing_tier').references(() => pricingTiers.id),
		// Pricing fields (Phase 8)
		a2BasePrice: decimal('a2_base_price', { precision: 10, scale: 2 }),
		a2AdjustedPrice: decimal('a2_adjusted_price', {
			precision: 10,
			scale: 2,
		}),
		a2AdjustmentReason: text('a2_adjustment_reason'),
		a2AdjustedAt: timestamp('a2_adjusted_at'),
		a2AdjustedBy: text('a2_adjusted_by').references(() => user.id),
		pmgMarginPercent: decimal('pmg_margin_percent', {
			precision: 5,
			scale: 2,
		}),
		pmgMarginAmount: decimal('pmg_margin_amount', {
			precision: 10,
			scale: 2,
		}),
		pmgReviewedAt: timestamp('pmg_reviewed_at'),
		pmgReviewedBy: text('pmg_reviewed_by').references(() => user.id),
		pmgReviewNotes: text('pmg_review_notes'),
		finalTotalPrice: decimal('final_total_price', {
			precision: 10,
			scale: 2,
		}),
		quoteSentAt: timestamp('quote_sent_at'),
		// Invoice fields (Phase 9)
		invoiceNumber: varchar('invoice_number', { length: 100 }),
		invoiceGeneratedAt: timestamp('invoice_generated_at'),
		invoicePdfUrl: varchar('invoice_pdf_url', { length: 500 }),
		invoicePaidAt: timestamp('invoice_paid_at'),
		paymentMethod: varchar('payment_method', { length: 100 }),
		paymentReference: varchar('payment_reference', { length: 255 }),
		// Time windows (Phase 10)
		deliveryWindowStart: timestamp('delivery_window_start'),
		deliveryWindowEnd: timestamp('delivery_window_end'),
		pickupWindowStart: timestamp('pickup_window_start'),
		pickupWindowEnd: timestamp('pickup_window_end'),
		// Truck photos (Phase 11)
		truckPhotos: text('truck_photos')
			.array()
			.notNull()
			.default(sql`ARRAY[]::text[]`),
		// Job number (Phase 7)
		jobNumber: varchar('job_number', { length: 100 }),
		// Status (Feedback #1: Separate financial from fulfillment)
		status: orderStatusEnum('status').notNull().default('DRAFT'),
		financialStatus: financialStatusEnum('financial_status')
			.notNull()
			.default('PENDING_QUOTE'),
		// Timestamps
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull()
			.defaultNow(),
		deletedAt: timestamp('deleted_at'),
	},
	table => [
		index('orders_order_id_idx').on(table.orderId),
		index('orders_company_idx').on(table.company),
		index('orders_brand_idx').on(table.brand),
		index('orders_user_id_idx').on(table.userId),
		index('orders_status_idx').on(table.status),
		index('orders_event_start_date_idx').on(table.eventStartDate),
		index('orders_venue_city_idx').on(table.venueCity),
		index('orders_invoice_number_idx').on(table.invoiceNumber),
		index('orders_company_order_id_idx').on(table.company, table.orderId),
		index('orders_company_status_idx').on(table.company, table.status),
		index('orders_created_at_idx').on(table.createdAt),
		index('orders_deleted_at_idx').on(table.deletedAt),
	]
)

// Order Items table - Junction table linking orders to assets with denormalized metadata
export const orderItems = pgTable(
	'order_items',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		order: uuid('order')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		asset: uuid('asset')
			.notNull()
			.references(() => assets.id),
		// Denormalized asset details (preserve state at time of order)
		assetName: varchar('asset_name', { length: 255 }).notNull(),
		quantity: integer('quantity').notNull(),
		volume: decimal('volume', { precision: 10, scale: 3 }).notNull(),
		weight: decimal('weight', { precision: 10, scale: 2 }).notNull(),
		totalVolume: decimal('total_volume', {
			precision: 10,
			scale: 3,
		}).notNull(),
		totalWeight: decimal('total_weight', {
			precision: 10,
			scale: 2,
		}).notNull(),
		condition: conditionEnum('condition').notNull(),
		handlingTags: text('handling_tags')
			.array()
			.notNull()
			.default(sql`ARRAY[]::text[]`),
		// Collection reference (if added via collection)
		fromCollection: uuid('from_collection').references(
			() => collections.id
		),
		fromCollectionName: varchar('from_collection_name', { length: 255 }),
		// Timestamps
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	table => [
		index('order_items_order_idx').on(table.order),
		index('order_items_asset_idx').on(table.asset),
		index('order_items_order_asset_idx').on(table.order, table.asset),
	]
)

// Order Status History table - Timestamped log of all state transitions (populated in Phase 10)
export const orderStatusHistory = pgTable(
	'order_status_history',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		order: uuid('order')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		status: orderStatusEnum('status').notNull(),
		notes: text('notes'),
		updatedBy: text('updated_by')
			.notNull()
			.references(() => user.id),
		timestamp: timestamp('timestamp').notNull().defaultNow(),
	},
	table => [
		index('order_status_history_order_idx').on(table.order),
		index('order_status_history_timestamp_idx').on(table.timestamp),
		index('order_status_history_order_timestamp_idx').on(
			table.order,
			table.timestamp
		),
	]
)

// Relations for Phase 6 tables
export const ordersRelations = relations(orders, ({ one, many }) => ({
	company: one(companies, {
		fields: [orders.company],
		references: [companies.id],
	}),
	brand: one(brands, {
		fields: [orders.brand],
		references: [brands.id],
	}),
	user: one(user, {
		fields: [orders.userId],
		references: [user.id],
	}),
	pricingTier: one(pricingTiers, {
		fields: [orders.pricingTier],
		references: [pricingTiers.id],
	}),
	a2AdjustedByUser: one(user, {
		fields: [orders.a2AdjustedBy],
		references: [user.id],
	}),
	pmgReviewedByUser: one(user, {
		fields: [orders.pmgReviewedBy],
		references: [user.id],
	}),
	items: many(orderItems),
	statusHistory: many(orderStatusHistory),
	notificationLogs: many(notificationLogs), // Phase 10
	scanEvents: many(scanEvents), // Phase 11
	assetBookings: many(assetBookings), // Feedback #4 & #5
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
	order: one(orders, {
		fields: [orderItems.order],
		references: [orders.id],
	}),
	asset: one(assets, {
		fields: [orderItems.asset],
		references: [assets.id],
	}),
	collection: one(collections, {
		fields: [orderItems.fromCollection],
		references: [collections.id],
	}),
}))

export const orderStatusHistoryRelations = relations(
	orderStatusHistory,
	({ one }) => ({
		order: one(orders, {
			fields: [orderStatusHistory.order],
			references: [orders.id],
		}),
		updatedByUser: one(user, {
			fields: [orderStatusHistory.updatedBy],
			references: [user.id],
		}),
	})
)

// Notification Status Enum (Phase 10)
export const notificationStatusEnum = pgEnum('notification_status', [
	'QUEUED',
	'SENT',
	'FAILED',
	'RETRYING',
])

// Notification Logs table - Track all email notification attempts (Phase 10)
export const notificationLogs = pgTable(
	'notification_logs',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		order: uuid('order')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		notificationType: varchar('notification_type', {
			length: 100,
		}).notNull(),
		recipients: text('recipients').notNull(), // JSON string with to/cc/bcc arrays
		status: notificationStatusEnum('status').notNull().default('QUEUED'),
		attempts: integer('attempts').notNull().default(1),
		lastAttemptAt: timestamp('last_attempt_at').notNull().defaultNow(),
		sentAt: timestamp('sent_at'),
		messageId: varchar('message_id', { length: 255 }),
		errorMessage: text('error_message'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	table => [
		index('notification_logs_order_idx').on(table.order),
		index('notification_logs_status_idx').on(table.status),
		index('notification_logs_notification_type_idx').on(
			table.notificationType
		),
		index('notification_logs_order_notification_type_idx').on(
			table.order,
			table.notificationType
		),
		index('notification_logs_created_at_idx').on(table.createdAt),
	]
)

// Notification Logs Relations
export const notificationLogsRelations = relations(
	notificationLogs,
	({ one }) => ({
		order: one(orders, {
			fields: [notificationLogs.order],
			references: [orders.id],
		}),
	})
)

// ============================================================
// Phase 11: QR Code Scanning & Inventory Tracking
// ============================================================

// Scan Type Enum - Type of scanning operation (Phase 11)
export const scanTypeEnum = pgEnum('scan_type', ['OUTBOUND', 'INBOUND'])

// Discrepancy Reason Enum - Reasons for missing items during inbound scan (Phase 11)
export const discrepancyReasonEnum = pgEnum('discrepancy_reason', [
	'BROKEN',
	'LOST',
	'OTHER',
])

// Scan Events table - Record all QR code scanning events (Phase 11)
export const scanEvents = pgTable(
	'scan_events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		order: uuid('order')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		asset: uuid('asset')
			.notNull()
			.references(() => assets.id),
		scanType: scanTypeEnum('scan_type').notNull(),
		quantity: integer('quantity').notNull(),
		condition: conditionEnum('condition').notNull(),
		notes: text('notes'),
		photos: text('photos')
			.array()
			.notNull()
			.default(sql`ARRAY[]::text[]`),
		discrepancyReason: discrepancyReasonEnum('discrepancy_reason'),
		scannedBy: text('scanned_by')
			.notNull()
			.references(() => user.id),
		scannedAt: timestamp('scanned_at').notNull().defaultNow(),
	},
	table => [
		index('scan_events_order_idx').on(table.order),
		index('scan_events_asset_idx').on(table.asset),
		index('scan_events_scan_type_idx').on(table.scanType),
		index('scan_events_scanned_at_idx').on(table.scannedAt),
		index('scan_events_order_scan_type_idx').on(
			table.order,
			table.scanType
		),
		index('scan_events_asset_scanned_at_idx').on(
			table.asset,
			table.scannedAt
		),
	]
)

// Scan Events Relations
export const scanEventsRelations = relations(scanEvents, ({ one }) => ({
	order: one(orders, {
		fields: [scanEvents.order],
		references: [orders.id],
	}),
	asset: one(assets, {
		fields: [scanEvents.asset],
		references: [assets.id],
	}),
	scannedByUser: one(user, {
		fields: [scanEvents.scannedBy],
		references: [user.id],
	}),
}))

// Asset Bookings Relations (Feedback #4 & #5)
export const assetBookingsRelations = relations(assetBookings, ({ one }) => ({
	asset: one(assets, {
		fields: [assetBookings.asset],
		references: [assets.id],
	}),
	order: one(orders, {
		fields: [assetBookings.order],
		references: [orders.id],
	}),
}))
