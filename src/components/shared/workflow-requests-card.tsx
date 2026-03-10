"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { useAttachmentTypes } from "@/hooks/use-attachments";
import {
    useAvailableWorkflowDefinitions,
    useCreateWorkflowRequest,
    useEntityWorkflowRequests,
    useUpdateWorkflowRequest,
    type WorkflowEntityType,
    type WorkflowLifecycleState,
} from "@/hooks/use-workflow-requests";
import { uploadDocuments } from "@/lib/utils/upload-documents";

const LIFECYCLE_BADGE_VARIANT: Record<WorkflowLifecycleState, "default" | "secondary" | "outline"> =
    {
        OPEN: "outline",
        ACTIVE: "secondary",
        DONE: "default",
        CANCELLED: "outline",
    };

const DEFAULT_STATUS_OPTIONS = [
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
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedWorkflowCode, setSelectedWorkflowCode] = useState("");
    const [titleValue, setTitleValue] = useState("");
    const [description, setDescription] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
    const [draftStatuses, setDraftStatuses] = useState<Record<string, string>>({});

    const { data, isLoading } = useEntityWorkflowRequests(entityType, entityId);
    const { data: definitionsData } = useAvailableWorkflowDefinitions(entityType, entityId);
    const { data: attachmentTypesData } = useAttachmentTypes("WORKFLOW_REQUEST");
    const createWorkflow = useCreateWorkflowRequest(entityType, entityId);
    const updateWorkflow = useUpdateWorkflowRequest();

    const definitions = definitionsData?.data || [];
    const workflows = useMemo(() => data?.data || [], [data?.data]);
    const selectedDefinition = definitions.find(
        (definition) => definition.code === selectedWorkflowCode
    );
    const referenceAttachmentType = useMemo(
        () =>
            (attachmentTypesData?.data || []).find((type) =>
                ["WORKFLOW_REFERENCE", "ARTWORK_REFERENCE"].includes(type.code)
            ) || null,
        [attachmentTypesData?.data]
    );

    const grouped = definitions.map((definition) => ({
        definition,
        requests: workflows.filter((workflow) => workflow.workflow_code === definition.code),
    }));

    const resetForm = () => {
        setSelectedWorkflowCode(definitions[0]?.code || "");
        setTitleValue("");
        setDescription("");
        setFiles([]);
    };

    const handleCreate = async () => {
        if (!entityId) return;
        if (!selectedWorkflowCode) return toast.error("Select a workflow");
        if (!titleValue.trim()) return toast.error("Title is required");

        try {
            const attachments =
                files.length > 0 && referenceAttachmentType
                    ? (await uploadDocuments({ files })).map((file) => ({
                          attachment_type_id: referenceAttachmentType.id,
                          file_url: file.fileUrl,
                          file_name: file.fileName,
                          mime_type: file.mimeType,
                          file_size_bytes: file.fileSizeBytes,
                      }))
                    : [];

            await createWorkflow.mutateAsync({
                workflow_code: selectedWorkflowCode,
                title: titleValue.trim(),
                ...(description.trim() ? { description: description.trim() } : {}),
                ...(attachments.length > 0 ? { attachments } : {}),
            });
            toast.success("Workflow requested");
            setIsCreateOpen(false);
            resetForm();
        } catch (error: any) {
            toast.error(error.message || "Failed to create workflow request");
        }
    };

    const handleSave = async (id: string, currentStatus: string) => {
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
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2">
                        <Workflow className="h-5 w-5" />
                        {title}
                    </CardTitle>
                    <Dialog
                        open={isCreateOpen}
                        onOpenChange={(open) => {
                            setIsCreateOpen(open);
                            if (open) {
                                setSelectedWorkflowCode(definitions[0]?.code || "");
                            } else {
                                resetForm();
                            }
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button size="sm" disabled={definitions.length === 0}>
                                <Plus className="mr-1 h-4 w-4" />
                                Request Workflow
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Request Internal Workflow</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Workflow</Label>
                                    <Select
                                        value={selectedWorkflowCode}
                                        onValueChange={setSelectedWorkflowCode}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select workflow" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {definitions.map((definition) => (
                                                <SelectItem
                                                    key={definition.id}
                                                    value={definition.code}
                                                >
                                                    {definition.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {selectedDefinition?.description ? (
                                        <p className="text-xs text-muted-foreground">
                                            {selectedDefinition.description}
                                        </p>
                                    ) : null}
                                </div>
                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input
                                        value={titleValue}
                                        onChange={(event) => setTitleValue(event.target.value)}
                                        placeholder="What support is needed?"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description / Notes</Label>
                                    <Textarea
                                        value={description}
                                        onChange={(event) => setDescription(event.target.value)}
                                        rows={4}
                                        placeholder="Scope, timing, constraints, and context"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Reference Files (Optional)</Label>
                                    <Input
                                        type="file"
                                        multiple
                                        onChange={(event) =>
                                            setFiles(Array.from(event.target.files || []))
                                        }
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleCreate} disabled={createWorkflow.isPending}>
                                    {createWorkflow.isPending ? "Saving..." : "Submit Request"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading && (
                    <>
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </>
                )}

                {!isLoading && grouped.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        No internal workflow types are enabled for this record.
                    </p>
                )}

                {grouped.map(({ definition, requests }) => (
                    <div
                        key={definition.id}
                        className="space-y-3 rounded-lg border border-border/60 p-4"
                    >
                        <div>
                            <p className="text-sm font-semibold">{definition.label}</p>
                            {definition.description ? (
                                <p className="text-xs text-muted-foreground">
                                    {definition.description}
                                </p>
                            ) : null}
                        </div>
                        {requests.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No requests created for this workflow yet.
                            </p>
                        ) : (
                            requests.map((workflow) => (
                                <div
                                    key={workflow.id}
                                    className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-semibold">{workflow.title}</p>
                                                <Badge
                                                    variant={
                                                        LIFECYCLE_BADGE_VARIANT[
                                                            workflow.lifecycle_state
                                                        ]
                                                    }
                                                >
                                                    {workflow.lifecycle_state}
                                                </Badge>
                                            </div>
                                            {workflow.description ? (
                                                <p className="text-sm leading-relaxed text-muted-foreground">
                                                    {workflow.description}
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className="text-right text-xs font-mono text-muted-foreground">
                                            <p>{workflow.requested_by_role}</p>
                                            <p>
                                                {new Date(workflow.requested_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
                                        <Select
                                            value={draftStatuses[workflow.id] || workflow.status}
                                            onValueChange={(value) =>
                                                setDraftStatuses((prev) => ({
                                                    ...prev,
                                                    [workflow.id]: value,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DEFAULT_STATUS_OPTIONS.map((status) => (
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
                            ))
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
