export type UserRole = "ADMIN" | "LOGISTICS" | "CLIENT";

export interface AccessPolicy {
    id: string;
    platform_id?: string;
    code: string;
    name: string;
    description?: string | null;
    role: UserRole;
    permissions: string[];
    is_active: boolean;
    assigned_user_count?: number;
    created_at?: Date | string;
    updated_at?: Date | string;
}

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
    | "users:manage_password"
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
    // Location Management
    | "countries:create"
    | "countries:read"
    | "countries:update"
    | "countries:delete"
    | "cities:create"
    | "cities:read"
    | "cities:update"
    | "cities:delete"
    // Asset Management (Phase 3)
    | "assets:create"
    | "assets:read"
    | "assets:update"
    | "assets:delete"
    | "assets:generate_qr"
    | "assets:upload_photos"
    | "assets:check_availability"
    | "assets:availability_stats"
    | "assets:scan_history"
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
    // Teams & Stock Intake
    | "teams:create"
    | "teams:read"
    | "teams:update"
    | "teams:delete"
    | "teams:manage_members"
    | "inbound_requests:create"
    | "inbound_requests:read"
    | "inbound_requests:update"
    | "service_requests:create"
    | "service_requests:read"
    | "service_requests:update"
    | "line_item_requests:create"
    | "line_item_requests:read"
    | "line_item_requests:review"
    | "workflow_requests:read"
    | "workflow_requests:update"
    | "workflow_definitions:read"
    | "workflow_definitions:update"
    | "attachment_types:read"
    | "attachment_types:update"
    | "notification_rules:read"
    | "notification_rules:update"
    | "access_policies:read"
    | "access_policies:update"
    | "platform_settings:read"
    | "platform_settings:update"
    | "warehouse_ops_rates:read"
    | "warehouse_ops_rates:update"
    | "service_types:manage"
    // Page visibility
    | "analytics:view_page"
    | "analytics:view_reports_page"
    | "orders:view_page"
    | "orders:view_pending_approval_page"
    | "service_requests:view_page"
    | "workflow_requests:view_page"
    | "line_item_requests:view_page"
    | "self_bookings:view_page"
    | "calendar:view_page"
    | "invoices:view_page"
    | "assets:view_page"
    | "collections:view_page"
    | "inbound_requests:view_page"
    | "conditions:view_page"
    | "warehouses:view_page"
    | "zones:view_page"
    | "users:view_page"
    | "companies:view_page"
    | "brands:view_page"
    | "teams:view_page"
    | "platform_settings:view_page"
    | "notification_rules:view_page"
    | "attachment_types:view_page"
    | "workflow_definitions:view_page"
    | "access_policies:view_page"
    | "service_types:view_page"
    | "warehouse_ops_rates:view_page"
    | "countries:view_page"
    | "cities:view_page"
    // Pricing & Quoting (Phase 8)
    | "pricing:review"
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
    | "countries:*"
    | "cities:*"
    | "assets:*"
    | "collections:*"
    | "teams:*"
    | "inbound_requests:*"
    | "service_requests:*"
    | "line_item_requests:*"
    | "workflow_requests:*"
    | "workflow_definitions:*"
    | "attachment_types:*"
    | "notification_rules:*"
    | "access_policies:*"
    | "platform_settings:*"
    | "warehouse_ops_rates:*"
    | "service_types:*"
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
    role: UserRole;
    permissions: string[];
    effective_permissions?: string[];
    access_policy_id?: string | null;
    access_policy?: AccessPolicy | null;
    permission_grants?: string[];
    permission_revokes?: string[];
    companies?: string[];
    company?: {
        id: string;
        name: string;
    } | null;
    is_super_admin: boolean;
    is_active: boolean;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
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
    role: UserRole;
    access_policy_id?: string | null;
    permission_grants?: string[];
    permission_revokes?: string[];
    company_id?: string | null;
    is_active?: boolean;
}

// Update user request
export interface UpdateUserRequest {
    name?: string;
    email?: string;
    role?: UserRole;
    access_policy_id?: string | null;
    permission_grants?: string[];
    permission_revokes?: string[];
    company_id?: string | null;
    is_active?: boolean;
    is_super_admin?: boolean;
}

// User list query params
export interface UserListParams {
    company_id?: string;
    access_policy_id?: string;
    isActive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
}

// User list response
export interface UserListResponse {
    data: User[];
    meta: {
        total: number;
        limit: number;
        page: number;
    };
}

