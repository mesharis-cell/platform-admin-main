"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAssets } from "@/hooks/use-assets";
import {
    useCommerceRulesForAsset,
    useCreateCommerceRule,
    useDeleteCommerceRule,
    useUpdateCommerceRule,
    type CommerceRule,
} from "@/hooks/use-commerce-rules";

type Props = {
    assetId: string | null;
    assetName: string;
    companyId?: string | null;
    brandId?: string | null;
};

type RuleForm = {
    name: string;
    ruleType: "QUANTITY" | "COMPANION";
    operator: "QUANTITY_LT" | "QUANTITY_GT";
    threshold: number;
    companionAssetId: string;
    message: string;
};

const emptyForm: RuleForm = {
    name: "",
    ruleType: "QUANTITY",
    operator: "QUANTITY_LT",
    threshold: 24,
    companionAssetId: "",
    message: "",
};

const describePredicate = (rule: CommerceRule) => {
    if (rule.predicate.kind === "QUANTITY_LT") {
        return `fires when qty < ${rule.predicate.threshold}`;
    }
    if (rule.predicate.kind === "QUANTITY_GT") {
        return `fires when qty > ${rule.predicate.threshold}`;
    }
    return "fires when companion missing";
};

const formFromRule = (rule: CommerceRule): RuleForm => ({
    name: rule.name,
    ruleType: rule.rule_type,
    operator: rule.predicate.kind === "QUANTITY_GT" ? "QUANTITY_GT" : "QUANTITY_LT",
    threshold:
        rule.predicate.kind === "QUANTITY_LT" || rule.predicate.kind === "QUANTITY_GT"
            ? rule.predicate.threshold
            : 1,
    companionAssetId:
        rule.predicate.kind === "COMPANION_REQUIRED"
            ? rule.predicate.companion_target.asset_id
            : "",
    message: rule.message,
});

