"use client";

/**
 * Add Maintenance Notes Dialog Component (Phase 12)
 * For adding detailed notes on desktop after scan-in
 */

import { useState } from "react";
import { useAddMaintenanceNotes } from "@/hooks/use-conditions";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";

interface AddNotesDialogProps {
	assetId: string;
	assetName: string;
	onSuccess?: () => void;
}

export function AddNotesDialog({
	assetId,
	assetName,
	onSuccess,
}: AddNotesDialogProps) {
	const [open, setOpen] = useState(false);
	const [notes, setNotes] = useState("");
	const addNotes = useAddMaintenanceNotes();

	const handleSubmit = async () => {
		if (!notes.trim()) {
			toast.error("Notes cannot be empty");
			return;
		}

		try {
			await addNotes.mutateAsync({
				assetId,
				notes,
			});

			toast.success("Maintenance notes added successfully");

			setNotes("");
			setOpen(false);
			onSuccess?.();
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to add maintenance notes";
			toast.error(message);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="gap-2 font-mono uppercase tracking-wider"
				>
					<Plus className="h-4 w-4" />
					Add Notes
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl font-mono">
				<DialogHeader>
					<div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
						<FileText className="h-4 w-4" />
						<span>Maintenance / Documentation</span>
					</div>
					<DialogTitle className="text-2xl">
						Add Maintenance Notes
					</DialogTitle>
					<DialogDescription>
						Add detailed notes about maintenance requirements, observations,
						or follow-up actions
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Asset Info */}
					<div className="rounded-lg border bg-muted/50 p-3">
						<p className="text-xs uppercase tracking-wider text-muted-foreground">
							Asset
						</p>
						<p className="mt-1 font-semibold">{assetName}</p>
					</div>

					{/* Notes Input */}
					<div className="space-y-2">
						<Label
							htmlFor="notes"
							className="text-xs uppercase tracking-wider text-muted-foreground"
						>
							Notes *
						</Label>
						<Textarea
							id="notes"
							placeholder="Enter detailed maintenance notes, observations, or action items..."
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={10}
							className="resize-none font-mono text-sm"
						/>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setOpen(false)}
						disabled={addNotes.isPending}
						className="font-mono"
					>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={addNotes.isPending || !notes.trim()}
						className="gap-2 font-mono"
					>
						<FileText className="h-4 w-4" />
						{addNotes.isPending ? "Adding..." : "Add Notes"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
