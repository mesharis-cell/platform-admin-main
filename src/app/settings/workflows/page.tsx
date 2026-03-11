"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Plus, Trash2, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AdminHeader } from "@/components/admin-header";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    useCreateWorkflowDefinition,
    useDeleteWorkflowDefinition,
    useReplaceWorkflowCompanyOverrides,
    useUpdateWorkflowDefinition,
    useWorkflowDefinitionMeta,
    useWorkflowDefinitions,
    type WorkflowDefinitionRecord,
    type WorkflowEntityType,
    type WorkflowRole,
} from "@/hooks/use-workflow-requests";
import { useCompanies } from "@/hooks/use-companies";

const ENTITY_TYPES: WorkflowEntityType[] = ["ORDER", "INBOUND_REQUEST", "SERVICE_REQUEST"];
const ROLE_OPTIONS: WorkflowRole[] = ["ADMIN", "LOGISTICS", "CLIENT"];

type WorkflowFormState = {
    code: string;
    label: string;
    description: string;
    workflow_family: string;
    status_model_key: string;
    allowed_entity_types: WorkflowEntityType[];
    requester_roles: WorkflowRole[];
    viewer_roles: WorkflowRole[];
    actor_roles: WorkflowRole[];
    priority_enabled: boolean;
    sla_hours: string;
    blocks_fulfillment_default: boolean;
    sort_order: string;
};

type CompanyOverrideDraft = {
    is_enabled: boolean;
    label_override: string;
    sort_order_override: string;
};

const emptyForm: WorkflowFormState = {
    code: "",
    label: "",
    description: "",
    workflow_family: "",
    status_model_key: "",
    allowed_entity_types: ["ORDER"],
    requester_roles: ["ADMIN", "LOGISTICS"],
    viewer_roles: ["ADMIN", "LOGISTICS"],
    actor_roles: ["ADMIN", "LOGISTICS"],
    priority_enabled: false,
    sla_hours: "",
    blocks_fulfillment_default: false,
    sort_order: "0",
};

const toggleArrayValue = <T extends string>(values: T[], value: T, checked: boolean) =>
    checked ? Array.from(new Set([...values, value])) : values.filter((item) => item !== value);