export function AssetCartRulesSection({ assetId, assetName, companyId, brandId }: Props) {
    const { data, isLoading } = useCommerceRulesForAsset(assetId);
    const { data: companionAssetsData } = useAssets(
        {
            ...(companyId ? { company_id: companyId } : {}),
            limit: "200",
            page: "1",
        },
        { enabled: !!companyId }
    );
    const createMutation = useCreateCommerceRule();
    const updateMutation = useUpdateCommerceRule();
    const deleteMutation = useDeleteCommerceRule();
    const [isAdding, setIsAdding] = useState(false);
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [form, setForm] = useState<RuleForm>(emptyForm);

    const rules = data?.data || [];
    const companionOptions = useMemo(
        () =>
            (companionAssetsData?.data || []).filter((asset) => {
                if (asset.id === assetId) return false;
                const optionBrandId = asset.brand_id || asset.brand?.id || null;
                return (optionBrandId || null) === (brandId || null);
            }),
        [assetId, brandId, companionAssetsData?.data]
    );

    const reset = () => {
        setForm(emptyForm);
        setIsAdding(false);
        setEditingRuleId(null);
    };

    const startEdit = (rule: CommerceRule) => {
        setEditingRuleId(rule.id);
        setIsAdding(true);
        setForm(formFromRule(rule));
    };

    const handleSave = async () => {
        if (!assetId) return;
        if (!form.name.trim()) return toast.error("Rule name is required");
        if (!form.message.trim()) return toast.error("Client message is required");
        if (form.ruleType === "QUANTITY" && form.threshold <= 0) {
            return toast.error("Threshold must be positive");
        }
        if (form.ruleType === "COMPANION" && !form.companionAssetId) {
            return toast.error("Select the required companion asset");
        }

        const payload = {
            name: form.name.trim(),
            rule_type: form.ruleType,
            severity: "WARN" as const,
            target: { kind: "ASSET" as const, asset_id: assetId },
            predicate:
                form.ruleType === "COMPANION"
                    ? {
                          kind: "COMPANION_REQUIRED" as const,
                          companion_target: {
                              kind: "ASSET" as const,
                              asset_id: form.companionAssetId,
                          },
                      }
                    : { kind: form.operator, threshold: form.threshold },
            message: form.message.trim(),
        };

        try {
            if (editingRuleId) {
                await updateMutation.mutateAsync({ id: editingRuleId, payload });
                toast.success("Cart rule updated");
            } else {
                await createMutation.mutateAsync(payload);
                toast.success("Cart rule created");
            }
            reset();
        } catch (err: any) {
            toast.error(err?.message || "Failed to save rule");
        }
    };

    const handleToggleActive = async (rule: CommerceRule, isActive: boolean) => {
        try {
            await updateMutation.mutateAsync({ id: rule.id, payload: { is_active: isActive } });
            toast.success("Cart rule updated");
        } catch (err: any) {
            toast.error(err?.message || "Failed to update rule");
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
            <CardHeader className="flex flex-row items-center justify-between px-6 py-3">
                <CardTitle className="flex items-center gap-2 font-mono text-sm">
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
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add rule
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-3 px-6 pb-6">
                {isLoading && <Skeleton className="h-16 w-full" />}

                {!isLoading && !isAdding && rules.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        No cart rules configured for this asset.
                    </p>
                )}

                {rules.map((rule) => (
                    <div
                        key={rule.id}
                        className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-muted/10 p-3"
                    >
                        <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => startEdit(rule)}
                        >
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium">{rule.name}</p>
                                <Badge variant="outline" className="font-mono text-[10px]">
                                    {rule.rule_type}
                                </Badge>
                                <Badge variant="secondary" className="font-mono text-[10px]">
                                    {rule.is_active ? "Active" : "Paused"}
                                </Badge>
                            </div>
                            <p className="text-xs italic text-muted-foreground">"{rule.message}"</p>
                            <p className="mt-1 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                                {describePredicate(rule)}
                            </p>
                        </button>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={rule.is_active}
                                onCheckedChange={(checked) => handleToggleActive(rule, checked)}
                            />
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleDelete(rule.id)}
                                title="Remove rule"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                ))}

                {isAdding && (
                    <div className="space-y-3 rounded-md border border-primary/40 bg-primary/5 p-4">
                        <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                            {editingRuleId ? "Edit" : "New"} cart rule for {assetName}
                        </p>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-mono">Internal name *</Label>
                                <Input
                                    value={form.name}
                                    onChange={(event) =>
                                        setForm((prev) => ({ ...prev, name: event.target.value }))
                                    }
                                    className="font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-mono">Rule type</Label>
                                <Select
                                    value={form.ruleType}
                                    onValueChange={(value) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            ruleType: value as RuleForm["ruleType"],
                                        }))
                                    }
                                >
                                    <SelectTrigger className="font-mono">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="QUANTITY">Quantity warning</SelectItem>
                                        <SelectItem value="COMPANION">Companion warning</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {form.ruleType === "QUANTITY" ? (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                    <Label className="text-xs font-mono">When quantity is</Label>
                                    <Select
                                        value={form.operator}
                                        onValueChange={(value) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                operator: value as RuleForm["operator"],
                                            }))
                                        }
                                    >
                                        <SelectTrigger className="font-mono">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="QUANTITY_LT">less than</SelectItem>
                                            <SelectItem value="QUANTITY_GT">
                                                greater than
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-mono">Threshold</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={form.threshold}
                                        onChange={(event) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                threshold: Number(event.target.value) || 0,
                                            }))
                                        }
                                        className="font-mono"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label className="text-xs font-mono">Required companion</Label>
                                <Select
                                    value={form.companionAssetId}
                                    onValueChange={(value) =>
                                        setForm((prev) => ({ ...prev, companionAssetId: value }))
                                    }
                                >
                                    <SelectTrigger className="font-mono">
                                        <SelectValue placeholder="Select asset" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companionOptions.map((asset) => (
                                            <SelectItem key={asset.id} value={asset.id}>
                                                {asset.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-mono">Client message *</Label>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                    {form.message.length}/360
                                </span>
                            </div>
                            <Textarea
                                value={form.message}
                                onChange={(event) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        message: event.target.value.slice(0, 360),
                                    }))
                                }
                                maxLength={360}
                                rows={2}
                                className="font-mono text-sm"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={reset}
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={createMutation.isPending || updateMutation.isPending}
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
