"use client";

import { useState } from "react";
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, RotateCcw, ChevronRight } from "lucide-react";
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
import { AdminHeader } from "@/components/admin-header";
import {
    useNotificationRules,
    useCreateNotificationRule,
    useUpdateNotificationRule,
    useDeleteNotificationRule,
    useResetEventRules,
} from "@/lib/hooks/use-notification-rules";
import type { NotificationRule, RecipientType } from "@/types/notifications";

// ─── Event type registry for the left panel ───────────────────────────────────
const EVENT_GROUPS = [
    {
        label: "Orders",
        events: [
            { key: "order.submitted", label: "Order Submitted" },
            { key: "order.confirmed", label: "Order Confirmed" },
            { key: "order.in_transit", label: "Order In Transit" },
            { key: "order.delivered", label: "Order Delivered" },
            { key: "order.cancelled", label: "Order Cancelled" },
            { key: "order.closed", label: "Order Closed" },
            { key: "order.ready_for_delivery", label: "Ready for Delivery" },
            { key: "order.pickup_reminder", label: "Pickup Reminder" },
            { key: "order.time_windows_updated", label: "Time Windows Updated" },
        ],
    },
    {
        label: "Quotes",
        events: [
            { key: "quote.sent", label: "Quote Sent" },
            { key: "quote.revised", label: "Quote Revised" },
            { key: "quote.approved", label: "Quote Approved" },
            { key: "quote.declined", label: "Quote Declined" },
        ],
    },
    {
        label: "Invoices & Payments",
        events: [
            { key: "invoice.generated", label: "Invoice Generated" },
            { key: "payment.confirmed", label: "Payment Confirmed" },
            { key: "fabrication.completed", label: "Fabrication Completed" },
        ],
    },
    {
        label: "Inbound Requests",
        events: [
            { key: "inbound_request.submitted", label: "IR Submitted" },
            { key: "inbound_request.quoted", label: "IR Quoted" },
            { key: "inbound_request.approved", label: "IR Approved" },
            { key: "inbound_request.declined", label: "IR Declined" },
            { key: "inbound_request.completed", label: "IR Completed" },
            { key: "inbound_request.invoice_generated", label: "IR Invoice Generated" },
        ],
    },
    {
        label: "Service Requests",
        events: [
            { key: "service_request.submitted", label: "SR Submitted" },
            { key: "service_request.quoted", label: "SR Quoted" },
            { key: "service_request.approved", label: "SR Approved" },
            { key: "service_request.completed", label: "SR Completed" },
            { key: "service_request.invoice_generated", label: "SR Invoice Generated" },
        ],
    },
    {
        label: "Auth",
        events: [{ key: "auth.password_reset_requested", label: "Password Reset Requested" }],
    },
];

const RECIPIENT_TYPE_LABELS: Record<RecipientType, string> = {
    ROLE: "Role",
    ENTITY_OWNER: "Entity Owner",
    EMAIL: "Static Email",
};

