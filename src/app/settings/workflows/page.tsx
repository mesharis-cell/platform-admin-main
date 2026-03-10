"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    useReplaceWorkflowCompanyOverrides,
    useUpdateWorkflowDefinition,
    useWorkflowDefinitions,
} from "@/hooks/use-workflow-requests";
import { useCompanies } from "@/hooks/use-companies";

export default function WorkflowSettingsPage() {
    const { data, isLoading } = useWorkflowDefinitions();
    const { data: companiesData } = useCompanies({ limit: "200", page: "1" });
    const updateDefinition = useUpdateWorkflowDefinition();
    const replaceOverrides = useReplaceWorkflowCompanyOverrides();
    const [savingDefinitionId, setSavingDefinitionId] = useState<string | null>(null);

    const definitions = useMemo(
        () => [...(data?.data || [])].sort((a, b) => a.sort_order - b.sort_order),
        [data?.data]
    );
    const companies = companiesData?.data || [];

    const handlePlatformToggle = async (id: string, isActive: boolean) => {
        try {
            setSavingDefinitionId(id);
            await updateDefinition.mutateAsync({ id, payload: { is_active: isActive } });
            toast.success("Workflow definition updated");
        } catch (error: any) {
            toast.error(error.message || "Failed to update workflow definition");
        } finally {
            setSavingDefinitionId(null);
        }
    };

    const handleCompanyToggle = async (
        workflowDefinitionId: string,
        companyId: string,
        nextValue: boolean,
        currentOverrides: Array<{ company_id: string; is_enabled: boolean }> = []
    ) => {
        try {
            setSavingDefinitionId(workflowDefinitionId);
            const overrideMap = new Map(
                currentOverrides.map((override) => [override.company_id, override.is_enabled])
            );
            overrideMap.set(companyId, nextValue);
            const overrides = Array.from(overrideMap.entries()).map(([company_id, is_enabled]) => ({
                company_id,
                is_enabled,
            }));
            await replaceOverrides.mutateAsync({ id: workflowDefinitionId, overrides });
            toast.success("Company workflow overrides updated");
        } catch (error: any) {
            toast.error(error.message || "Failed to update company overrides");
        } finally {
            setSavingDefinitionId(null);
        }
    };

    return (
        <div className="container mx-auto space-y-6 px-6 py-8">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold">
                    <Workflow className="h-6 w-6" />
                    Workflow Definitions
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Enable code-supported workflow sections per platform, then override them per
                    company where needed.
                </p>
            </div>

            {isLoading ? (
                <Card>
                    <CardContent className="py-8 text-sm text-muted-foreground">
                        Loading workflow definitions...
                    </CardContent>
                </Card>
            ) : definitions.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-sm text-muted-foreground">
                        No workflow definitions are registered in this platform.
                    </CardContent>
                </Card>
            ) : (
                definitions.map((definition) => {
                    const overrideMap = new Map(
                        (definition.company_overrides || []).map((override) => [
                            override.company_id,
                            override.is_enabled,
                        ])
                    );
                    return (
                        <Card key={definition.id}>
                            <CardHeader className="space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2">
                                        <CardTitle>{definition.label}</CardTitle>
                                        <div className="space-y-1 text-sm text-muted-foreground">
                                            <p>
                                                {definition.description ||
                                                    "No description provided."}
                                            </p>
                                            <p className="font-mono text-xs">
                                                Code: {definition.code} · Entities:{" "}
                                                {definition.allowed_entity_types.join(", ")} ·
                                                Requesters: {definition.requester_roles.join(", ")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Label htmlFor={`workflow-active-${definition.id}`}>
                                            Platform Enabled
                                        </Label>
                                        <Switch
                                            id={`workflow-active-${definition.id}`}
                                            checked={definition.is_active}
                                            disabled={savingDefinitionId === definition.id}
                                            onCheckedChange={(checked) =>
                                                handlePlatformToggle(definition.id, checked)
                                            }
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Company Overrides</p>
                                    <p className="text-xs text-muted-foreground">
                                        Leave a company untouched to inherit the platform-level
                                        setting for this workflow definition.
                                    </p>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    {companies.map((company) => {
                                        const checked =
                                            overrideMap.get(company.id) ?? definition.is_active;
                                        return (
                                            <label
                                                key={company.id}
                                                className="flex items-start gap-3 rounded-md border border-border/60 p-3"
                                            >
                                                <Checkbox
                                                    checked={checked}
                                                    disabled={savingDefinitionId === definition.id}
                                                    onCheckedChange={(value) =>
                                                        handleCompanyToggle(
                                                            definition.id,
                                                            company.id,
                                                            value === true,
                                                            definition.company_overrides || []
                                                        )
                                                    }
                                                />
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium">
                                                        {company.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {overrideMap.has(company.id)
                                                            ? "Company override set"
                                                            : "Inheriting platform default"}
                                                    </p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })
            )}
        </div>
    );
}
