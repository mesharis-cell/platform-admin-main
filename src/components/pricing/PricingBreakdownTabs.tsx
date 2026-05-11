"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Clock, Info, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { OrderPricing } from "@/types/hybrid-pricing";
import { AdminBreakdownView } from "./AdminBreakdownView";
import { LogisticsBreakdownView } from "./LogisticsBreakdownView";
import { ClientBreakdownView } from "./ClientBreakdownView";

type Role = "admin" | "logistics" | "client";

interface Props {
    projections: {
        admin: OrderPricing | null;
        logistics: OrderPricing | null;
        client: OrderPricing | null;
    };
    calculatedAt?: string | null;
    onRefresh?: () => void;
    isRefetching?: boolean;
    /**
     * Optional override for the card title. Defaults to "Final Pricing Review".
     */
    title?: string;
}

/**
 * Admin's tabbed pricing breakdown.
 *
 * Three tabs — Admin / Logistics / Client — each rendering the API's
 * projectByRole response for that role verbatim. The admin's payload
 * carries all three projections nested under `pricing.projections`
 * (see PricingService.projectAllRolesForAdmin on the API). No client-side
 * derivation; what each tab shows IS what that role actually receives.
 *
 * Container border-top + subtle background tint shifts per active role so
 * the preview state is hard to miss. A short banner under the tabs
 * explains what's filtered for each role.
 *
 * Snapshot freshness + manual refresh button sit in the header.
 */
export function PricingBreakdownTabs({
    projections,
    calculatedAt,
    onRefresh,
    isRefetching,
    title = "Final Pricing Review",
}: Props) {
    const [role, setRole] = useState<Role>("admin");

    return (
        <Card
            className={cn(
                "border-t-[3px] transition-colors",
                role === "admin" && "border-t-primary",
                role === "logistics" && "border-t-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/10",
                role === "client" && "border-t-secondary bg-secondary/5"
            )}
            data-role={role}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                    <CardTitle>{title}</CardTitle>
                    {(calculatedAt || onRefresh) && (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            {calculatedAt && (
                                <>
                                    <Clock className="h-3 w-3" />
                                    <span>
                                        Calculated{" "}
                                        {formatDistanceToNow(new Date(calculatedAt), {
                                            addSuffix: true,
                                        })}
                                    </span>
                                </>
                            )}
                            {onRefresh && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={onRefresh}
                                    disabled={isRefetching}
                                    aria-label="Refresh pricing"
                                >
                                    <RefreshCw
                                        className={cn("h-3 w-3", isRefetching && "animate-spin")}
                                    />
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <Tabs value={role} onValueChange={(v) => setRole(v as Role)}>
                    <TabsList className="bg-muted/50">
                        <TabsTrigger
                            value="admin"
                            className="data-[state=active]:text-primary gap-1.5"
                        >
                            <span className="h-2 w-2 rounded-full bg-primary" />
                            Admin view
                        </TabsTrigger>
                        <TabsTrigger
                            value="logistics"
                            className="data-[state=active]:text-indigo-500 gap-1.5"
                        >
                            <span className="h-2 w-2 rounded-full bg-indigo-500" />
                            Logistics view
                        </TabsTrigger>
                        <TabsTrigger
                            value="client"
                            className="data-[state=active]:text-secondary gap-1.5"
                        >
                            <span className="h-2 w-2 rounded-full bg-secondary" />
                            Client view
                        </TabsTrigger>
                    </TabsList>

                    <div
                        className={cn(
                            "mt-3 flex items-center gap-2 text-[11px] px-3 py-2 rounded-md",
                            role === "admin" && "bg-primary/8 text-primary",
                            role === "logistics" && "bg-indigo-100 text-indigo-700",
                            role === "client" && "bg-secondary/10 text-secondary"
                        )}
                    >
                        <Info className="h-3 w-3 shrink-0" />
                        {role === "admin" && (
                            <span>
                                Full breakdown — buy, margin, sell, VAT. Voided + non-billable
                                hidden. Per-line policy stripes visible.
                            </span>
                        )}
                        {role === "logistics" && (
                            <span>
                                Buy-side only. Margin, sell, VAT hidden. Lines flagged{" "}
                                <em>hidden from logistics</em> are stripped entirely.
                            </span>
                        )}
                        {role === "client" && (
                            <span>
                                Sell-side only + VAT. Buy and margin hidden. Lines with{" "}
                                <em>client price hidden</em> show label but no amount.
                            </span>
                        )}
                    </div>

                    <div className="mt-3">
                        <TabsContent value="admin" className="mt-0">
                            <AdminBreakdownView projection={projections.admin} />
                        </TabsContent>
                        <TabsContent value="logistics" className="mt-0">
                            <LogisticsBreakdownView projection={projections.logistics} />
                        </TabsContent>
                        <TabsContent value="client" className="mt-0">
                            <ClientBreakdownView projection={projections.client} />
                        </TabsContent>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
}
