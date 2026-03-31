"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Box, Lock, LogOut } from "lucide-react";
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
import { toast } from "sonner";
import { useToken } from "@/lib/auth/use-token";
import { usePlatform } from "@/contexts/platform-context";
import { useOrderStatusCount } from "@/hooks/use-orders";
import { LoadingState } from "@/components/loading-state";
import { UnauthorizedState } from "@/components/unauthorized-state";
import {
    ADMIN_ROUTE_REGISTRY,
    canAccessAdminRoute,
    getFirstAccessibleAdminRoute,
    hasAdminRoutePermission,
    isAdminRouteFeatureEnabled,
    matchAdminRoute,
    type AdminRouteSection,
} from "@/lib/auth/admin-route-registry";

type VisibleNavItem = (typeof ADMIN_ROUTE_REGISTRY)[number] & {
    badge?: string;
    sectionTitle: AdminRouteSection;
    isFirstInSection: boolean;
};

const publicRoutes = ["/", "/forgot-password", "/maintenance"];

function AdminSidebarContent() {
    const pathname = usePathname();
    const router = useRouter();
    const { state } = useSidebar();
    const { logout, user } = useToken();
    const { platform } = usePlatform();
    const { data: pendingApprovalCount } = useOrderStatusCount("PENDING_APPROVAL");

    const handleSignOut = () => {
        logout();
        router.push("/");
        toast.success("You have been signed out.");
    };

    const isCollapsed = state === "collapsed";

    const visibleSections = useMemo(() => {
        const accessibleRoutes = ADMIN_ROUTE_REGISTRY.filter(
            (route) =>
                route.showInNav !== false &&
                route.section &&
                !route.redirectTo &&
                canAccessAdminRoute(route, user, platform)
        );

        const sections = new Map<AdminRouteSection, VisibleNavItem[]>();

        for (const route of accessibleRoutes) {
            const section = route.section as AdminRouteSection;
            const list = sections.get(section) ?? [];
            list.push({
                ...route,
                sectionTitle: section,
                isFirstInSection: false,
                badge:
                    route.badgeKey === "pendingApproval" && Number(pendingApprovalCount || 0) > 0
                        ? String(pendingApprovalCount)
                        : undefined,
            });
            sections.set(section, list);
        }

        return Array.from(sections.entries()).map(([title, items]) => ({
            title,
            items: items.map((item, index) => ({ ...item, isFirstInSection: index === 0 })),
        }));
    }, [pendingApprovalCount, platform, user]);

    const visibleNavigation = visibleSections.flatMap((section) => section.items);

    return (
        <>
            <SidebarHeader className="relative border-b border-border bg-white">
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
                        const matchingRoute = matchAdminRoute(pathname);
                        const isActive = matchingRoute?.href === item.href;
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

                        if (!Icon) return null;

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
                                        {isActive && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-foreground/30" />
                                        )}

                                        <Icon className="h-4 w-4 relative z-10 shrink-0" />
                                        {!isCollapsed && (
                                            <>
                                                <span className="flex-1 relative z-10 uppercase tracking-wide text-xs">
                                                    {item.name}
                                                </span>
                                                {item.badge && (
                                                    <span
                                                        className={cn(
                                                            "px-1.5 py-0.5 text-[10px] font-mono rounded uppercase tracking-wider relative z-10 shrink-0",
                                                            isActive
                                                                ? "bg-red-200 text-red-900"
                                                                : "bg-red-500 text-white"
                                                        )}
                                                    >
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </>
                                        )}

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
                            <p className="text-[10px] font-mono tracking-[0.15em] uppercase">
                                {user?.role === "ADMIN" && (
                                    <span className="text-primary font-semibold">Admin</span>
                                )}
                                {user?.role === "LOGISTICS" && (
                                    <span className="text-muted-foreground">Logistics</span>
                                )}
                            </p>
                        </div>
                    )}
                </div>

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
    const router = useRouter();
    const { user, loading } = useToken();
    const { platform, isLoading: platformLoading } = usePlatform();

    const isPublicRoute = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    );

    const matchedRoute = useMemo(() => matchAdminRoute(pathname), [pathname]);
    const firstAccessibleRoute = useMemo(
        () => getFirstAccessibleAdminRoute(user, platform),
        [platform, user]
    );
    const featureEnabled = matchedRoute ? isAdminRouteFeatureEnabled(matchedRoute, platform) : true;
    const hasPermission = matchedRoute ? hasAdminRoutePermission(matchedRoute, user) : true;
    const redirectTarget =
        matchedRoute?.redirectTo ||
        (matchedRoute && !featureEnabled && pathname !== firstAccessibleRoute
            ? firstAccessibleRoute
            : null);

    useEffect(() => {
        if (isPublicRoute || loading || platformLoading || !redirectTarget) return;
        router.replace(redirectTarget);
    }, [isPublicRoute, loading, platformLoading, redirectTarget, router]);

    if (isPublicRoute) {
        return <>{children}</>;
    }

    if (loading || platformLoading || redirectTarget) {
        return <LoadingState />;
    }

    const guardedChildren =
        matchedRoute && !hasPermission ? (
            <UnauthorizedState
                title="Access Denied"
                message="This page exists, but your access policy does not include the required permission set."
                backHref={firstAccessibleRoute}
            />
        ) : (
            children
        );

    return (
        <SidebarProvider defaultOpen={true}>
            <div className="flex min-h-screen w-full bg-background">
                <Sidebar
                    collapsible="icon"
                    variant="sidebar"
                    className="border-r border-border bg-muted/30 sticky top-0"
                >
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

                <SidebarInset>{guardedChildren}</SidebarInset>
            </div>
        </SidebarProvider>
    );
}
