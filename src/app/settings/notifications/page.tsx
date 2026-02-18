"use client";

import { useState, useMemo } from "react";
import {
    Bell,
    Plus,
    Trash2,
    RotateCcw,
    ChevronRight,
    User,
    Users,
    Mail,
    AlertTriangle,
    Search,
    X,
    VolumeX,
    Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AdminHeader } from "@/components/admin-header";
import {
    useNotificationMeta,
    useNotificationRules,
    useCreateNotificationRule,
    useUpdateNotificationRule,
    useDeleteNotificationRule,
    useResetEventRules,
} from "@/lib/hooks/use-notification-rules";
import type {
    NotificationRule,
    NotificationMeta,
    RecipientType,
    TemplateMeta,
} from "@/types/notifications";

const EMPTY_META: NotificationMeta = { event_groups: [], templates_by_event: {} };

const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Admin",
    LOGISTICS: "Logistics",
    CLIENT: "Client",
    WAREHOUSE: "Warehouse",
};

// Guess which audience a template targets based on its key suffix
function templateAudience(key: string): string | null {
    if (key.endsWith("_admin")) return "ADMIN";
    if (key.endsWith("_logistics")) return "LOGISTICS";
    if (key.endsWith("_client")) return "CLIENT";
    if (key.endsWith("_warehouse")) return "WAREHOUSE";
    return null;
}

function filterTemplatesForRecipient(
    templates: TemplateMeta[],
    recipientType: RecipientType,
    recipientValue: string
): TemplateMeta[] {
    if (recipientType === "ENTITY_OWNER")
        return templates.filter(
            (t) => templateAudience(t.key) === "CLIENT" || templateAudience(t.key) === null
        );
    if (recipientType === "ROLE" && recipientValue)
        return templates.filter(
            (t) => templateAudience(t.key) === recipientValue || templateAudience(t.key) === null
        );
    return templates;
}

// ─── Recipient label ──────────────────────────────────────────────────────────
function RecipientLabel({ rule }: { rule: NotificationRule }) {
    if (rule.recipient_type === "ENTITY_OWNER")
        return (
            <span className="flex items-center gap-1.5 text-xs font-medium">
                <User className="h-3 w-3 shrink-0" />
                Client (order creator)
            </span>
        );
    if (rule.recipient_type === "ROLE")
        return (
            <span className="flex items-center gap-1.5 text-xs font-medium">
                <Users className="h-3 w-3 shrink-0" />
                {ROLE_LABELS[rule.recipient_value ?? ""] ?? rule.recipient_value} role
            </span>
        );
    return (
        <span className="flex items-center gap-1.5 text-xs font-medium">
            <Mail className="h-3 w-3 shrink-0" />
            {rule.recipient_value}
        </span>
    );
}

