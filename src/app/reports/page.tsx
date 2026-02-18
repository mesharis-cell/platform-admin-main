"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useCompanies } from "@/hooks/use-companies";
import { useToken } from "@/lib/auth/use-token";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type ExportSection = "Financial" | "Orders & Operations" | "Inventory";
type ExportFilterField = "dateRange" | "company" | "status" | "condition";
type ExportCardId =
    | "orders"
    | "orderHistory"
    | "accountsReconciliation"
    | "stockReport"
    | "assetsOut"
    | "inboundLog"
    | "revenueReport"
    | "costReport"
    | "assetUtilization";

type ExportCardConfig = {
    id: ExportCardId;
    title: string;
    description: string;
    endpoint: string;
    section: ExportSection;
    filterFields: ExportFilterField[];
    requiredAnyPermission: readonly string[];
};

type ExportCardFilters = {
    dateFrom: string;
    dateTo: string;
    companyId: string;
    status: string;
    condition: string;
};

const ORDER_STATUS_OPTIONS = [
    "DRAFT",
    "SUBMITTED",
    "PRICING_REVIEW",
    "PENDING_APPROVAL",
    "QUOTED",
    "APPROVED",
    "DECLINED",
    "CONFIRMED",
    "IN_PREPARATION",
    "READY_FOR_DELIVERY",
    "IN_TRANSIT",
    "DELIVERED",
    "IN_USE",
    "AWAITING_RETURN",
    "RETURN_IN_TRANSIT",
    "CLOSED",
];

const CONDITION_OPTIONS = ["GREEN", "ORANGE", "RED"];

const EXPORT_CARDS: ExportCardConfig[] = [
    {
        id: "accountsReconciliation",
        title: "Accounts Reconciliation",
        description: "Commercial reconciliation by order and line item margins.",
        endpoint: "accounts-reconciliation",
        section: "Financial",
        filterFields: ["dateRange", "company"],
        requiredAnyPermission: ["orders:export"],
    },
    {
        id: "revenueReport",
        title: "Revenue Report",
        description: "Revenue totals and average order value by company.",
        endpoint: "revenue-report",
        section: "Financial",
        filterFields: ["dateRange", "company"],
        requiredAnyPermission: ["analytics:view_revenue", "orders:export"],
    },
    {
        id: "costReport",
        title: "Cost Report",
        description: "Buy-cost analysis across orders in the selected date range.",
        endpoint: "cost-report",
        section: "Financial",
        filterFields: ["dateRange"],
        requiredAnyPermission: ["orders:export"],
    },
    {
        id: "orders",
        title: "Orders",
        description: "Full order export with logistics and item-level fields.",
        endpoint: "orders",
        section: "Orders & Operations",
        filterFields: ["dateRange", "company", "status"],
        requiredAnyPermission: ["orders:export"],
    },
    {
        id: "orderHistory",
        title: "Order History",
        description: "Historical order timeline including financial status snapshots.",
        endpoint: "order-history",
        section: "Orders & Operations",
        filterFields: ["dateRange", "company", "status"],
        requiredAnyPermission: ["orders:export"],
    },
    {
        id: "assetsOut",
        title: "Assets Out",
        description: "Assets currently out or in active outbound lifecycles.",
        endpoint: "assets-out",
        section: "Orders & Operations",
        filterFields: ["dateRange", "company"],
        requiredAnyPermission: ["assets:read"],
    },
    {
        id: "inboundLog",
        title: "Inbound Log",
        description: "Inbound request ledger with requester and pricing details.",
        endpoint: "inbound-log",
        section: "Orders & Operations",
        filterFields: ["dateRange", "company"],
        requiredAnyPermission: ["orders:export"],
    },
    {
        id: "stockReport",
        title: "Stock Report",
        description: "Current stock inventory breakdown by company and condition.",
        endpoint: "stock-report",
        section: "Inventory",
        filterFields: ["company", "condition"],
        requiredAnyPermission: ["assets:read"],
    },
    {
        id: "assetUtilization",
        title: "Asset Utilization",
        description: "Asset usage frequency and days-since-used distribution.",
        endpoint: "asset-utilization",
        section: "Inventory",
        filterFields: ["company"],
        requiredAnyPermission: ["assets:read"],
    },
];

const INITIAL_CARD_FILTERS: Record<ExportCardId, ExportCardFilters> = {
    orders: { dateFrom: "", dateTo: "", companyId: "", status: "", condition: "" },
    orderHistory: { dateFrom: "", dateTo: "", companyId: "", status: "", condition: "" },
    accountsReconciliation: { dateFrom: "", dateTo: "", companyId: "", status: "", condition: "" },
    stockReport: { dateFrom: "", dateTo: "", companyId: "", status: "", condition: "" },
    assetsOut: { dateFrom: "", dateTo: "", companyId: "", status: "", condition: "" },
    inboundLog: { dateFrom: "", dateTo: "", companyId: "", status: "", condition: "" },
    revenueReport: { dateFrom: "", dateTo: "", companyId: "", status: "", condition: "" },
    costReport: { dateFrom: "", dateTo: "", companyId: "", status: "", condition: "" },
    assetUtilization: { dateFrom: "", dateTo: "", companyId: "", status: "", condition: "" },
};

const sectionOrder: ExportSection[] = ["Financial", "Orders & Operations", "Inventory"];