// All available permissions grouped by category
export const PERMISSION_GROUPS = {
    Authentication: ["auth:login", "auth:logout", "auth:reset_password", "auth:manage_session"],
    "User Management": [
        "users:create",
        "users:read",
        "users:update",
        "users:deactivate",
        "users:manage_password",
        "users:assign_permissions",
        "users:set_company_scope",
    ],
    "Company Management": [
        "companies:create",
        "companies:read",
        "companies:update",
        "companies:archive",
        "companies:set_margin",
    ],
    "Warehouse Management": [
        "warehouses:create",
        "warehouses:read",
        "warehouses:update",
        "warehouses:archive",
    ],
    "Zone Management": [
        "zones:create",
        "zones:read",
        "zones:update",
        "zones:delete",
        "zones:assign_company",
    ],
    "Brand Management": ["brands:create", "brands:read", "brands:update", "brands:delete"],
    "Asset Management": [
        "assets:create",
        "assets:read",
        "assets:update",
        "assets:delete",
        "assets:generate_qr",
        "assets:upload_photos",
        "assets:check_availability",
        "assets:availability_stats",
        "assets:scan_history",
    ],
    "Collection Management": [
        "collections:create",
        "collections:read",
        "collections:update",
        "collections:delete",
        "collections:assign_assets",
    ],
    "Location Management": [
        "countries:create",
        "countries:read",
        "countries:update",
        "countries:delete",
        "cities:create",
        "cities:read",
        "cities:update",
        "cities:delete",
    ],
    Teams: ["teams:create", "teams:read", "teams:update", "teams:delete", "teams:manage_members"],
    "Inbound Requests": [
        "inbound_requests:create",
        "inbound_requests:read",
        "inbound_requests:update",
    ],
    "Service Requests": [
        "service_requests:create",
        "service_requests:read",
        "service_requests:update",
    ],
    "Line Item Requests": [
        "line_item_requests:create",
        "line_item_requests:read",
        "line_item_requests:review",
    ],
    "Workflow Inbox": ["workflow_requests:read", "workflow_requests:update"],
    "Workflow Definitions": ["workflow_definitions:read", "workflow_definitions:update"],
    "Attachment Types": ["attachment_types:read", "attachment_types:update"],
    "Notification Rules": ["notification_rules:read", "notification_rules:update"],
    "Access Policies": ["access_policies:read", "access_policies:update"],
    "Platform Settings": ["platform_settings:read", "platform_settings:update"],
    "Warehouse Ops Rates": ["warehouse_ops_rates:read", "warehouse_ops_rates:update"],
    "Service Types": ["service_types:manage"],
    "Pricing & Quoting": [
        "pricing:review",
        "pricing:adjust",
        "pricing:pmg_review_adjustment",
        "pricing:pmg_approve",
        "quotes:approve",
        "quotes:decline",
    ],
    "Order Management": [
        "orders:create",
        "orders:read",
        "orders:update",
        "orders:add_job_number",
        "orders:add_time_windows",
        "orders:view_status_history",
        "orders:export",
    ],
    Invoicing: [
        "invoices:generate",
        "invoices:read",
        "invoices:download",
        "invoices:confirm_payment",
        "invoices:track_payment_status",
    ],
    "QR Scanning": ["scanning:scan_out", "scanning:scan_in", "scanning:capture_truck_photos"],
    "Inventory Tracking": [
        "inventory:monitor_availability",
        "inventory:track_status",
        "inventory:update_quantities",
    ],
    "Stock Movements": [
        "stock_movements:read",
        "stock_movements:adjust",
        "stock_movements:view_page",
    ],
    "Self-Pickups": [
        "self_pickups:create",
        "self_pickups:read",
        "self_pickups:approve",
        "self_pickups:cancel",
        "self_pickups:export",
        "self_pickups:mark_no_cost",
    ],
    "Condition Management": [
        "conditions:update",
        "conditions:view_history",
        "conditions:view_items_needing_attention",
        "conditions:complete_maintenance",
    ],
    "Lifecycle & Notifications": [
        "lifecycle:progress_status",
        "lifecycle:receive_notifications",
        "notifications:view_failed",
        "notifications:retry",
    ],
    Analytics: ["analytics:view_revenue", "analytics:track_margin", "analytics:filter_by_company"],
};

