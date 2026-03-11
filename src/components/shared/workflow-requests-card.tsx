"use client";

import { type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle, FileText, Plus, Workflow } from "lucide-react";
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
    type WorkflowDefinitionRecord,
    type WorkflowEntityType,
    type WorkflowLifecycleState,
    type WorkflowRequestRecord,
} from "@/hooks/use-workflow-requests";
import { usePlatform } from "@/contexts/platform-context";
import { uploadDocuments } from "@/lib/utils/upload-documents";

const LIFECYCLE_BADGE_VARIANT: Record<WorkflowLifecycleState, "default" | "secondary" | "outline"> =
    {
        OPEN: "outline",
        ACTIVE: "secondary",
        DONE: "default",
        CANCELLED: "outline",
    };

type WorkflowSectionProps = {
    definition: WorkflowDefinitionRecord;
    requests: WorkflowRequestRecord[];
    draftStatuses: Record<string, string>;
    draftNotes: Record<string, string>;
    onStatusChange: (id: string, value: string) => void;
    onNoteChange: (id: string, value: string) => void;
    onSave: (id: string, currentStatus: string) => void;
};

const renderSimpleRequestSection = ({
    definition,
    requests,
    draftStatuses,
    draftNotes,
    onStatusChange,
    onNoteChange,
    onSave,
}: WorkflowSectionProps) => (
    <div key={definition.id} className="space-y-3 rounded-lg border border-border/60 p-4">
        <div>
            <p className="text-sm font-semibold">{definition.label}</p>
            {definition.description ? (
                <p className="text-xs text-muted-foreground">{definition.description}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
                {definition.family?.label || definition.workflow_family} ·{" "}
                {definition.status_model?.label || definition.status_model_key}
            </p>
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
                                <Badge variant={LIFECYCLE_BADGE_VARIANT[workflow.lifecycle_state]}>
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
                            <p>{new Date(workflow.requested_at).toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
                        <Select
                            value={draftStatuses[workflow.id] || workflow.status}
                            onValueChange={(value) => onStatusChange(workflow.id, value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(definition.status_model?.statuses || [workflow.status]).map(
                                    (status) => (
                                        <SelectItem key={status} value={status}>
                                            {status.replace(/_/g, " ")}
                                        </SelectItem>
                                    )
                                )}
                            </SelectContent>
                        </Select>
                        <Textarea
                            value={draftNotes[workflow.id] || ""}
                            onChange={(event) => onNoteChange(workflow.id, event.target.value)}
                            rows={2}
                            placeholder="Optional admin note stored in workflow metadata"
                        />
                        <Button
                            variant="outline"
                            onClick={() => onSave(workflow.id, workflow.status)}
                        >
                            Save
                        </Button>
                    </div>
                </div>
            ))
        )}
    </div>
);

