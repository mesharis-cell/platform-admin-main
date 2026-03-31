import type { LucideIcon } from "lucide-react";
import {
    AlertCircle,
    BarChart3,
    BookmarkPlus,
    Building,
    Calendar,
    ClipboardList,
    FileText,
    Globe,
    Grid3x3,
    Layers,
    Mail,
    MapPin,
    Package,
    Receipt,
    Settings,
    Shield,
    ShoppingCart,
    Tag,
    Users,
    Warehouse,
    Workflow,
} from "lucide-react";
import type { User } from "@/types/auth";
import type { PlatformDomain } from "@/types/platform-domain";
import { ADMIN_NAV_PERMISSIONS, ADMIN_PAGE_PERMISSIONS } from "@/lib/auth/permission-map";
import { hasAnyPermission, hasPermission } from "@/lib/auth/permissions";
import { isPlatformFeatureEnabled, type PlatformFeatureKey } from "@/lib/platform-features";

export type AdminRouteSection =
    | "Operations"
    | "Financial"
    | "Inventory"
    | "People"
    | "Platform Settings";

export type AdminRouteDefinition = {
    name: string;
    href: string;
    icon?: LucideIcon;
    section?: AdminRouteSection;
    requiredPagePermission?: string;
    requiredAnyPermission?: readonly string[];
    requiredFeature?: PlatformFeatureKey;
    showInNav?: boolean;
    redirectTo?: string;
    badgeKey?: "pendingApproval";
};

export const ADMIN_ROUTE_REGISTRY: AdminRouteDefinition[] = [
    {
        name: "Orders",
        href: "/orders",
        icon: ShoppingCart,
        section: "Operations",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.orders,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.orders,
    },
    {
        name: "Service Requests",
        href: "/service-requests",
        icon: ClipboardList,
        section: "Operations",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.serviceRequests,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.serviceRequests,
        requiredFeature: "enable_service_requests",
    },
    {
        name: "Workflow Inbox",
        href: "/workflow-inbox",
        icon: Workflow,
        section: "Operations",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.workflowInbox,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.workflowInbox,
        requiredFeature: "enable_workflows",
    },
    {
        name: "Pending Approval",
        href: "/orders/pending-approval",
        icon: AlertCircle,
        section: "Operations",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.pendingApproval,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.pendingApproval,
        badgeKey: "pendingApproval",
    },
    {
        name: "Line Item Requests",
        href: "/line-item-requests",
        icon: ClipboardList,
        section: "Operations",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.lineItemRequests,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.lineItemRequests,
    },
    {
        name: "Self-Bookings",
        href: "/self-bookings",
        icon: BookmarkPlus,
        section: "Operations",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.selfBookings,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.selfBookings,
    },
    {
        name: "Events Calendar",
        href: "/event-calendar",
        icon: Calendar,
        section: "Operations",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.eventCalendar,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.eventCalendar,
        requiredFeature: "enable_event_calendar",
    },
    {
        name: "Invoices",
        href: "/invoices",
        icon: Receipt,
        section: "Financial",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.invoices,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.invoices,
        requiredFeature: "enable_kadence_invoicing",
    },
    {
        name: "Reports",
        href: "/reports",
        icon: BarChart3,
        section: "Financial",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.reports,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.reports,
    },
    {
        name: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        section: "Financial",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.analytics,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.analytics,
    },
    {
        name: "Assets",
        href: "/assets",
        icon: Package,
        section: "Inventory",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.assets,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.assets,
    },
    {
        name: "Collections",
        href: "/collections",
        icon: Layers,
        section: "Inventory",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.collections,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.collections,
    },
    {
        name: "New Stock Requests",
        href: "/inbound-request",
        icon: Package,
        section: "Inventory",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.inboundRequest,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.inboundRequest,
        requiredFeature: "enable_inbound_requests",
    },
    {
        name: "Conditions",
        href: "/conditions",
        icon: AlertCircle,
        section: "Inventory",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.conditions,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.conditions,
    },
    {
        name: "Warehouses",
        href: "/warehouses",
        icon: Warehouse,
        section: "Inventory",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.warehouses,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.warehouses,
    },
    {
        name: "Zones",
        href: "/zones",
        icon: Grid3x3,
        section: "Inventory",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.zones,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.zones,
    },
    {
        name: "Users",
        href: "/users",
        icon: Users,
        section: "People",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.users,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.users,
    },
    {
        name: "Companies",
        href: "/companies",
        icon: Building,
        section: "People",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.companies,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.companies,
    },
    {
        name: "Brands",
        href: "/brands",
        icon: Tag,
        section: "People",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.brands,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.brands,
    },
    {
        name: "Teams",
        href: "/teams",
        icon: Users,
        section: "People",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.teams,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.teams,
    },
    {
        name: "Platform Settings",
        href: "/settings/platform",
        icon: Settings,
        section: "Platform Settings",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.platformSettings,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.platformSettings,
    },
    {
        name: "Notification Rules",
        href: "/settings/notifications",
        icon: Mail,
        section: "Platform Settings",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.notificationRules,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.notificationRules,
    },
    {
        name: "Attachment Types",
        href: "/settings/attachment-types",
        icon: FileText,
        section: "Platform Settings",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.attachmentTypes,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.attachmentTypes,
        requiredFeature: "enable_attachments",
    },
    {
        name: "Workflow Definitions",
        href: "/settings/workflows",
        icon: Workflow,
        section: "Platform Settings",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.workflowDefinitions,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.workflowDefinitions,
        requiredFeature: "enable_workflows",
    },
    {
        name: "Access Policies",
        href: "/settings/access-policies",
        icon: Shield,
        section: "Platform Settings",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.accessPolicies,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.accessPolicies,
    },
    {
        name: "Service Types",
        href: "/settings/pricing/service-types",
        icon: ClipboardList,
        section: "Platform Settings",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.serviceTypes,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.serviceTypes,
    },
    {
        name: "Warehouse Ops Rates",
        href: "/settings/pricing/warehouse-opt-rates",
        icon: Warehouse,
        section: "Platform Settings",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.warehouseOpsRates,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.warehouseOpsRates,
        requiredFeature: "enable_base_operations",
    },
    {
        name: "Countries",
        href: "/settings/locations/countries",
        icon: Globe,
        section: "Platform Settings",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.countries,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.countries,
    },
    {
        name: "Cities",
        href: "/settings/locations/cities",
        icon: MapPin,
        section: "Platform Settings",
        requiredPagePermission: ADMIN_PAGE_PERMISSIONS.cities,
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.cities,
    },
    {
        name: "Reset Password",
        href: "/reset-password",
        requiredAnyPermission: ADMIN_NAV_PERMISSIONS.resetPassword,
        showInNav: false,
    },
    {
        name: "Feature Flags",
        href: "/feature-flags",
        redirectTo: "/settings/platform",
        showInNav: false,
    },
    {
        name: "Pricing Review",
        href: "/orders/pricing-review",
        redirectTo: "/orders/pending-approval",
        showInNav: false,
    },
    {
        name: "Scanning",
        href: "/scanning",
        redirectTo: "/orders",
        showInNav: false,
    },
    {
        name: "Pricing Config",
        href: "/settings/pricing/config",
        redirectTo: "/settings/pricing/warehouse-opt-rates",
        showInNav: false,
    },
];

