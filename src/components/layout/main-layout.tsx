"use client";

/**
 * Main Layout - Handles structure for both Public and Admin routes
 *
 * - Public routes (/, /forgot-password): Render children directly
 * - Admin routes: Render with Sidebar and Admin layout structure
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Users,
    Building,
    Warehouse,
    Grid3x3,
    Tag,
    Package,
    Layers,
    DollarSign,
    ShoppingCart,
    Receipt,
    Mail,
    ScanLine,
    AlertCircle,
    BarChart3,
    LogOut,
    Box,
    Lock,
    Calendar,
    ChevronRight,
    Settings,
    Flag,
    ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
    useSidebar,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useToken } from "@/lib/auth/use-token";
import { usePlatform } from "@/contexts/platform-context";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { ADMIN_NAV_PERMISSIONS } from "@/lib/auth/permission-map";

type NavItem = {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    requiredAnyPermission?: readonly string[];
    items?: {
        title: string;
        url: string;
    }[];
};

type NavSection = {
    title: "Operations" | "Financial" | "Inventory" | "Administration";
    items: NavItem[];
};

const navigationSections: NavSection[] = [
    {
        title: "Operations",
        items: [
            {
                name: "Orders",
                href: "/orders",
                icon: ShoppingCart,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.orders,
            },
            {
                name: "Service Requests",
                href: "/service-requests",
                icon: ClipboardList,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.serviceRequests,
            },
            {
                name: "Pricing Review",
                href: "/orders/pricing-review",
                icon: DollarSign,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.pricingReview,
            },
            {
                name: "Pending Approval",
                href: "/orders/pending-approval",
                icon: AlertCircle,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.pendingApproval,
            },
            {
                name: "Scanning",
                href: "/scanning",
                icon: ScanLine,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.scanning,
            },
            {
                name: "Events Calendar",
                href: "/event-calendar",
                icon: Calendar,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.eventCalendar,
            },
        ],
    },
    {
        title: "Financial",
        items: [
            {
                name: "Invoices",
                href: "/invoices",
                icon: Receipt,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.invoices,
            },
            {
                name: "Reports",
                href: "/reports",
                icon: BarChart3,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.reports,
            },
        ],
    },
    {
        title: "Inventory",
        items: [
            {
                name: "Assets",
                href: "/assets",
                icon: Package,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.assets,
            },
            {
                name: "Collections",
                href: "/collections",
                icon: Layers,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.collections,
            },
            {
                name: "New Stock Requests",
                href: "/inbound-request",
                icon: Package,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.inboundRequest,
            },
            {
                name: "Brands",
                href: "/brands",
                icon: Tag,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.brands,
            },
            {
                name: "Conditions",
                href: "/conditions",
                icon: AlertCircle,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.conditions,
            },
        ],
    },
    {
        title: "Administration",
        items: [
            {
                name: "Analytics",
                href: "/analytics",
                icon: BarChart3,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.analytics,
            },
            {
                name: "Users",
                href: "/users",
                icon: Users,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.users,
            },
            {
                name: "Companies",
                href: "/companies",
                icon: Building,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.companies,
            },
            {
                name: "Warehouses",
                href: "/warehouses",
                icon: Warehouse,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.warehouses,
            },
            {
                name: "Zones",
                href: "/zones",
                icon: Grid3x3,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.zones,
            },
            {
                name: "Notifications",
                href: "/notifications",
                icon: Mail,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.notifications,
            },
            {
                name: "Feature Flags",
                href: "/feature-flags",
                icon: Flag,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.featureFlags,
            },
            {
                name: "System Settings",
                href: "/system-settings",
                icon: Settings,
                requiredAnyPermission: ADMIN_NAV_PERMISSIONS.systemSettings,
                items: [
                    { title: "Country", url: "/countries" },
                    { title: "City", url: "/cities" },
                    { title: "Pricing Config", url: "/settings/pricing/config" },
                    { title: "Service Types", url: "/service-types" },
                    { title: "Vehicle Type", url: "/vehicle-types" },
                    { title: "Transport Rates", url: "/transport-rates" },
                    { title: "Warehouse Ops Rates", url: "/warehouse-opt-rates" },
                ],
            },
        ],
    },
];

function AdminSidebarContent() {
    const pathname = usePathname();
    const router = useRouter();
    const { state } = useSidebar();
    const { logout, user } = useToken();
    const { platform } = usePlatform();

    const handleSignOut = () => {
        logout();
        router.push("/");
        toast.success("You have been signed out.");
    };

    const isCollapsed = state === "collapsed";
    const visibleSections = navigationSections
        .map((section) => ({
            ...section,
            items: section.items.filter(
                (item) =>
                    !item.requiredAnyPermission || hasAnyPermission(user, item.requiredAnyPermission)
            ),
        }))
        .filter((section) => section.items.length > 0);
    const visibleNavigation = visibleSections.flatMap((section) =>
        section.items.map((item, index) => ({
            ...item,
            sectionTitle: section.title,
            isFirstInSection: index === 0,
        }))
    );

    return (
        <>
            <SidebarHeader className="relative border-b border-border bg-white">
                {/* Zone marker - top left */}
                {!isCollapsed && (
                    <div className="absolute top-4 left-4 text-[10px] font-mono text-muted-foreground/40 tracking-[0.2em] uppercase z-0">
                        ADMIN-01
                    </div>
                )}

                <div className="flex justify-center items-center gap-3 ">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30 relative overflow-hidden shrink-0">
                        <Box className="h-5 w-5 text-primary relative z-10" strokeWidth={2.5} />
                        <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                    </div>
                    {!isCollapsed && (
                        <div>
                            <h2 className="text-lg font-mono font-bold tracking-tight uppercase">
                                {platform?.platform_name || "Platform"}
                            </h2>
                            <p className="text-[10px] font-mono text-muted-foreground tracking-[0.15em] uppercase">
                                Operations Command
                            </p>
                        </div>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent className="p-3 space-y-0.5 overflow-y-auto bg-background">
                <SidebarMenu>
                    {visibleNavigation.map((item) => {
                        const Icon = item.icon;
                        // Find the most specific matching route
                        const matchingRoutes = visibleNavigation.filter(
                            (navItem) =>
                                pathname === navItem.href || pathname.startsWith(navItem.href + "/")
                        );
                        // Highlight only the longest matching route (most specific)
                        const mostSpecificRoute = matchingRoutes.reduce(
                            (longest, current) =>
                                current.href.length > longest.href.length ? current : longest,
                            matchingRoutes[0]
                        );
                        const isActive = mostSpecificRoute?.href === item.href;
                        const sectionHeader =
                            !isCollapsed && item.isFirstInSection ? (
                                <li
                                    key={`${item.href}-section`}
                                    className="px-3 pb-1 pt-3 first:pt-0"
                                >
                                    <div className="text-[10px] font-mono text-muted-foreground tracking-[0.18em] uppercase">
                                        {item.sectionTitle}
                                    </div>
                                </li>
                            ) : null;

                        if (item.items && item.items.length > 0) {
                            const isChildActive = item.items.some(
                                (subItem) =>
                                    pathname === subItem.url ||
                                    pathname.startsWith(subItem.url + "/")
                            );

                            return [
                                sectionHeader,
                                <Collapsible
                                    key={item.name}
                                    asChild
                                    defaultOpen={isChildActive}
                                    className="group/collapsible"
                                >
                                    <SidebarMenuItem>
                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuButton
                                                tooltip={item.name}
                                                isActive={isActive || isChildActive}
                                                className={cn(
                                                    "group/nav-item flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-mono transition-all relative overflow-hidden",
                                                    isActive || isChildActive
                                                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                                                        : "text-foreground/70 hover:text-foreground hover:bg-muted"
                                                )}
                                            >
                                                {/* Active indicator bar */}
                                                {(isActive || isChildActive) && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-foreground/30" />
                                                )}

                                                <Icon className="h-4 w-4 relative z-10 shrink-0" />
                                                {!isCollapsed && (
                                                    <>
                                                        <span className="flex-1 relative z-10 uppercase tracking-wide text-xs">
                                                            {item.name}
                                                        </span>
                                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 h-4 w-4" />
                                                    </>
                                                )}

                                                {/* Hover glow effect */}
                                                {!(isActive || isChildActive) && (
                                                    <div className="absolute inset-0 bg-primary/0 group-hover/nav-item:bg-primary/5 transition-colors" />
                                                )}
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <SidebarMenuSub>
                                                {item.items.map((subItem) => {
                                                    const isSubItemActive =
                                                        pathname === subItem.url ||
                                                        pathname.startsWith(subItem.url + "/");
                                                    return (
                                                        <SidebarMenuSubItem key={subItem.title}>
                                                            <SidebarMenuSubButton
                                                                asChild
                                                                isActive={isSubItemActive}
                                                            >
                                                                <Link
                                                                    href={subItem.url}
                                                                    className={cn(
                                                                        "text-xs uppercase tracking-wide font-mono",
                                                                        isSubItemActive &&
                                                                            "font-semibold"
                                                                    )}
                                                                >
                                                                    <span>{subItem.title}</span>
                                                                </Link>
                                                            </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                    );
                                                })}
                                            </SidebarMenuSub>
                                        </CollapsibleContent>
                                    </SidebarMenuItem>
                                </Collapsible>,
                            ];
                        }

                        return [
                            sectionHeader,
                            <SidebarMenuItem key={item.name}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isActive}
                                    tooltip={isCollapsed ? item.name : undefined}
                                    className={cn(
                                        "group/nav-item flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-mono transition-all relative overflow-hidden",
                                        isActive
                                            ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                                            : "text-foreground/70 hover:text-foreground hover:bg-muted"
                                    )}
                                >
                                    <Link href={item.href}>
                                        {/* Active indicator bar */}
                                        {isActive && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-foreground/30" />
                                        )}

                                        <Icon className="h-4 w-4 relative z-10 shrink-0" />
                                        {!isCollapsed && (
                                            <>
                                                <span className="flex-1 relative z-10 uppercase tracking-wide text-xs">
                                                    {item.name}
                                                </span>

                                                {"badge" in item && item.badge && (
                                                    <span
                                                        className={cn(
                                                            "px-1.5 py-0.5 text-[10px] font-mono rounded uppercase tracking-wider relative z-10 shrink-0",
                                                            isActive
                                                                ? "bg-primary-foreground/20 text-primary-foreground"
                                                                : "bg-primary/10 text-primary border border-primary/20"
                                                        )}
                                                    >
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </>
                                        )}

                                        {/* Hover glow effect */}
                                        {!isActive && (
                                            <div className="absolute inset-0 bg-primary/0 group-hover/nav-item:bg-primary/5 transition-colors" />
                                        )}
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>,
                        ];
                    })}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="p-4 space-y-3 bg-background">
                {/* Divider with technical detail */}
                {!isCollapsed && (
                    <div className="px-2 py-2">
                        <div className="flex items-center gap-2">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-[9px] font-mono text-muted-foreground tracking-[0.2em] uppercase">
                                User Profile
                            </span>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                    </div>
                )}

                {/* User Profile Menu */}
                <>
                    <div className="flex items-center gap-3 px-2 py-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="rounded-full border-2 border-primary/20 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback className="bg-primary/10 text-primary font-mono text-sm font-bold">
                                            {user?.name?.charAt(0).toUpperCase() || "A"}
                                        </AvatarFallback>
                                    </Avatar>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="top" align={isCollapsed ? "center" : "start"}>
                                <DropdownMenuLabel className="font-mono text-xs uppercase tracking-wide">
                                    {user?.name || "Admin User"}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onSelect={() => router.push("/reset-password")}
                                    className="font-mono text-xs uppercase tracking-wide"
                                >
                                    <Lock className="h-3.5 w-3.5 mr-2" />
                                    Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={handleSignOut}
                                    className="font-mono text-xs uppercase tracking-wide text-destructive focus:text-destructive"
                                >
                                    <LogOut className="h-3.5 w-3.5 mr-2" />
                                    Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-mono font-semibold truncate">
                                    {user?.name || "Admin User"}
                                </p>
                                <p className="text-[10px] font-mono text-muted-foreground tracking-[0.15em] uppercase">
                                    {user?.role === "ADMIN" && "Admin"}
                                    {user?.role === "LOGISTICS" && "Logistics"}
                                </p>
                            </div>
                        )}
                    </div>
                </>

                {/* Bottom zone marker */}
                {!isCollapsed && (
                    <div className="text-[9px] font-mono text-muted-foreground/30 tracking-[0.2em] uppercase text-center pt-2">
                        Platform Asset Fulfillment v1.0
                    </div>
                )}
            </SidebarFooter>
        </>
    );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Define public routes that should NOT have the sidebar
    // This includes the login page (/), forgot password, and any other auth pages
    const isPublicRoute =
        pathname === "/" || pathname === "/forgot-password" || pathname.startsWith("/(auth)"); // In case route group is somehow part of path (unlikely)

    // Also check for forgot-password if it's top level
    const isAuthRoute = pathname.includes("forgot-password");

    if (isPublicRoute || isAuthRoute) {
        return <>{children}</>;
    }

    return (
        <SidebarProvider defaultOpen={true}>
            <div className="flex min-h-screen w-full bg-background">
                {/* Industrial Command Center Sidebar */}
                <Sidebar
                    collapsible="icon"
                    variant="sidebar"
                    className="border-r border-border bg-muted/30 sticky top-0"
                >
                    {/* Grid pattern overlay */}
                    <div
                        className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{
                            backgroundImage: `
                            linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
                            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
                        `,
                            backgroundSize: "32px 32px",
                        }}
                    />

                    <AdminSidebarContent />
                </Sidebar>

                {/* Main Content */}
                <SidebarInset>{children}</SidebarInset>
            </div>
        </SidebarProvider>
    );
}