const renderDocumentCollectionSection = ({
    definition,
    requests,
    draftStatuses,
    draftNotes,
    onStatusChange,
    onNoteChange,
    onSave,
}: WorkflowSectionProps) => (
    <div key={definition.id} className="space-y-3 rounded-lg border border-border/60 p-4">
        <div>
            <p className="text-sm font-semibold flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-muted-foreground" />
                {definition.label}
            </p>
            {definition.description ? (
                <p className="text-xs text-muted-foreground">{definition.description}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
                {definition.family?.label || definition.workflow_family} ·{" "}
                {definition.status_model?.label || definition.status_model_key}
            </p>
        </div>
        {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No document collection requests yet.</p>
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
                                <Badge variant={LIFECYCLE_BADGE_VARIANT[workflow.lifecycle_state]}>
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
                            <p>Document Status</p>
                            <p>{workflow.requested_by_role}</p>
                            <p>{new Date(workflow.requested_at).toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
                        <Select
                            value={draftStatuses[workflow.id] || workflow.status}
                            onValueChange={(value) => onStatusChange(workflow.id, value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(definition.status_model?.statuses || [workflow.status]).map(
                                    (status) => (
                                        <SelectItem key={status} value={status}>
                                            {status.replace(/_/g, " ")}
                                        </SelectItem>
                                    )
                                )}
                            </SelectContent>
                        </Select>
                        <Textarea
                            value={draftNotes[workflow.id] || ""}
                            onChange={(event) => onNoteChange(workflow.id, event.target.value)}
                            rows={2}
                            placeholder="Optional note about document status"
                        />
                        <Button
                            variant="outline"
                            onClick={() => onSave(workflow.id, workflow.status)}
                        >
                            Save
                        </Button>
                    </div>
                </div>
            ))
        )}
    </div>
);

const TERMINAL_APPROVAL_STATUSES = ["APPROVED", "REJECTED"];
const APPROVAL_BADGE_CLASS: Record<string, string> = {
    APPROVED: "bg-green-100 text-green-800 border-green-200",
    REJECTED: "bg-red-100 text-red-800 border-red-200",
};

const renderApprovalSection = ({
    definition,
    requests,
    draftStatuses,
    draftNotes,
    onStatusChange,
    onNoteChange,
    onSave,
}: WorkflowSectionProps) => (
    <div key={definition.id} className="space-y-3 rounded-lg border border-border/60 p-4">
        <div>
            <p className="text-sm font-semibold flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                {definition.label}
            </p>
            {definition.description ? (
                <p className="text-xs text-muted-foreground">{definition.description}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
                {definition.family?.label || definition.workflow_family} ·{" "}
                {definition.status_model?.label || definition.status_model_key}
            </p>
        </div>
        {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approval requests yet.</p>
        ) : (
            requests.map((workflow) => {
                const currentDraft = draftStatuses[workflow.id] || workflow.status;
                const isTerminal = TERMINAL_APPROVAL_STATUSES.includes(currentDraft);
                return (
                    <div
                        key={workflow.id}
                        className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold">{workflow.title}</p>
                                    <Badge
                                        variant={LIFECYCLE_BADGE_VARIANT[workflow.lifecycle_state]}
                                    >
                                        {workflow.lifecycle_state}
                                    </Badge>
                                    {APPROVAL_BADGE_CLASS[workflow.status] && (
                                        <Badge
                                            variant="outline"
                                            className={APPROVAL_BADGE_CLASS[workflow.status]}
                                        >
                                            {workflow.status}
                                        </Badge>
                                    )}
                                </div>
                                {workflow.description ? (
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        {workflow.description}
                                    </p>
                                ) : null}
                            </div>
                            <div className="text-right text-xs font-mono text-muted-foreground">
                                <p>{workflow.requested_by_role}</p>
                                <p>{new Date(workflow.requested_at).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
                            <Select
                                value={currentDraft}
                                onValueChange={(value) => onStatusChange(workflow.id, value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(definition.status_model?.statuses || [workflow.status]).map(
                                        (status) => (
                                            <SelectItem key={status} value={status}>
                                                {status.replace(/_/g, " ")}
                                            </SelectItem>
                                        )
                                    )}
                                </SelectContent>
                            </Select>
                            <Textarea
                                value={draftNotes[workflow.id] || ""}
                                onChange={(event) => onNoteChange(workflow.id, event.target.value)}
                                rows={2}
                                placeholder="Approval notes or reason for rejection"
                            />
                            <Button
                                variant={isTerminal ? "default" : "outline"}
                                onClick={() => onSave(workflow.id, workflow.status)}
                            >
                                {isTerminal ? "Submit Decision" : "Save"}
                            </Button>
                        </div>
                    </div>
                );
            })
        )}
    </div>
);

const WORKFLOW_SECTION_RENDERERS: Record<string, (props: WorkflowSectionProps) => ReactNode> = {
    simple_request: renderSimpleRequestSection,
    document_collection: renderDocumentCollectionSection,
    approval: renderApprovalSection,
};

export function WorkflowRequestsCard({
    entityType,
    entityId,
    title = "Workflows",
}: {
    entityType: WorkflowEntityType;
    entityId: string | null;
    title?: string;
}) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedWorkflowCode, setSelectedWorkflowCode] = useState("");
    const [selectedAttachmentTypeId, setSelectedAttachmentTypeId] = useState("");
    const [titleValue, setTitleValue] = useState("");
    const [description, setDescription] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
    const [draftStatuses, setDraftStatuses] = useState<Record<string, string>>({});

    const { platform } = usePlatform();
    const workflowFeatureEnabled = platform?.features?.enable_workflows !== false;
    const attachmentFeatureEnabled = platform?.features?.enable_attachments !== false;

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
    const workflowAttachmentTypes = useMemo(
        () => (attachmentTypesData?.data || []).filter((type) => type.is_active),
        [attachmentTypesData?.data]
    );

    const grouped = definitions.map((definition) => ({
        definition,
        requests: workflows.filter((workflow) => workflow.workflow_code === definition.code),
    }));

    const resetForm = () => {
        setSelectedWorkflowCode(definitions[0]?.code || "");
        setSelectedAttachmentTypeId(workflowAttachmentTypes[0]?.id || "");
        setTitleValue("");
        setDescription("");
        setFiles([]);
    };

    const handleCreate = async () => {
        if (!entityId) return;
        if (!selectedWorkflowCode) return toast.error("Select a workflow");
        if (!titleValue.trim()) return toast.error("Title is required");
        if (files.length > 0 && !selectedAttachmentTypeId) {
            return toast.error("Select an attachment type for the uploaded files");
        }

        try {
            const attachments =
                files.length > 0
                    ? (await uploadDocuments({ files })).map((file) => ({
                          attachment_type_id: selectedAttachmentTypeId,
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

    if (!workflowFeatureEnabled) {
        return null;
    }

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
                                setSelectedAttachmentTypeId(workflowAttachmentTypes[0]?.id || "");
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
                                    {selectedDefinition?.family ? (
                                        <p className="text-xs text-muted-foreground">
                                            {selectedDefinition.family.label} ·{" "}
                                            {selectedDefinition.status_model?.label}
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
                                {attachmentFeatureEnabled ? (
                                    <div className="space-y-4">
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
                                        {files.length > 0 && workflowAttachmentTypes.length > 0 ? (
                                            <div className="space-y-2">
                                                <Label>Attachment Type</Label>
                                                <Select
                                                    value={selectedAttachmentTypeId}
                                                    onValueChange={setSelectedAttachmentTypeId}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select attachment type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {workflowAttachmentTypes.map((type) => (
                                                            <SelectItem
                                                                key={type.id}
                                                                value={type.id}
                                                            >
                                                                {type.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
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

                {grouped.map(({ definition, requests }) => {
                    const renderer =
                        WORKFLOW_SECTION_RENDERERS[definition.workflow_family] ||
                        renderSimpleRequestSection;
                    return renderer({
                        definition,
                        requests,
                        draftStatuses,
                        draftNotes,
                        onStatusChange: (id, value) =>
                            setDraftStatuses((prev) => ({ ...prev, [id]: value })),
                        onNoteChange: (id, value) =>
                            setDraftNotes((prev) => ({ ...prev, [id]: value })),
                        onSave: handleSave,
                    });
                })}
            </CardContent>
        </Card>
    );
}