// Role-specific permission groups for ADMIN users
export const ADMIN_PERMISSION_GROUPS: Record<string, string[]> = {
    "Admin Pages": [
        "analytics:view_page",
        "analytics:view_reports_page",
        "orders:view_page",
        "orders:view_pending_approval_page",
        "service_requests:view_page",
        "workflow_requests:view_page",
        "line_item_requests:view_page",
        "self_bookings:view_page",
        "calendar:view_page",
        "invoices:view_page",
        "assets:view_page",
        "collections:view_page",
        "inbound_requests:view_page",
        "conditions:view_page",
        "warehouses:view_page",
        "zones:view_page",
        "users:view_page",
        "companies:view_page",
        "brands:view_page",
        "teams:view_page",
        "platform_settings:view_page",
        "notification_rules:view_page",
        "attachment_types:view_page",
        "workflow_definitions:view_page",
        "access_policies:view_page",
        "service_types:view_page",
        "warehouse_ops_rates:view_page",
        "countries:view_page",
        "cities:view_page",
        "self_pickups:view_page",
        "stock_movements:view_page",
    ],
    Authentication: ["auth:login", "auth:reset_password", "auth:*"],
    "User Management": [
        "users:create",
        "users:read",
        "users:update",
        "users:deactivate",
        "users:manage_password",
        "users:*",
    ],
    "Company Management": [
        "companies:create",
        "companies:read",
        "companies:update",
        "companies:archive",
        "companies:set_margin",
        "companies:*",
    ],
    "Warehouse Management": [
        "warehouses:create",
        "warehouses:read",
        "warehouses:update",
        "warehouses:archive",
        "warehouses:*",
    ],
    "Zone Management": [
        "zones:create",
        "zones:read",
        "zones:update",
        "zones:delete",
        "zones:assign_company",
        "zones:*",
    ],
    "Brand Management": [
        "brands:create",
        "brands:read",
        "brands:update",
        "brands:delete",
        "brands:*",
    ],
    "Asset Management": [
        "assets:create",
        "assets:read",
        "assets:update",
        "assets:delete",
        "assets:generate_qr",
        "assets:upload_photos",
        "assets:check_availability",
        "assets:availability_stats",
        "assets:scan_history",
        "assets:*",
    ],
    "Collection Management": [
        "collections:create",
        "collections:read",
        "collections:update",
        "collections:delete",
        "collections:assign_assets",
        "collections:*",
    ],
    "Location Management": [
        "countries:create",
        "countries:read",
        "countries:update",
        "countries:delete",
        "cities:create",
        "cities:read",
        "cities:update",
        "cities:delete",
        "countries:*",
        "cities:*",
    ],
    Teams: [
        "teams:create",
        "teams:read",
        "teams:update",
        "teams:delete",
        "teams:manage_members",
        "teams:*",
    ],
    "Inbound Requests": [
        "inbound_requests:create",
        "inbound_requests:read",
        "inbound_requests:update",
        "inbound_requests:*",
    ],
    "Service Requests": [
        "service_requests:create",
        "service_requests:read",
        "service_requests:update",
        "service_requests:*",
    ],
    "Line Item Requests": [
        "line_item_requests:create",
        "line_item_requests:read",
        "line_item_requests:review",
        "line_item_requests:*",
    ],
    "Workflow Inbox": ["workflow_requests:read", "workflow_requests:update", "workflow_requests:*"],
    "Workflow Definitions": [
        "workflow_definitions:read",
        "workflow_definitions:update",
        "workflow_definitions:*",
    ],
    "Attachment Types": ["attachment_types:read", "attachment_types:update", "attachment_types:*"],
    "Notification Rules": [
        "notification_rules:read",
        "notification_rules:update",
        "notification_rules:*",
    ],
    "Access Policies": ["access_policies:read", "access_policies:update", "access_policies:*"],
    "Platform Settings": [
        "platform_settings:read",
        "platform_settings:update",
        "platform_settings:*",
    ],
    "Warehouse Ops Rates": [
        "warehouse_ops_rates:read",
        "warehouse_ops_rates:update",
        "warehouse_ops_rates:*",
    ],
    "Service Types": ["service_types:manage", "service_types:*"],
    "Pricing Review": [
        "pricing:review",
        "pricing:adjust",
        "pricing:admin_review_adjustment",
        "pricing:admin_approve",
        "pricing:*",
    ],
    "Order Management": [
        "orders:read",
        "orders:update",
        "orders:add_job_number",
        "orders:add_time_windows",
        "orders:view_status_history",
        "orders:export",
        "orders:*",
    ],
    Invoicing: [
        "invoices:generate",
        "invoices:read",
        "invoices:download",
        "invoices:confirm_payment",
        "invoices:track_payment_status",
        "invoices:*",
    ],
    "QR Scanning": [
        "scanning:scan_out",
        "scanning:scan_in",
        "scanning:capture_truck_photos",
        "scanning:*",
    ],
    "Inventory Tracking": [
        "inventory:monitor_availability",
        "inventory:track_status",
        "inventory:update_quantities",
        "inventory:*",
    ],
    "Condition Management": [
        "conditions:update",
        "conditions:view_history",
        "conditions:view_items_needing_attention",
        "conditions:complete_maintenance",
        "conditions:*",
    ],
    "Lifecycle & Notifications": [
        "lifecycle:progress_status",
        "lifecycle:receive_notifications",
        "notifications:view_failed",
        "notifications:retry",
        "lifecycle:*",
        "notifications:*",
    ],
    Analytics: [
        "analytics:view_revenue",
        "analytics:track_margin",
        "analytics:filter_by_company",
        "analytics:*",
    ],
    "Self-Bookings": [
        "self_bookings:create",
        "self_bookings:read",
        "self_bookings:return",
        "self_bookings:cancel",
        "self_bookings:*",
    ],
    "Self-Pickups": [
        "self_pickups:create",
        "self_pickups:read",
        "self_pickups:approve",
        "self_pickups:cancel",
        "self_pickups:export",
        "self_pickups:mark_no_cost",
        "self_pickups:*",
    ],
    "Stock Movements": [
        "stock_movements:read",
        "stock_movements:adjust",
        "stock_movements:view_page",
    ],
};