// ─── Add Rule Dialog ──────────────────────────────────────────────────────────
function AddRuleDialog({
    eventType,
    open,
    onClose,
}: {
    eventType: string;
    open: boolean;
    onClose: () => void;
}) {
    const [recipientType, setRecipientType] = useState<RecipientType>("ROLE");
    const [recipientValue, setRecipientValue] = useState("");
    const [templateKey, setTemplateKey] = useState("");
    const createRule = useCreateNotificationRule();

    const handleSubmit = async () => {
        await createRule.mutateAsync({
            event_type: eventType,
            recipient_type: recipientType,
            recipient_value:
                recipientType === "ENTITY_OWNER" ? undefined : recipientValue || undefined,
            template_key: templateKey,
        });
        setRecipientType("ROLE");
        setRecipientValue("");
        setTemplateKey("");
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-mono text-sm">ADD NOTIFICATION RULE</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1">
                        <Label className="font-mono text-xs">EVENT TYPE</Label>
                        <Input value={eventType} disabled className="font-mono text-xs" />
                    </div>
                    <div className="space-y-1">
                        <Label className="font-mono text-xs">RECIPIENT TYPE</Label>
                        <Select
                            value={recipientType}
                            onValueChange={(v) => setRecipientType(v as RecipientType)}
                        >
                            <SelectTrigger className="font-mono text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ROLE" className="font-mono text-xs">
                                    ROLE
                                </SelectItem>
                                <SelectItem value="ENTITY_OWNER" className="font-mono text-xs">
                                    ENTITY_OWNER
                                </SelectItem>
                                <SelectItem value="EMAIL" className="font-mono text-xs">
                                    EMAIL
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {recipientType !== "ENTITY_OWNER" && (
                        <div className="space-y-1">
                            <Label className="font-mono text-xs">
                                {recipientType === "ROLE"
                                    ? "ROLE (e.g. ADMIN, LOGISTICS)"
                                    : "EMAIL ADDRESS"}
                            </Label>
                            <Input
                                value={recipientValue}
                                onChange={(e) => setRecipientValue(e.target.value)}
                                className="font-mono text-xs"
                                placeholder={recipientType === "ROLE" ? "ADMIN" : "ops@example.com"}
                            />
                        </div>
                    )}
                    <div className="space-y-1">
                        <Label className="font-mono text-xs">TEMPLATE KEY</Label>
                        <Input
                            value={templateKey}
                            onChange={(e) => setTemplateKey(e.target.value)}
                            className="font-mono text-xs"
                            placeholder="e.g. order_submitted_admin"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="font-mono text-xs">
                        CANCEL
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={createRule.isPending || !templateKey}
                        className="font-mono text-xs"
                    >
                        {createRule.isPending ? "SAVING..." : "ADD RULE"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Rule Row ─────────────────────────────────────────────────────────────────
function RuleRow({ rule }: { rule: NotificationRule }) {
    const updateRule = useUpdateNotificationRule();
    const deleteRule = useDeleteNotificationRule();

    const toggle = () => updateRule.mutate({ id: rule.id, is_enabled: !rule.is_enabled });

    return (
        <div className="flex items-center justify-between p-3 border rounded bg-card hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
                <Switch
                    checked={rule.is_enabled}
                    onCheckedChange={toggle}
                    disabled={updateRule.isPending}
                />
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-[10px]">
                            {rule.recipient_type}
                        </Badge>
                        {rule.recipient_value && (
                            <span className="font-mono text-xs font-semibold">
                                {rule.recipient_value}
                            </span>
                        )}
                        {rule.recipient_type === "ENTITY_OWNER" && (
                            <span className="font-mono text-xs font-semibold">entity creator</span>
                        )}
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground mt-0.5 truncate">
                        template: {rule.template_key}
                        {rule.company_id && (
                            <span className="ml-2 text-blue-600">company override</span>
                        )}
                    </p>
                </div>
            </div>
            <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive h-7 w-7 p-0 shrink-0"
                onClick={() => deleteRule.mutate(rule.id)}
                disabled={deleteRule.isPending}
            >
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NotificationSettingsPage() {
    const [selectedEvent, setSelectedEvent] = useState<string>(EVENT_GROUPS[0].events[0].key);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const { data: rules, isLoading } = useNotificationRules({ event_type: selectedEvent });
    const resetRules = useResetEventRules();

    const selectedLabel =
        EVENT_GROUPS.flatMap((g) => g.events).find((e) => e.key === selectedEvent)?.label ??
        selectedEvent;

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Bell}
                title="NOTIFICATION RULES"
                description="Configure who receives emails for each event"
            />

            <div className="container mx-auto px-6 py-8">
                <div className="grid grid-cols-[280px_1fr] gap-6">
                    {/* Left: Event list */}
                    <div className="space-y-4">
                        {EVENT_GROUPS.map((group) => (
                            <div key={group.label}>
                                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1 px-1">
                                    {group.label}
                                </p>
                                <div className="space-y-0.5">
                                    {group.events.map((event) => (
                                        <button
                                            key={event.key}
                                            onClick={() => setSelectedEvent(event.key)}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition-colors ${
                                                selectedEvent === event.key
                                                    ? "bg-primary/10 text-primary font-semibold"
                                                    : "hover:bg-muted/50 text-muted-foreground"
                                            }`}
                                        >
                                            <span className="font-mono text-xs">{event.label}</span>
                                            {selectedEvent === event.key && (
                                                <ChevronRight className="h-3 w-3" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right: Rules for selected event */}
                    <Card className="border-2 h-fit">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="font-mono text-sm">
                                        {selectedLabel}
                                    </CardTitle>
                                    <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                                        {selectedEvent}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="font-mono text-xs gap-1"
                                        onClick={() =>
                                            resetRules.mutate({ event_type: selectedEvent })
                                        }
                                        disabled={resetRules.isPending}
                                    >
                                        <RotateCcw className="h-3 w-3" />
                                        RESET
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="font-mono text-xs gap-1"
                                        onClick={() => setAddDialogOpen(true)}
                                    >
                                        <Plus className="h-3 w-3" />
                                        ADD RULE
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
                                <div className="py-10 text-center">
                                    <Bell className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                                    <p className="font-mono text-xs text-muted-foreground">
                                        No rules configured for this event.
                                    </p>
                                    <p className="font-mono text-[10px] text-muted-foreground/60 mt-1">
                                        No emails will be sent when this event fires.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {rules.map((rule) => (
                                        <RuleRow key={rule.id} rule={rule} />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AddRuleDialog
                eventType={selectedEvent}
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
            />
        </div>
    );
}