export default function WorkflowSettingsPage() {
    const { data, isLoading } = useWorkflowDefinitions();
    const { data: metaData } = useWorkflowDefinitionMeta();
    const { data: companiesData } = useCompanies({ limit: "200", page: "1" });
    const createDefinition = useCreateWorkflowDefinition();
    const updateDefinition = useUpdateWorkflowDefinition();
    const deleteDefinition = useDeleteWorkflowDefinition();
    const replaceOverrides = useReplaceWorkflowCompanyOverrides();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [savingDefinitionId, setSavingDefinitionId] = useState<string | null>(null);
    const [confirmDeleteDef, setConfirmDeleteDef] = useState<WorkflowDefinitionRecord | null>(null);
    const [form, setForm] = useState<WorkflowFormState>(emptyForm);
    const [companyOverrideDrafts, setCompanyOverrideDrafts] = useState<
        Record<string, CompanyOverrideDraft>
    >({});

    const definitions = useMemo(
        () => [...(data?.data || [])].sort((a, b) => a.sort_order - b.sort_order),
        [data?.data]
    );
    const companies = companiesData?.data || [];
    const workflowFamilies = metaData?.data.workflow_families || [];
    const statusModels = metaData?.data.status_models || [];

    useEffect(() => {
        if (form.workflow_family || workflowFamilies.length === 0) return;
        setForm((prev) => ({
            ...prev,
            workflow_family: workflowFamilies[0]?.key || "",
            status_model_key:
                statusModels.find((item) =>
                    workflowFamilies[0]?.supportedStatusModels.includes(item.key)
                )?.key ||
                statusModels[0]?.key ||
                "",
        }));
    }, [form.workflow_family, workflowFamilies, statusModels]);

    const selectedFamily = workflowFamilies.find((item) => item.key === form.workflow_family);
    const availableStatusModels = statusModels.filter((item) =>
        selectedFamily ? selectedFamily.supportedStatusModels.includes(item.key) : true
    );

    useEffect(() => {
        if (!selectedFamily || !availableStatusModels.length) return;
        if (!availableStatusModels.some((item) => item.key === form.status_model_key)) {
            setForm((prev) => ({ ...prev, status_model_key: availableStatusModels[0].key }));
        }
    }, [availableStatusModels, form.status_model_key, selectedFamily]);

    const startCreate = () => {
        setEditingId(null);
        setForm({
            ...emptyForm,
            workflow_family: workflowFamilies[0]?.key || "",
            status_model_key: statusModels[0]?.key || "",
        });
    };

    const startEdit = (definition: WorkflowDefinitionRecord) => {
        setEditingId(definition.id);
        setForm({
            code: definition.code,
            label: definition.label,
            description: definition.description || "",
            workflow_family: definition.workflow_family,
            status_model_key: definition.status_model_key,
            allowed_entity_types: definition.allowed_entity_types,
            requester_roles: definition.requester_roles,
            viewer_roles: definition.viewer_roles,
            actor_roles: definition.actor_roles,
            priority_enabled: definition.priority_enabled,
            sla_hours: definition.sla_hours ? String(definition.sla_hours) : "",
            blocks_fulfillment_default: definition.blocks_fulfillment_default,
            sort_order: String(definition.sort_order ?? 0),
        });
    };

    const handleSave = async () => {
        if (!form.code.trim() || !form.label.trim()) {
            toast.error("Code and label are required");
            return;
        }
        if (form.allowed_entity_types.length === 0) {
            toast.error("Select at least one entity type");
            return;
        }

        const payload = {
            code: form.code.trim().toUpperCase(),
            label: form.label.trim(),
            description: form.description.trim() || null,
            workflow_family: form.workflow_family,
            status_model_key: form.status_model_key,
            allowed_entity_types: form.allowed_entity_types,
            requester_roles: form.requester_roles,
            viewer_roles: form.viewer_roles,
            actor_roles: form.actor_roles,
            priority_enabled: form.priority_enabled,
            sla_hours: form.sla_hours ? Number(form.sla_hours) : null,
            blocks_fulfillment_default: form.blocks_fulfillment_default,
            sort_order: Number(form.sort_order || 0),
            intake_schema: {},
            is_active: true,
        };

        try {
            if (editingId) {
                await updateDefinition.mutateAsync({ id: editingId, payload });
                toast.success("Workflow definition updated");
            } else {
                await createDefinition.mutateAsync(payload as any);
                toast.success("Workflow definition created");
            }
            startCreate();
        } catch (error: any) {
            toast.error(error.message || "Failed to save workflow definition");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteDefinition.mutateAsync(id);
            toast.success("Workflow definition deleted");
            if (editingId === id) startCreate();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete workflow definition");
        }
    };

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

    const getOverrideDraftKey = (workflowDefinitionId: string, companyId: string) =>
        `${workflowDefinitionId}:${companyId}`;

    const getCompanyOverrideDraft = (
        workflowDefinitionId: string,
        companyId: string,
        currentOverrides: Array<{
            company_id: string;
            is_enabled: boolean;
            label_override?: string | null;
            sort_order_override?: number | null;
        }> = [],
        fallbackIsEnabled: boolean
    ) => {
        const key = getOverrideDraftKey(workflowDefinitionId, companyId);
        const existing = currentOverrides.find((override) => override.company_id === companyId);
        return (
            companyOverrideDrafts[key] || {
                is_enabled: existing?.is_enabled ?? fallbackIsEnabled,
                label_override: existing?.label_override || "",
                sort_order_override:
                    existing?.sort_order_override !== null &&
                    existing?.sort_order_override !== undefined
                        ? String(existing.sort_order_override)
                        : "",
            }
        );
    };

    const setCompanyOverrideDraft = (
        workflowDefinitionId: string,
        companyId: string,
        patch: Partial<CompanyOverrideDraft>,
        currentOverrides: Array<{
            company_id: string;
            is_enabled: boolean;
            label_override?: string | null;
            sort_order_override?: number | null;
        }> = [],
        fallbackIsEnabled: boolean
    ) => {
        const key = getOverrideDraftKey(workflowDefinitionId, companyId);
        const existing = getCompanyOverrideDraft(
            workflowDefinitionId,
            companyId,
            currentOverrides,
            fallbackIsEnabled
        );
        setCompanyOverrideDrafts((prev) => ({
            ...prev,
            [key]: { ...existing, ...patch },
        }));
    };

    const handleCompanyOverrideSave = async (
        workflowDefinitionId: string,
        companyId: string,
        currentOverrides: Array<{
            company_id: string;
            is_enabled: boolean;
            label_override?: string | null;
            sort_order_override?: number | null;
        }> = [],
        fallbackIsEnabled: boolean
    ) => {
        try {
            setSavingDefinitionId(workflowDefinitionId);
            const draft = getCompanyOverrideDraft(
                workflowDefinitionId,
                companyId,
                currentOverrides,
                fallbackIsEnabled
            );
            const overrideMap = new Map(
                currentOverrides.map((override) => [override.company_id, override])
            );
            overrideMap.set(companyId, {
                ...(overrideMap.get(companyId) || { company_id: companyId }),
                company_id: companyId,
                is_enabled: draft.is_enabled,
                label_override: draft.label_override.trim() || null,
                sort_order_override: draft.sort_order_override.trim()
                    ? Number(draft.sort_order_override)
                    : null,
            });
            await replaceOverrides.mutateAsync({
                id: workflowDefinitionId,
                overrides: Array.from(overrideMap.values()),
            });
            toast.success("Company workflow overrides updated");
            setCompanyOverrideDrafts((prev) => {
                const next = { ...prev };
                delete next[getOverrideDraftKey(workflowDefinitionId, companyId)];
                return next;
            });
        } catch (error: any) {
            toast.error(error.message || "Failed to update company overrides");
        } finally {
            setSavingDefinitionId(null);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Workflow}
                title="WORKFLOW DEFINITIONS"
                description="Create · Configure · Control"
                stats={{ label: "Definitions", value: definitions.length }}
                actions={
                    <Button size="sm" onClick={startCreate}>
                        <Plus className="mr-1 h-4 w-4" />
                        New Definition
                    </Button>
                }
            />

            <div className="container mx-auto px-6 py-8">
                <div className="grid gap-6 xl:grid-cols-[1.15fr_1.85fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {editingId ? "Edit Workflow Definition" : "New Workflow Definition"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Code</Label>
                                    <Input
                                        value={form.code}
                                        onChange={(event) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                code: event.target.value,
                                            }))
                                        }
                                        placeholder="CREATIVE_SUPPORT"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Label</Label>
                                    <Input
                                        value={form.label}
                                        onChange={(event) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                label: event.target.value,
                                            }))
                                        }
                                        placeholder="Creative Support"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={form.description}
                                    onChange={(event) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            description: event.target.value,
                                        }))
                                    }
                                    rows={3}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Workflow Family</Label>
                                    <Select
                                        value={form.workflow_family}
                                        onValueChange={(value) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                workflow_family: value,
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select family" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {workflowFamilies.map((family) => (
                                                <SelectItem key={family.key} value={family.key}>
                                                    {family.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Status Model</Label>
                                    <Select
                                        value={form.status_model_key}
                                        onValueChange={(value) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                status_model_key: value,
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableStatusModels.map((statusModel) => (
                                                <SelectItem
                                                    key={statusModel.key}
                                                    value={statusModel.key}
                                                >
                                                    {statusModel.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Sort Order</Label>
                                    <Input
                                        type="number"
                                        value={form.sort_order}
                                        onChange={(event) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                sort_order: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>SLA Hours</Label>
                                    <Input
                                        type="number"
                                        value={form.sla_hours}
                                        onChange={(event) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                sla_hours: event.target.value,
                                            }))
                                        }
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-3">
                                    <Label>Entity Types</Label>
                                    {ENTITY_TYPES.map((entityType) => (
                                        <label
                                            key={entityType}
                                            className="flex items-center gap-3 text-sm"
                                        >
                                            <Checkbox
                                                checked={form.allowed_entity_types.includes(
                                                    entityType
                                                )}
                                                onCheckedChange={(value) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        allowed_entity_types: toggleArrayValue(
                                                            prev.allowed_entity_types,
                                                            entityType,
                                                            value === true
                                                        ),
                                                    }))
                                                }
                                            />
                                            {entityType.replace(/_/g, " ")}
                                        </label>
                                    ))}
                                </div>
                                <div className="space-y-3">
                                    <Label>Roles</Label>
                                    {ROLE_OPTIONS.map((role) => (
                                        <div
                                            key={role}
                                            className="rounded-md border border-border/60 p-3"
                                        >
                                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                                                {role}
                                            </p>
                                            <div className="space-y-2 text-sm">
                                                <label className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={form.requester_roles.includes(
                                                            role
                                                        )}
                                                        onCheckedChange={(value) =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                requester_roles: toggleArrayValue(
                                                                    prev.requester_roles,
                                                                    role,
                                                                    value === true
                                                                ),
                                                            }))
                                                        }
                                                    />
                                                    Can request
                                                </label>
                                                <label className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={form.viewer_roles.includes(role)}
                                                        onCheckedChange={(value) =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                viewer_roles: toggleArrayValue(
                                                                    prev.viewer_roles,
                                                                    role,
                                                                    value === true
                                                                ),
                                                            }))
                                                        }
                                                    />
                                                    Can view
                                                </label>
                                                <label className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={form.actor_roles.includes(role)}
                                                        onCheckedChange={(value) =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                actor_roles: toggleArrayValue(
                                                                    prev.actor_roles,
                                                                    role,
                                                                    value === true
                                                                ),
                                                            }))
                                                        }
                                                    />
                                                    Can act
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm">
                                    Priority Enabled
                                    <Switch
                                        checked={form.priority_enabled}
                                        onCheckedChange={(checked) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                priority_enabled: checked,
                                            }))
                                        }
                                    />
                                </label>
                                <label className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm">
                                    Blocks Fulfillment By Default
                                    <Switch
                                        checked={form.blocks_fulfillment_default}
                                        onCheckedChange={(checked) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                blocks_fulfillment_default: checked,
                                            }))
                                        }
                                    />
                                </label>
                            </div>

                            <Button
                                onClick={handleSave}
                                disabled={createDefinition.isPending || updateDefinition.isPending}
                            >
                                {editingId ? "Save Definition" : "Create Definition"}
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        {isLoading ? (
                            <Card>
                                <CardContent className="py-8 text-sm text-muted-foreground">
                                    Loading workflow definitions...
                                </CardContent>
                            </Card>
                        ) : definitions.length === 0 ? (
                            <Card>
                                <CardContent className="py-8 text-sm text-muted-foreground">
                                    No workflow definitions are configured for this platform yet.
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
                                                            {definition.code} ·{" "}
                                                            {definition.workflow_family} ·{" "}
                                                            {definition.status_model_key}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => startEdit(definition)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() =>
                                                            setConfirmDeleteDef(definition)
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                    <div className="flex items-center gap-3 pl-2">
                                                        <Label
                                                            htmlFor={`workflow-active-${definition.id}`}
                                                        >
                                                            Platform Enabled
                                                        </Label>
                                                        <Switch
                                                            id={`workflow-active-${definition.id}`}
                                                            checked={definition.is_active}
                                                            disabled={
                                                                savingDefinitionId === definition.id
                                                            }
                                                            onCheckedChange={(checked) =>
                                                                handlePlatformToggle(
                                                                    definition.id,
                                                                    checked
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                <div className="rounded-md border border-border/60 p-3 text-sm">
                                                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                                                        Requesters
                                                    </p>
                                                    <p>{definition.requester_roles.join(", ")}</p>
                                                </div>
                                                <div className="rounded-md border border-border/60 p-3 text-sm">
                                                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                                                        Viewers
                                                    </p>
                                                    <p>{definition.viewer_roles.join(", ")}</p>
                                                </div>
                                                <div className="rounded-md border border-border/60 p-3 text-sm">
                                                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                                                        Actors
                                                    </p>
                                                    <p>{definition.actor_roles.join(", ")}</p>
                                                </div>
                                            </div>

                                            <Collapsible>
                                                <CollapsibleTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-full justify-between"
                                                    >
                                                        <span className="text-sm font-medium">
                                                            Company Overrides ({companies.length})
                                                        </span>
                                                        <ChevronDown className="h-4 w-4 transition-transform" />
                                                    </Button>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="pt-3 space-y-3">
                                                    <p className="text-xs text-muted-foreground">
                                                        Leave a company untouched to inherit the
                                                        platform-level setting for this workflow
                                                        definition.
                                                    </p>
                                                    <div className="grid gap-3 md:grid-cols-2">
                                                        {companies.map((company) => {
                                                            const draft = getCompanyOverrideDraft(
                                                                definition.id,
                                                                company.id,
                                                                definition.company_overrides || [],
                                                                definition.is_active
                                                            );
                                                            return (
                                                                <div
                                                                    key={company.id}
                                                                    className="space-y-3 rounded-md border border-border/60 p-3"
                                                                >
                                                                    <div className="flex items-start gap-3">
                                                                        <Checkbox
                                                                            checked={
                                                                                draft.is_enabled
                                                                            }
                                                                            disabled={
                                                                                savingDefinitionId ===
                                                                                definition.id
                                                                            }
                                                                            onCheckedChange={(
                                                                                value
                                                                            ) =>
                                                                                setCompanyOverrideDraft(
                                                                                    definition.id,
                                                                                    company.id,
                                                                                    {
                                                                                        is_enabled:
                                                                                            value ===
                                                                                            true,
                                                                                    },
                                                                                    definition.company_overrides ||
                                                                                        [],
                                                                                    definition.is_active
                                                                                )
                                                                            }
                                                                        />
                                                                        <div className="space-y-1">
                                                                            <p className="text-sm font-medium">
                                                                                {company.name}
                                                                            </p>
                                                                            <p className="text-xs text-muted-foreground">
                                                                                {overrideMap.has(
                                                                                    company.id
                                                                                )
                                                                                    ? "Company override set"
                                                                                    : "Inheriting platform default"}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="grid gap-3 md:grid-cols-[1fr_140px_auto]">
                                                                        <Input
                                                                            value={
                                                                                draft.label_override
                                                                            }
                                                                            placeholder="Optional label override"
                                                                            onChange={(event) =>
                                                                                setCompanyOverrideDraft(
                                                                                    definition.id,
                                                                                    company.id,
                                                                                    {
                                                                                        label_override:
                                                                                            event
                                                                                                .target
                                                                                                .value,
                                                                                    },
                                                                                    definition.company_overrides ||
                                                                                        [],
                                                                                    definition.is_active
                                                                                )
                                                                            }
                                                                        />
                                                                        <Input
                                                                            type="number"
                                                                            value={
                                                                                draft.sort_order_override
                                                                            }
                                                                            placeholder="Sort override"
                                                                            onChange={(event) =>
                                                                                setCompanyOverrideDraft(
                                                                                    definition.id,
                                                                                    company.id,
                                                                                    {
                                                                                        sort_order_override:
                                                                                            event
                                                                                                .target
                                                                                                .value,
                                                                                    },
                                                                                    definition.company_overrides ||
                                                                                        [],
                                                                                    definition.is_active
                                                                                )
                                                                            }
                                                                        />
                                                                        <Button
                                                                            variant="outline"
                                                                            disabled={
                                                                                savingDefinitionId ===
                                                                                definition.id
                                                                            }
                                                                            onClick={() =>
                                                                                handleCompanyOverrideSave(
                                                                                    definition.id,
                                                                                    company.id,
                                                                                    definition.company_overrides ||
                                                                                        [],
                                                                                    definition.is_active
                                                                                )
                                                                            }
                                                                        >
                                                                            Save
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </div>

                <ConfirmDialog
                    open={!!confirmDeleteDef}
                    onOpenChange={(open) => {
                        if (!open) setConfirmDeleteDef(null);
                    }}
                    onConfirm={() => {
                        if (confirmDeleteDef) {
                            handleDelete(confirmDeleteDef.id);
                            setConfirmDeleteDef(null);
                        }
                    }}
                    title="Delete Workflow Definition"
                    description={`Are you sure you want to delete "${confirmDeleteDef?.label}"? This cannot be undone.`}
                    confirmText="Delete"
                    variant="destructive"
                />
            </div>
        </div>
    );
}
