"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useAssets } from "@/hooks/use-assets";
import { useCommerceRules, type CommerceRulePredicate } from "@/hooks/use-commerce-rules";

const describePredicate = (predicate: CommerceRulePredicate) => {
    if (predicate?.kind === "QUANTITY_LT") return `qty < ${predicate.threshold}`;
    if (predicate?.kind === "QUANTITY_GT") return `qty > ${predicate.threshold}`;
    if (predicate?.kind === "COMPANION_REQUIRED") return "companion required";
    return "-";
};

export default function AssetCartRulesPage() {
    const [search, setSearch] = useState("");
    const [ruleType, setRuleType] = useState("ALL");
    const [status, setStatus] = useState("ALL");
    const { data, isLoading } = useCommerceRules();
    const { data: assetsData } = useAssets({ limit: "500", page: "1" });

    const assetMap = useMemo(
        () => new Map((assetsData?.data || []).map((asset) => [asset.id, asset])),
        [assetsData?.data]
    );
    const rows = useMemo(() => {
        const query = search.trim().toLowerCase();
        return (data?.data || []).filter((rule) => {
            const targetAsset = assetMap.get(rule.target.asset_id);
            const companionAsset =
                rule.predicate.kind === "COMPANION_REQUIRED"
                    ? assetMap.get(rule.predicate.companion_target.asset_id)
                    : null;
            const haystack = [
                rule.name,
                rule.message,
                targetAsset?.name,
                targetAsset?.company?.name,
                targetAsset?.brand?.name,
                targetAsset?.category,
                companionAsset?.name,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            if (query && !haystack.includes(query)) return false;
            if (ruleType !== "ALL" && rule.rule_type !== ruleType) return false;
            if (status === "ACTIVE" && !rule.is_active) return false;
            if (status === "PAUSED" && rule.is_active) return false;
            return true;
        });
    }, [assetMap, data?.data, ruleType, search, status]);

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Sparkles}
                title="CART RULES"
                description="Asset checkout warnings · Quantity and companion rules"
                stats={{ label: "Rules", value: data?.data?.length || 0 }}
                actions={
                    <Button asChild variant="outline" size="sm">
                        <Link href="/assets">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Assets
                        </Link>
                    </Button>
                }
            />
            <div className="border-b border-border bg-card px-8 py-4">
                <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search rules, assets, companies, brands, categories"
                    />
                    <Select value={ruleType} onValueChange={setRuleType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All rule types</SelectItem>
                            <SelectItem value="QUANTITY">Quantity</SelectItem>
                            <SelectItem value="COMPANION">Companion</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All statuses</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="PAUSED">Paused</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="px-8 py-6">
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border/50 bg-muted/50">
                                <TableHead className="font-mono text-xs font-bold uppercase">
                                    Rule
                                </TableHead>
                                <TableHead className="font-mono text-xs font-bold uppercase">
                                    Target Asset
                                </TableHead>
                                <TableHead className="font-mono text-xs font-bold uppercase">
                                    Company / Brand
                                </TableHead>
                                <TableHead className="font-mono text-xs font-bold uppercase">
                                    Predicate
                                </TableHead>
                                <TableHead className="font-mono text-xs font-bold uppercase">
                                    Status
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5}>Loading cart rules...</TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        No cart rules match the filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((rule) => {
                                    const targetAsset = assetMap.get(rule.target.asset_id);
                                    return (
                                        <TableRow key={rule.id}>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <Link
                                                        href={`/assets/${rule.target.asset_id}`}
                                                        className="font-medium hover:underline"
                                                    >
                                                        {rule.name}
                                                    </Link>
                                                    <p className="text-xs text-muted-foreground">
                                                        {rule.message}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {targetAsset?.name || rule.target.asset_id}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <p>{targetAsset?.company?.name || "-"}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {targetAsset?.brand?.name || "No brand"}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {describePredicate(rule.predicate)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        rule.is_active ? "default" : "secondary"
                                                    }
                                                >
                                                    {rule.is_active ? "Active" : "Paused"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