// ─── Add Rule Dialog ──────────────────────────────────────────────────────────
function AddRuleDialog({
    eventType,
    availableTemplates,
    open,
    onClose,
}: {
    eventType: string;
    availableTemplates: TemplateMeta[];
    open: boolean;
    onClose: () => void;
}) {
    const [recipientType, setRecipientType] = useState<RecipientType>("ROLE");
    const [recipientValue, setRecipientValue] = useState("ADMIN");
    const [templateKey, setTemplateKey] = useState("");
    const createRule = useCreateNotificationRule();

    const filteredTemplates = useMemo(
        () => filterTemplatesForRecipient(availableTemplates, recipientType, recipientValue),
        [availableTemplates, recipientType, recipientValue]
    );

    const handleRecipientTypeChange = (v: RecipientType) => {
        setRecipientType(v);
        setRecipientValue(v === "ROLE" ? "ADMIN" : "");
        setTemplateKey("");
    };

    const handleRecipientValueChange = (v: string) => {
        setRecipientValue(v);
        // Auto-select template if there's exactly one match
        const filtered = filterTemplatesForRecipient(availableTemplates, recipientType, v);
        if (filtered.length === 1) setTemplateKey(filtered[0].key);
        else setTemplateKey("");
    };

    const handleSubmit = async () => {
        await createRule.mutateAsync({
            event_type: eventType,
            recipient_type: recipientType,
            recipient_value:
                recipientType === "ENTITY_OWNER" ? undefined : recipientValue || undefined,
            template_key: templateKey,
        });
        setRecipientType("ROLE");
        setRecipientValue("ADMIN");
        setTemplateKey("");
        onClose();
    };

    const canSubmit =
        !createRule.isPending &&
        !!templateKey &&
        (recipientType === "ENTITY_OWNER" || !!recipientValue);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-sm">Add notification rule</DialogTitle>
                    <DialogDescription className="font-mono text-[11px]">
                        {eventType}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Send to</Label>
                        <Select
                            value={recipientType}
                            onValueChange={(v) => handleRecipientTypeChange(v as RecipientType)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ROLE">
                                    <span className="flex items-center gap-2">
                                        <Users className="h-3.5 w-3.5" />
                                        All users with a role
                                    </span>
                                </SelectItem>
                                <SelectItem value="ENTITY_OWNER">
                                    <span className="flex items-center gap-2">
                                        <User className="h-3.5 w-3.5" />
                                        Client (whoever created this)
                                    </span>
                                </SelectItem>
                                <SelectItem value="EMAIL">
                                    <span className="flex items-center gap-2">
                                        <Mail className="h-3.5 w-3.5" />A specific email address
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {recipientType === "ROLE" && (
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Role</Label>
                            <Select
                                value={recipientValue}
                                onValueChange={handleRecipientValueChange}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {["ADMIN", "LOGISTICS", "CLIENT", "WAREHOUSE"].map((r) => (
                                        <SelectItem key={r} value={r}>
                                            {r}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {recipientType === "EMAIL" && (
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Email address</Label>
                            <Input
                                value={recipientValue}
                                onChange={(e) => setRecipientValue(e.target.value)}
                                placeholder="ops@example.com"
                                type="email"
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">Email template</Label>
                            {filteredTemplates.length < availableTemplates.length && (
                                <span className="text-[10px] text-muted-foreground">
                                    Showing {filteredTemplates.length} of{" "}
                                    {availableTemplates.length} (filtered for{" "}
                                    {recipientValue || "recipient"})
                                </span>
                            )}
                        </div>
                        {filteredTemplates.length > 0 ? (
                            <Select value={templateKey} onValueChange={setTemplateKey}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a template…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredTemplates.map((t) => (
                                        <SelectItem key={t.key} value={t.key}>
                                            <div>
                                                <p className="text-sm">{t.label}</p>
                                                <p className="text-[10px] text-muted-foreground font-mono">
                                                    {t.key}
                                                </p>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                value={templateKey}
                                onChange={(e) => setTemplateKey(e.target.value)}
                                placeholder="template_key"
                                className="font-mono text-xs"
                            />
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!canSubmit}>
                        {createRule.isPending ? "Adding…" : "Add rule"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Reset confirmation dialog ────────────────────────────────────────────────
function ResetConfirmDialog({
    eventType,
    open,
    onClose,
}: {
    eventType: string;
    open: boolean;
    onClose: () => void;
}) {
    const resetRules = useResetEventRules();
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        Delete all rules?
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        All rules for <span className="font-mono font-semibold">{eventType}</span>{" "}
                        will be removed. No emails will be sent for this event until you add new
                        rules.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                            await resetRules.mutateAsync({ event_type: eventType });
                            onClose();
                        }}
                        disabled={resetRules.isPending}
                    >
                        {resetRules.isPending ? "Deleting…" : "Delete all rules"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Rule Row with inline delete confirm ─────────────────────────────────────
function RuleRow({
    rule,
    templateLabelMap,
}: {
    rule: NotificationRule;
    templateLabelMap: Record<string, string>;
}) {
    const updateRule = useUpdateNotificationRule();
    const deleteRule = useDeleteNotificationRule();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const templateLabel = templateLabelMap[rule.template_key];

    if (confirmDelete) {
        return (
            <div className="flex items-center justify-between p-3 border-2 border-destructive/40 rounded bg-destructive/5">
                <p className="text-xs text-destructive font-medium">Delete this rule?</p>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setConfirmDelete(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => deleteRule.mutate(rule.id)}
                        disabled={deleteRule.isPending}
                    >
                        {deleteRule.isPending ? "Deleting…" : "Delete"}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`flex items-center justify-between p-3 border rounded transition-all ${rule.is_enabled ? "bg-card hover:bg-muted/20" : "bg-muted/30 opacity-55"}`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <Switch
                    checked={rule.is_enabled}
                    onCheckedChange={() =>
                        updateRule.mutate({ id: rule.id, is_enabled: !rule.is_enabled })
                    }
                    disabled={updateRule.isPending}
                />
                <div className="min-w-0">
                    <RecipientLabel rule={rule} />
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {templateLabel ?? <span className="font-mono">{rule.template_key}</span>}
                        {rule.company_id && (
                            <Badge variant="secondary" className="ml-2 text-[9px] py-0">
                                company override
                            </Badge>
                        )}
                    </p>
                </div>
            </div>
            <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive h-7 w-7 p-0 shrink-0"
                onClick={() => setConfirmDelete(true)}
            >
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NotificationSettingsPage() {
    const { data: meta } = useNotificationMeta();
    const { event_groups, templates_by_event } = meta ?? EMPTY_META;

    const firstEventKey = event_groups[0]?.events[0]?.key ?? "";
    const [selectedEvent, setSelectedEvent] = useState<string>("");
    const [search, setSearch] = useState("");
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    const activeEvent = selectedEvent || firstEventKey;

    const { data: rules, isLoading } = useNotificationRules({ event_type: activeEvent });
    const { data: allRules } = useNotificationRules({});
    const updateRule = useUpdateNotificationRule();

    const ruleCountByEvent = useMemo(
        () =>
            (allRules ?? []).reduce<Record<string, number>>((acc, rule) => {
                acc[rule.event_type] = (acc[rule.event_type] ?? 0) + 1;
                return acc;
            }, {}),
        [allRules]
    );

    const templateLabelMap = useMemo(
        () =>
            Object.values(templates_by_event)
                .flat()
                .reduce<Record<string, string>>((acc, t) => {
                    acc[t.key] = t.label;
                    return acc;
                }, {}),
        [templates_by_event]
    );

    // Filter event groups by search
    const filteredGroups = useMemo(() => {
        if (!search.trim()) return event_groups;
        const q = search.toLowerCase();
        return event_groups
            .map((g) => ({
                ...g,
                events: g.events.filter(
                    (e) => e.label.toLowerCase().includes(q) || e.key.includes(q)
                ),
            }))
            .filter((g) => g.events.length > 0);
    }, [event_groups, search]);

    const selectedLabel =
        event_groups.flatMap((g) => g.events).find((e) => e.key === activeEvent)?.label ??
        activeEvent;
    const availableTemplates = templates_by_event[activeEvent] ?? [];
    const enabledCount = (rules ?? []).filter((r) => r.is_enabled).length;
    const totalCount = (rules ?? []).length;

    // Mute/unmute all rules for event
    const allEnabled = totalCount > 0 && enabledCount === totalCount;
    const handleMuteToggle = () => {
        (rules ?? []).forEach((r) => {
            if (r.is_enabled === allEnabled)
                updateRule.mutate({ id: r.id, is_enabled: !allEnabled });
        });
    };

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-background">
                <AdminHeader
                    icon={Bell}
                    title="NOTIFICATION RULES"
                    description="Configure who receives emails for each event"
                />

                <div className="container mx-auto px-6 py-8">
                    <div className="grid grid-cols-[260px_1fr] gap-6 items-start">
                        {/* Left: sticky event list */}
                        <div className="sticky top-6 space-y-3">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Filter events…"
                                    className="pl-8 h-8 text-xs"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                                {event_groups.length === 0 ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <Skeleton key={i} className="h-28 w-full rounded-lg" />
                                    ))
                                ) : filteredGroups.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-6">
                                        No events match "{search}"
                                    </p>
                                ) : (
                                    filteredGroups.map((group) => (
                                        <div key={group.label}>
                                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1 px-1">
                                                {group.label}
                                            </p>
                                            <div className="space-y-0.5">
                                                {group.events.map((event) => {
                                                    const count = ruleCountByEvent[event.key] ?? 0;
                                                    const isSelected = activeEvent === event.key;
                                                    return (
                                                        <button
                                                            key={event.key}
                                                            onClick={() => {
                                                                setSelectedEvent(event.key);
                                                                setSearch("");
                                                            }}
                                                            className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition-colors ${isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-muted-foreground"}`}
                                                        >
                                                            <span className="text-xs font-medium">
                                                                {event.label}
                                                            </span>
                                                            <div className="flex items-center gap-1.5">
                                                                {count > 0 ? (
                                                                    <span
                                                                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
                                                                    >
                                                                        {count}
                                                                    </span>
                                                                ) : (
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/25" />
                                                                )}
                                                                {isSelected && (
                                                                    <ChevronRight className="h-3 w-3" />
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Right: Rules panel */}
                        <Card className="border-2">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-base">{selectedLabel}</CardTitle>
                                        <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                                            {activeEvent}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {totalCount > 0 && (
                                            <>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {enabledCount}/{totalCount} active
                                                </span>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={handleMuteToggle}
                                                            disabled={updateRule.isPending}
                                                        >
                                                            {allEnabled ? (
                                                                <VolumeX className="h-3.5 w-3.5" />
                                                            ) : (
                                                                <Volume2 className="h-3.5 w-3.5" />
                                                            )}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent
                                                        side="bottom"
                                                        className="text-xs"
                                                    >
                                                        {allEnabled
                                                            ? "Mute all (disable without deleting)"
                                                            : "Unmute all"}
                                                    </TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                            onClick={() => setResetDialogOpen(true)}
                                                        >
                                                            <RotateCcw className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent
                                                        side="bottom"
                                                        className="text-xs"
                                                    >
                                                        Delete all rules for this event
                                                    </TooltipContent>
                                                </Tooltip>
                                            </>
                                        )}
                                        <Button
                                            size="sm"
                                            className="gap-1"
                                            onClick={() => setAddDialogOpen(true)}
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add rule
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-14 w-full" />
                                        <Skeleton className="h-14 w-full" />
                                    </div>
                                ) : !rules?.length ? (
                                    <div className="py-10 text-center border-2 border-dashed rounded-lg">
                                        <Bell className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                                        <p className="text-sm text-muted-foreground font-medium">
                                            No rules configured
                                        </p>
                                        <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
                                            No emails will be sent when this event fires.
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setAddDialogOpen(true)}
                                            className="gap-1"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add first rule
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {rules.map((rule) => (
                                            <RuleRow
                                                key={rule.id}
                                                rule={rule}
                                                templateLabelMap={templateLabelMap}
                                            />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <AddRuleDialog
                    eventType={activeEvent}
                    availableTemplates={availableTemplates}
                    open={addDialogOpen}
                    onClose={() => setAddDialogOpen(false)}
                />
                <ResetConfirmDialog
                    eventType={activeEvent}
                    open={resetDialogOpen}
                    onClose={() => setResetDialogOpen(false)}
                />
            </div>
        </TooltipProvider>
    );
}