export default function ReportsPage() {
    const { user } = useToken();
    const { data: companies } = useCompanies({ limit: "200", page: "1" });
    const [cardFilters, setCardFilters] =
        useState<Record<ExportCardId, ExportCardFilters>>(INITIAL_CARD_FILTERS);
    const [downloadingCard, setDownloadingCard] = useState<ExportCardId | null>(null);

    const visibleCards = useMemo(
        () =>
            EXPORT_CARDS.filter((card) =>
                hasAnyPermission(user, card.requiredAnyPermission as readonly string[])
            ),
        [user]
    );

    const groupedCards = useMemo(
        () =>
            sectionOrder
                .map((section) => ({
                    section,
                    cards: visibleCards.filter((card) => card.section === section),
                }))
                .filter((group) => group.cards.length > 0),
        [visibleCards]
    );

    const updateCardFilter = (
        cardId: ExportCardId,
        field: keyof ExportCardFilters,
        value: string
    ) => {
        setCardFilters((previous) => ({
            ...previous,
            [cardId]: { ...previous[cardId], [field]: value },
        }));
    };

    const buildExportQuery = (card: ExportCardConfig, filters: ExportCardFilters) => {
        const query = new URLSearchParams();
        if (card.filterFields.includes("dateRange")) {
            if (filters.dateFrom) query.append("date_from", filters.dateFrom);
            if (filters.dateTo) query.append("date_to", filters.dateTo);
        }
        if (card.filterFields.includes("company") && filters.companyId)
            query.append("company_id", filters.companyId);
        if (card.filterFields.includes("status") && filters.status)
            query.append("order_status", filters.status);
        if (card.filterFields.includes("condition") && filters.condition)
            query.append("condition", filters.condition);
        return query.toString();
    };

    const downloadExport = async (card: ExportCardConfig) => {
        const query = buildExportQuery(card, cardFilters[card.id]);
        const url = `/operations/v1/export/${card.endpoint}${query ? `?${query}` : ""}`;
        setDownloadingCard(card.id);
        try {
            const response = await apiClient.get(url, { responseType: "blob" });
            const blob =
                response.data instanceof Blob
                    ? response.data
                    : new Blob([response.data], { type: "text/csv;charset=utf-8;" });
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = `${card.endpoint}-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(downloadUrl);
            toast.success(`${card.title} exported successfully`);
        } catch (error) {
            try {
                throwApiError(error);
            } catch (apiError: any) {
                toast.error(apiError?.message || `Failed to export ${card.title}`);
            }
        } finally {
            setDownloadingCard(null);
        }
    };

    return (
        <div className="container mx-auto py-8 px-6 space-y-8">
            <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-lg border border-primary/20 bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Reports & Exports</h1>
                    <p className="text-muted-foreground mt-1">
                        Export operational, financial, and inventory datasets with scoped filters.
                    </p>
                </div>
            </div>

            {groupedCards.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">
                            You do not have permission to view export cards.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                groupedCards.map(({ section, cards }) => (
                    <section key={section} className="space-y-4">
                        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">
                            {section}
                        </h2>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {cards.map((card) => {
                                const filters = cardFilters[card.id];
                                return (
                                    <Card key={card.id} className="border-border/60">
                                        <CardHeader className="space-y-1">
                                            <CardTitle className="text-base">{card.title}</CardTitle>
                                            <CardDescription>{card.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {card.filterFields.includes("dateRange") && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs">Date From</Label>
                                                        <Input
                                                            type="date"
                                                            value={filters.dateFrom}
                                                            onChange={(event) =>
                                                                updateCardFilter(
                                                                    card.id,
                                                                    "dateFrom",
                                                                    event.target.value
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs">Date To</Label>
                                                        <Input
                                                            type="date"
                                                            value={filters.dateTo}
                                                            onChange={(event) =>
                                                                updateCardFilter(
                                                                    card.id,
                                                                    "dateTo",
                                                                    event.target.value
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {card.filterFields.includes("company") && (
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">Company</Label>
                                                    <Select
                                                        value={filters.companyId || "all"}
                                                        onValueChange={(value) =>
                                                            updateCardFilter(
                                                                card.id,
                                                                "companyId",
                                                                value === "all" ? "" : value
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="All companies" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">
                                                                All companies
                                                            </SelectItem>
                                                            {companies?.data?.map((company) => (
                                                                <SelectItem
                                                                    key={company.id}
                                                                    value={company.id}
                                                                >
                                                                    {company.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            {card.filterFields.includes("status") && (
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">Order Status</Label>
                                                    <Select
                                                        value={filters.status || "all"}
                                                        onValueChange={(value) =>
                                                            updateCardFilter(
                                                                card.id,
                                                                "status",
                                                                value === "all" ? "" : value
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="All statuses" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">
                                                                All statuses
                                                            </SelectItem>
                                                            {ORDER_STATUS_OPTIONS.map((status) => (
                                                                <SelectItem key={status} value={status}>
                                                                    {status.replace(/_/g, " ")}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            {card.filterFields.includes("condition") && (
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs">Condition</Label>
                                                    <Select
                                                        value={filters.condition || "all"}
                                                        onValueChange={(value) =>
                                                            updateCardFilter(
                                                                card.id,
                                                                "condition",
                                                                value === "all" ? "" : value
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="All conditions" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">
                                                                All conditions
                                                            </SelectItem>
                                                            {CONDITION_OPTIONS.map((condition) => (
                                                                <SelectItem
                                                                    key={condition}
                                                                    value={condition}
                                                                >
                                                                    {condition}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            <Button
                                                className="w-full gap-2"
                                                onClick={() => downloadExport(card)}
                                                disabled={downloadingCard === card.id}
                                            >
                                                <Download className="h-4 w-4" />
                                                {downloadingCard === card.id
                                                    ? "Exporting..."
                                                    : "Download CSV"}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </section>
                ))
            )}
        </div>
    );
}
