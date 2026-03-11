"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import {
    useAttachmentTypes,
    useCreateEntityAttachments,
    useDeleteAttachment,
    useEntityAttachments,
    type AttachmentEntityType,
} from "@/hooks/use-attachments";
import { uploadDocuments } from "@/lib/utils/upload-documents";
import { usePlatform } from "@/contexts/platform-context";
import { Download, FileText, Plus, Trash2 } from "lucide-react";

const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function EntityAttachmentsCard({
    entityType,
    entityId,
    title = "Supporting Documents",
}: {
    entityType: Exclude<AttachmentEntityType, "WORKFLOW_REQUEST">;
    entityId: string | null;
    title?: string;
}) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedTypeId, setSelectedTypeId] = useState("");
    const [note, setNote] = useState("");
    const [visibleToClient, setVisibleToClient] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const { platform } = usePlatform();

    const { data, isLoading } = useEntityAttachments(entityType, entityId);
    const { data: attachmentTypesData } = useAttachmentTypes(entityType);
    const createAttachments = useCreateEntityAttachments(entityType, entityId);
    const deleteAttachment = useDeleteAttachment();

    const attachmentTypes = useMemo(
        () => (attachmentTypesData?.data || []).filter((type) => type.is_active),
        [attachmentTypesData?.data]
    );
    const selectedType = attachmentTypes.find((type) => type.id === selectedTypeId);
    const confirmDeleteAttachment = (data?.data || []).find((a) => a.id === confirmDeleteId);

    if (platform?.features?.enable_attachments === false) {
        return null;
    }

    const resetForm = () => {
        setSelectedTypeId("");
        setNote("");
        setVisibleToClient(false);
        setFiles([]);
    };

    const handleCreate = async () => {
        if (!entityId) return;
        if (!selectedTypeId) {
            toast.error("Select an attachment type");
            return;
        }
        if (files.length === 0) {
            toast.error("Choose at least one file");
            return;
        }
        if (selectedType?.required_note && !note.trim()) {
            toast.error("A note is required for this attachment type");
            return;
        }

        try {
            const uploaded = await uploadDocuments({ files });
            await createAttachments.mutateAsync(
                uploaded.map((file) => ({
                    attachment_type_id: selectedTypeId,
                    file_url: file.fileUrl,
                    file_name: file.fileName,
                    mime_type: file.mimeType,
                    file_size_bytes: file.fileSizeBytes,
                    note: note || undefined,
                    visible_to_client: visibleToClient,
                }))
            );
            toast.success("Attachments added");
            setIsCreateOpen(false);
            resetForm();
        } catch (error: any) {
            toast.error(error.message || "Failed to add attachments");
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {title}
                    </CardTitle>
                    <Dialog
                        open={isCreateOpen}
                        onOpenChange={(open) => {
                            setIsCreateOpen(open);
                            if (!open) resetForm();
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Add Attachment</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Attachment Type</Label>
                                    <Select
                                        value={selectedTypeId}
                                        onValueChange={setSelectedTypeId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {attachmentTypes.map((type) => (
                                                <SelectItem key={type.id} value={type.id}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Files</Label>
                                    <Input
                                        type="file"
                                        multiple
                                        onChange={(event) =>
                                            setFiles(Array.from(event.target.files || []))
                                        }
                                    />
                                    {files.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            {files.length} file(s) selected
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>
                                        Note
                                        {selectedType?.required_note && (
                                            <span className="text-destructive ml-1">*</span>
                                        )}
                                    </Label>
                                    <Textarea
                                        value={note}
                                        onChange={(event) => setNote(event.target.value)}
                                        rows={3}
                                        placeholder={
                                            selectedType?.required_note
                                                ? "A note is required for this attachment type"
                                                : "Optional context for these files"
                                        }
                                    />
                                </div>
                                {selectedType?.view_roles.includes("CLIENT") ? (
                                    <label className="flex items-start gap-3 rounded-md border border-border/60 p-3">
                                        <Checkbox
                                            checked={visibleToClient}
                                            onCheckedChange={(checked) =>
                                                setVisibleToClient(checked === true)
                                            }
                                        />
                                        <div>
                                            <p className="text-sm font-medium">Visible to client</p>
                                            <p className="text-xs text-muted-foreground">
                                                Enable this if client users should be able to see
                                                and download these documents.
                                            </p>
                                        </div>
                                    </label>
                                ) : null}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreate}
                                    disabled={createAttachments.isPending}
                                >
                                    {createAttachments.isPending ? "Saving..." : "Add Attachment"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {isLoading && (
                    <>
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </>
                )}

                {!isLoading && (data?.data || []).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        No supporting documents have been added yet.
                    </p>
                )}

                {(data?.data || []).map((attachment) => (
                    <div
                        key={attachment.id}
                        className="rounded-lg border border-border/60 bg-muted/10 p-3"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                                    {attachment.attachment_type.label}
                                </p>
                                <p className="font-medium break-all">{attachment.file_name}</p>
                                <div className="flex flex-wrap gap-2 mt-2 text-xs font-mono text-muted-foreground">
                                    <span>{new Date(attachment.created_at).toLocaleString()}</span>
                                    {attachment.file_size_bytes ? (
                                        <span>{formatFileSize(attachment.file_size_bytes)}</span>
                                    ) : null}
                                    {attachment.uploaded_by_user?.name ? (
                                        <span>by {attachment.uploaded_by_user.name}</span>
                                    ) : null}
                                    {attachment.visible_to_client && (
                                        <span className="rounded-full border px-2 py-0.5">
                                            Client visible
                                        </span>
                                    )}
                                </div>
                                {attachment.note && (
                                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                        {attachment.note}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button asChild size="icon" variant="outline">
                                    <a
                                        href={attachment.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        download={attachment.file_name}
                                    >
                                        <Download className="h-4 w-4" />
                                    </a>
                                </Button>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => setConfirmDeleteId(attachment.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>

            <ConfirmDialog
                open={!!confirmDeleteId}
                onOpenChange={(open) => {
                    if (!open) setConfirmDeleteId(null);
                }}
                onConfirm={() => {
                    if (confirmDeleteId) {
                        deleteAttachment.mutate(confirmDeleteId);
                        setConfirmDeleteId(null);
                    }
                }}
                title="Delete Attachment"
                description={`Are you sure you want to delete "${confirmDeleteAttachment?.file_name || "this attachment"}"? This cannot be undone.`}
                confirmText="Delete"
                variant="destructive"
            />
        </Card>
    );
}