// Role-specific permission groups for LOGISTICS users
export const LOGISTICS_PERMISSION_GROUPS: Record<string, string[]> = {
    Authentication: ["auth:login", "auth:reset_password", "auth:*"],
    "Order Management": [
        "orders:read",
        "orders:update",
        "orders:add_job_number",
        "orders:add_time_windows",
        "orders:view_status_history",
        "orders:export",
        "orders:*",
    ],
    "Pricing Review": ["pricing:review", "pricing:adjust", "pricing:*"],
    "QR Scanning": [
        "scanning:scan_out",
        "scanning:scan_in",
        "scanning:capture_truck_photos",
        "scanning:*",
    ],
    "Condition Management": [
        "conditions:update",
        "conditions:view_history",
        "conditions:view_items_needing_attention",
        "conditions:complete_maintenance",
        "conditions:*",
    ],
    "Company Management": ["companies:read", "companies:*"],
    "Location Management": ["countries:read", "countries:*", "cities:read", "cities:*"],
    "Warehouse Management": ["warehouses:read", "warehouses:*"],
    "Zone Management": ["zones:read", "zones:create", "zones:*"],
    "Brand Management": ["brands:read", "brands:*"],
    "Asset Management": [
        "assets:create",
        "assets:read",
        "assets:update",
        "assets:delete",
        "assets:generate_qr",
        "assets:upload_photos",
        "assets:check_availability",
        "assets:availability_stats",
        "assets:scan_history",
        "assets:*",
    ],
    "Collection Management": [
        "collections:create",
        "collections:read",
        "collections:update",
        "collections:delete",
        "collections:assign_assets",
        "collections:*",
    ],
    Teams: ["teams:read", "teams:*"],
    "Inbound Requests": [
        "inbound_requests:create",
        "inbound_requests:read",
        "inbound_requests:update",
        "inbound_requests:*",
    ],
    "Service Requests": ["service_requests:read", "service_requests:update", "service_requests:*"],
    "Line Item Requests": [
        "line_item_requests:create",
        "line_item_requests:read",
        "line_item_requests:*",
    ],
    "Workflow Inbox": ["workflow_requests:read", "workflow_requests:update", "workflow_requests:*"],
    "Attachment Types": ["attachment_types:read", "attachment_types:*"],
    "Service Types": ["service_types:manage", "service_types:*"],
    "Self-Pickups": [
        "self_pickups:create",
        "self_pickups:read",
        "self_pickups:approve",
        "self_pickups:cancel",
        "self_pickups:mark_no_cost",
        "self_pickups:*",
    ],
    "Stock Movements": ["stock_movements:read", "stock_movements:adjust"],
};
