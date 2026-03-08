"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    useUpdateWorkflowRequest,
    useEntityWorkflowRequests,
    type WorkflowEntityType,
    type WorkflowRequestStatus,
} from "@/hooks/use-workflow-requests";
import { BrushCleaning, Workflow } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const STATUS_OPTIONS: WorkflowRequestStatus[] = [
    "REQUESTED",
    "ACKNOWLEDGED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
];

export function WorkflowRequestsCard({
    entityType,
    entityId,
    title = "Internal Workflows",
}: {
    entityType: WorkflowEntityType;
    entityId: string | null;
    title?: string;
}) {
    const { data, isLoading } = useEntityWorkflowRequests(entityType, entityId);
    const updateWorkflow = useUpdateWorkflowRequest();
    const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
    const [draftStatuses, setDraftStatuses] = useState<Record<string, WorkflowRequestStatus>>({});

    const workflows = useMemo(() => data?.data || [], [data?.data]);

    const handleSave = async (id: string, currentStatus: WorkflowRequestStatus) => {
        try {
            await updateWorkflow.mutateAsync({
                id,
                payload: {
                    status: draftStatuses[id] || currentStatus,
                    metadata: draftNotes[id]?.trim()
                        ? { admin_note: draftNotes[id].trim() }
                        : undefined,
                },
            });
            toast.success("Workflow updated");
        } catch (error: any) {
            toast.error(error.message || "Failed to update workflow");
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Workflow className="h-5 w-5" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {isLoading && (
                    <>
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </>
                )}

                {!isLoading && workflows.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        No internal workflow requests have been created yet.
                    </p>
                )}

                {workflows.map((workflow) => (
                    <div
                        key={workflow.id}
                        className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-3"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                                    <BrushCleaning className="h-3 w-3" />
                                    {workflow.workflow_kind.replace(/_/g, " ")}
                                </p>
                                <p className="font-semibold">{workflow.title}</p>
                                {workflow.description && (
                                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                        {workflow.description}
                                    </p>
                                )}
                            </div>
                            <div className="text-right text-xs font-mono text-muted-foreground">
                                <p>{workflow.requested_by_role}</p>
                                <p>{new Date(workflow.requested_at).toLocaleString()}</p>
                            </div>
                        </div>
                        {workflow.assigned_email && (
                            <p className="text-xs text-muted-foreground">
                                Assigned email: {workflow.assigned_email}
                            </p>
                        )}
                        <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
                            <Select
                                value={draftStatuses[workflow.id] || workflow.status}
                                onValueChange={(value) =>
                                    setDraftStatuses((prev) => ({
                                        ...prev,
                                        [workflow.id]: value as WorkflowRequestStatus,
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status.replace(/_/g, " ")}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Textarea
                                value={draftNotes[workflow.id] || ""}
                                onChange={(event) =>
                                    setDraftNotes((prev) => ({
                                        ...prev,
                                        [workflow.id]: event.target.value,
                                    }))
                                }
                                rows={2}
                                placeholder="Optional admin note stored in workflow metadata"
                            />
                            <Button
                                variant="outline"
                                onClick={() => handleSave(workflow.id, workflow.status)}
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
