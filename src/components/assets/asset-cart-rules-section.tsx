"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Sparkles } from "lucide-react";
import {
    useCommerceRulesForAsset,
    useCreateCommerceRule,
    useDeleteCommerceRule,
} from "@/hooks/use-commerce-rules";
import { toast } from "sonner";

type Props = {
    assetId: string | null;
    assetName: string;
    companyId?: string | null;
};

// Item 6 contextual surface — admin manages cart rules that target this
// asset from the asset detail page. v1 ships QUANTITY rules only here;
// companion rules require picking a second asset and are deferred to a
// later UX pass (the API supports them today).
export function AssetCartRulesSection({ assetId, assetName, companyId }: Props) {
    const { data, isLoading } = useCommerceRulesForAsset(assetId);
    const createMutation = useCreateCommerceRule();
    const deleteMutation = useDeleteCommerceRule();
    const [isAdding, setIsAdding] = useState(false);
    const [form, setForm] = useState({
        name: "",
        operator: "QUANTITY_LT" as "QUANTITY_LT" | "QUANTITY_GT",
        threshold: 24,
        message: "",
        scope: "PLATFORM" as "PLATFORM" | "COMPANY",
    });

    const rules = data?.data || [];

    const reset = () => {
        setForm({
            name: "",
            operator: "QUANTITY_LT",
            threshold: 24,
            message: "",
            scope: "PLATFORM",
        });
        setIsAdding(false);
    };

    const handleCreate = async () => {
        if (!assetId) return;
        if (!form.name.trim()) {
            toast.error("Rule name is required");
            return;
        }
        if (!form.message.trim()) {
            toast.error("Client message is required");
            return;
        }
        if (form.threshold <= 0) {
            toast.error("Threshold must be positive");
            return;
        }
        try {
            await createMutation.mutateAsync({
                company_id:
                    form.scope === "COMPANY" && companyId ? companyId : null,
                name: form.name.trim(),
                rule_type: "QUANTITY",
                severity: "WARN",
                target: { kind: "ASSET", asset_id: assetId },
                predicate: { kind: form.operator, threshold: form.threshold },
                message: form.message.trim(),
            });
            toast.success("Cart rule created");
            reset();
        } catch (err: any) {
            toast.error(err?.message || "Failed to create rule");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteMutation.mutateAsync(id);
            toast.success("Rule removed");
        } catch (err: any) {
            toast.error(err?.message || "Failed to delete rule");
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3 px-6">
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Cart Rules ({rules.length})
                </CardTitle>
                {!isAdding && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="font-mono"
                        onClick={() => setIsAdding(true)}
                    >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Add rule
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-3 px-6 pb-6">
                {isLoading && <Skeleton className="h-16 w-full" />}

                {!isLoading && !isAdding && rules.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        No cart rules configured for this asset. Add a rule to warn clients about
                        quantity choices at checkout.
                    </p>
                )}

                {rules.map((rule) => (
                    <div
                        key={rule.id}
                        className="rounded-md border border-border/60 bg-muted/10 p-3 flex items-start justify-between gap-3"
                    >
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className="font-medium text-sm">{rule.name}</p>
                                <Badge variant="outline" className="font-mono text-[10px]">
                                    {rule.rule_type}
                                </Badge>
                                <Badge variant="outline" className="font-mono text-[10px]">
                                    {rule.severity}
                                </Badge>
                                {rule.company_id ? (
                                    <Badge variant="secondary" className="font-mono text-[10px]">
                                        Company-scoped
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="font-mono text-[10px]">
                                        Platform-wide
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground italic">
                                "{rule.message}"
                            </p>
                            {rule.predicate.kind === "QUANTITY_LT" && (
                                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mt-1">
                                    fires when qty &lt; {(rule.predicate as any).threshold}
                                </p>
                            )}
                            {rule.predicate.kind === "QUANTITY_GT" && (
                                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mt-1">
                                    fires when qty &gt; {(rule.predicate as any).threshold}
                                </p>
                            )}
                            {rule.predicate.kind === "COMPANION_REQUIRED" && (
                                <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mt-1">
                                    fires when companion missing
                                </p>
                            )}
                        </div>
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleDelete(rule.id)}
                            title="Remove rule"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                ))}

                {isAdding && (
                    <div className="rounded-md border border-primary/40 bg-primary/5 p-4 space-y-3">
                        <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                            New cart rule for {assetName}
                        </p>
                        <div className="space-y-2">
                            <Label className="text-xs font-mono">Internal name *</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Low can quantity warning"
                                className="font-mono"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-mono">When quantity is</Label>
                                <Select
                                    value={form.operator}
                                    onValueChange={(v) =>
                                        setForm({
                                            ...form,
                                            operator: v as "QUANTITY_LT" | "QUANTITY_GT",
                                        })
                                    }
                                >
                                    <SelectTrigger className="font-mono">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="QUANTITY_LT">less than</SelectItem>
                                        <SelectItem value="QUANTITY_GT">greater than</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-mono">Threshold</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={form.threshold}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            threshold: Number(e.target.value) || 0,
                                        })
                                    }
                                    className="font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-mono">Scope</Label>
                            <Select
                                value={form.scope}
                                onValueChange={(v) =>
                                    setForm({
                                        ...form,
                                        scope: v as "PLATFORM" | "COMPANY",
                                    })
                                }
                            >
                                <SelectTrigger className="font-mono">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PLATFORM">Platform-wide</SelectItem>
                                    {companyId && (
                                        <SelectItem value="COMPANY">
                                            Company-specific (override for this asset's company)
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-mono">Client message *</Label>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                    {form.message.length}/360
                                </span>
                            </div>
                            <Textarea
                                value={form.message}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        message: e.target.value.slice(0, 360),
                                    })
                                }
                                maxLength={360}
                                placeholder="e.g. Only 1 can selected — did you mean to order a case (24)?"
                                rows={2}
                                className="font-mono text-sm"
                            />
                            <p className="text-[10px] font-mono text-muted-foreground">
                                Shown to clients in the cart review banner and confirm dialog —
                                keep it short.
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={reset}
                                disabled={createMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleCreate}
                                disabled={createMutation.isPending}
                            >
                                Save rule
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