export function matchAdminRoute(pathname: string): AdminRouteDefinition | null {
    const matchingRoutes = ADMIN_ROUTE_REGISTRY.filter(
        (route) => pathname === route.href || pathname.startsWith(`${route.href}/`)
    );

    if (!matchingRoutes.length) return null;

    return matchingRoutes.reduce((longest, current) =>
        current.href.length > longest.href.length ? current : longest
    );
}

export function hasAdminRoutePermission(
    route: AdminRouteDefinition,
    user: User | null | undefined
): boolean {
    if (!route.requiredAnyPermission?.length) return true;
    return hasAnyPermission(user ?? null, route.requiredAnyPermission);
}

export function hasAdminRoutePagePermission(
    route: AdminRouteDefinition,
    user: User | null | undefined
): boolean {
    if (!route.requiredPagePermission) return true;
    if (!user) return false;
    return hasPermission(user, route.requiredPagePermission);
}

export function isAdminRouteFeatureEnabled(
    route: AdminRouteDefinition,
    platform: PlatformDomain | null | undefined
): boolean {
    return isPlatformFeatureEnabled(platform, route.requiredFeature);
}

export function canAccessAdminRoute(
    route: AdminRouteDefinition,
    user: User | null | undefined,
    platform: PlatformDomain | null | undefined
): boolean {
    return (
        isAdminRouteFeatureEnabled(route, platform) &&
        hasAdminRoutePagePermission(route, user) &&
        hasAdminRoutePermission(route, user)
    );
}

export function getVisibleAdminRoutes(
    user: User | null | undefined,
    platform: PlatformDomain | null | undefined
) {
    return ADMIN_ROUTE_REGISTRY.filter(
        (route) =>
            route.showInNav !== false &&
            !route.redirectTo &&
            canAccessAdminRoute(route, user, platform)
    );
}

export function getFirstAccessibleAdminRoute(
    user: User | null | undefined,
    platform: PlatformDomain | null | undefined
): string {
    return getVisibleAdminRoutes(user, platform)[0]?.href ?? "/reset-password";
}
