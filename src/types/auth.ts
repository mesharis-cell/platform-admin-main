// Permission Templates
export type PermissionTemplate = "PMG_ADMIN" | "A2_STAFF" | "CLIENT_USER";

// Permission strings for granular access control
export type Permission =
	// Authentication & Session
	| "auth:login"
	| "auth:logout"
	| "auth:reset_password"
	| "auth:manage_session"
	// User Management
	| "users:create"
	| "users:read"
	| "users:update"
	| "users:deactivate"
	| "users:assign_permissions"
	| "users:set_company_scope"
	// Company Management
	| "companies:create"
	| "companies:read"
	| "companies:update"
	| "companies:archive"
	| "companies:set_margin"
	// Warehouse Management
	| "warehouses:create"
	| "warehouses:read"
	| "warehouses:update"
	| "warehouses:archive"
	// Zone Management
	| "zones:create"
	| "zones:read"
	| "zones:update"
	| "zones:delete"
	| "zones:assign_company"
	// Brand Management
	| "brands:create"
	| "brands:read"
	| "brands:update"
	| "brands:delete"
	// Asset Management (Phase 3)
	| "assets:create"
	| "assets:read"
	| "assets:update"
	| "assets:delete"
	| "assets:generate_qr"
	| "assets:upload_photos"
	| "assets:set_specifications"
	| "assets:add_handling_tags"
	| "assets:assign_zone"
	// Collection Management (Phase 4)
	| "collections:create"
	| "collections:read"
	| "collections:update"
	| "collections:delete"
	| "collections:assign_assets"
	| "collections:check_availability"
	// Pricing Configuration (Phase 5)
	| "pricing_tiers:create"
	| "pricing_tiers:read"
	| "pricing_tiers:update"
	| "pricing_tiers:activate"
	| "pricing_tiers:deactivate"
	| "pricing_tiers:set_volume_range"
	| "pricing_tiers:set_base_price"
	// Pricing & Quoting (Phase 8)
	| "pricing:review"
	| "pricing:approve_standard"
	| "pricing:adjust"
	| "pricing:view_breakdown"
	| "pricing:pmg_review_adjustment"
	| "pricing:pmg_approve"
	| "pricing:adjust_margin"
	| "quotes:approve"
	| "quotes:decline"
	// Order Management (Phase 6, 7)
	| "orders:create"
	| "orders:read"
	| "orders:update"
	| "orders:delete"
	| "orders:view_all_companies"
	| "orders:add_job_number"
	| "orders:filter"
	| "orders:search"
	| "orders:view_status_history"
	| "orders:view_scanning_activity"
	| "orders:view_truck_photos"
	| "orders:export"
	// Invoicing (Phase 9)
	| "invoices:generate"
	| "invoices:send"
	| "invoices:read"
	| "invoices:download"
	| "invoices:confirm_payment"
	| "invoices:track_payment_status"
	// Order Lifecycle (Phase 10)
	| "lifecycle:progress_status"
	| "lifecycle:receive_notifications"
	| "lifecycle:view_status_history"
	| "orders:add_time_windows"
	// Notifications (Phase 10)
	| "notifications:view_failed"
	| "notifications:retry"
	// QR Code Scanning (Phase 11)
	| "scanning:scan_out"
	| "scanning:scan_in"
	| "scanning:inspect_condition"
	| "scanning:capture_truck_photos"
	| "scanning:record_discrepancies"
	| "scanning:view_progress"
	| "scanning:handle_individual"
	| "scanning:handle_batch"
	// Inventory Tracking (Phase 11)
	| "inventory:monitor_availability"
	| "inventory:track_status"
	| "inventory:record_location"
	| "inventory:view_last_scan"
	| "inventory:update_quantities"
	| "inventory:reserve_assets"
	| "inventory:release_assets"
	// Condition Management (Phase 12)
	| "conditions:update"
	| "conditions:add_notes"
	| "conditions:capture_damage_photos"
	| "conditions:view_history"
	| "conditions:view_items_needing_attention"
	| "conditions:filter_by_condition"
	| "conditions:add_maintenance_notes"
	| "conditions:complete_maintenance"
	| "conditions:log_maintenance_actions"
	// Analytics & Reporting (Phase 14)
	| "analytics:view_revenue"
	| "analytics:track_margin"
	| "analytics:filter_by_company"
	| "analytics:filter_by_time_period"
	// Wildcard permissions
	| "auth:*"
	| "users:*"
	| "companies:*"
	| "warehouses:*"
	| "zones:*"
	| "brands:*"
	| "assets:*"
	| "collections:*"
	| "pricing_tiers:*"
	| "pricing:*"
	| "quotes:*"
	| "orders:*"
	| "invoices:*"
	| "lifecycle:*"
	| "notifications:*"
	| "scanning:*"
	| "inventory:*"
	| "conditions:*"
	| "analytics:*"
	| "system:*"
	| string; // Allow custom permissions

// User object returned from API
export interface User {
	id: string;
	email: string;
	name: string;
	permissions: string[];
	companies: string[];
	permissionTemplate: PermissionTemplate | null;
	isActive: boolean;
	lastLoginAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
}

// Session object
export interface Session {
	user: User;
	expiresAt: Date;
}

// Create user request
export interface CreateUserRequest {
	email: string;
	name: string;
	password: string;
	permissionTemplate?: PermissionTemplate | null;
	permissions?: string[];
	companies?: string[];
}

// Update user request
export interface UpdateUserRequest {
	name?: string;
	permissions?: string[];
	companies?: string[];
	permissionTemplate?: PermissionTemplate | null;
}

// User list query params
export interface UserListParams {
	company?: string;
	permissionTemplate?: PermissionTemplate;
	isActive?: boolean;
	search?: string;
	limit?: number;
	offset?: number;
}

// User list response
export interface UserListResponse {
	users: User[];
	total: number;
	limit: number;
	offset: number;
}

// Permission template default configurations
export const PERMISSION_TEMPLATES: Record<
	PermissionTemplate,
	{
		permissions: string[];
		defaultCompanies: string[];
	}
> = {
	PMG_ADMIN: {
		permissions: [
			"auth:*",
			"users:*",
			"companies:*",
			"brands:*",
			"warehouses:*",
			"zones:*",
			"pricing_tiers:*",
			"orders:*",
			"pricing:*",
			"invoices:*",
			"lifecycle:*",
			"notifications:*",
			"analytics:*",
			"system:*",
			"assets:*",
			"collections:*",
			"conditions:*",
			"inventory:*",
			"quotes:*",
			"scanning:*"
		],
		defaultCompanies: ["*"],
	},
	A2_STAFF: {
		permissions: [
			"auth:*",
			"users:read",
			"companies:read",
			"brands:read",
			"warehouses:read",
			"zones:read",
			"assets:*",
			"collections:*",
			"orders:read",
			"orders:update",
			"orders:add_time_windows", // Phase 10
			"pricing:review",
			"pricing:approve_standard",
			"pricing:adjust",
			"lifecycle:progress_status", // Phase 10
			"lifecycle:receive_notifications", // Phase 10
			"scanning:*",
			"inventory:*",
			"conditions:*",
		],
		defaultCompanies: ["*"],
	},
	CLIENT_USER: {
		permissions: [
			"auth:*",
			"companies:read",
			"brands:read",
			"assets:read",
			"collections:read",
			"orders:create",
			"orders:read",
			"orders:update",
			"quotes:approve",
			"quotes:decline",
			"invoices:read",
			"invoices:download",
			"lifecycle:receive_notifications",
		],
		defaultCompanies: [], // Will be set to specific company on creation
	},
};
