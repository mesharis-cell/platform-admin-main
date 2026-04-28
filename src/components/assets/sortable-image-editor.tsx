"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    horizontalListSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Camera, ChevronLeft, ChevronRight, GripVertical, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ImageItem = { url: string; note?: string };

type Props = {
    images: ImageItem[];
    onReorder: (next: ImageItem[]) => Promise<void> | void;
    onRemove: (index: number) => Promise<void> | void;
    onAdd?: (files: File[]) => Promise<void> | void;
    isMutating?: boolean;
    title?: string;
    emptyLabel?: string;
};

// Stable id per image — index alone breaks dnd-kit when items reorder. URL is
// unique within an asset/family in practice; suffix with index to survive any
// rare duplicate URL.
const itemId = (img: ImageItem, idx: number) => `${img.url}::${idx}`;

function SortableThumbnail({
    img,
    index,
    isActive,
    onSelect,
}: {
    img: ImageItem;
    index: number;
    isActive: boolean;
    onSelect: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: itemId(img, index),
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative w-20 h-20 shrink-0 rounded-md overflow-hidden border-2 ${
                isActive ? "border-primary" : "border-border hover:border-primary/50"
            } transition-colors group`}
        >
            <button
                type="button"
                onClick={onSelect}
                className="absolute inset-0"
                aria-label={`Show photo ${index + 1}`}
            >
                <Image
                    src={img.url}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    className="object-contain"
                />
            </button>
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="absolute top-0 left-0 p-1 bg-background/80 backdrop-blur-sm rounded-br-md opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
                aria-label="Drag to reorder"
                title="Drag to reorder"
            >
                <GripVertical className="w-3 h-3" />
            </button>
        </div>
    );
}

export function SortableImageEditor({
    images,
    onReorder,
    onRemove,
    onAdd,
    isMutating,
    title = "Photos",
    emptyLabel,
}: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Keep currentIndex in range when images shrink (delete) or array length changes.
    useEffect(() => {
        if (images.length === 0) {
            if (currentIndex !== 0) setCurrentIndex(0);
            return;
        }
        if (currentIndex >= images.length) setCurrentIndex(images.length - 1);
    }, [images.length, currentIndex]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function handleDragEnd(e: DragEndEvent) {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const oldIndex = images.findIndex((img, idx) => itemId(img, idx) === active.id);
        const newIndex = images.findIndex((img, idx) => itemId(img, idx) === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        const next = arrayMove(images, oldIndex, newIndex);
        // Track the moved image — keep it as the current selection across reorder.
        if (currentIndex === oldIndex) setCurrentIndex(newIndex);
        else if (oldIndex < currentIndex && newIndex >= currentIndex)
            setCurrentIndex(currentIndex - 1);
        else if (oldIndex > currentIndex && newIndex <= currentIndex)
            setCurrentIndex(currentIndex + 1);
        void onReorder(next);
    }

    async function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
        if (!onAdd) return;
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        e.target.value = "";
        await onAdd(files);
    }

    const sortableIds = images.map((img, idx) => itemId(img, idx));
    const hero = images[currentIndex];
    const inputId = `inline-photo-upload-${title.replace(/\s+/g, "-").toLowerCase()}`;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3 px-6">
                <CardTitle className="font-mono text-sm">
                    {title} ({images.length})
                </CardTitle>
                {onAdd && (
                    <label htmlFor={inputId} className="cursor-pointer">
                        <Button
                            variant="outline"
                            size="sm"
                            className="font-mono pointer-events-none"
                            disabled={isMutating}
                            asChild
                        >
                            <span>
                                {isMutating ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                ) : (
                                    <Camera className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                Add Photo
                            </span>
                        </Button>
                        <input
                            id={inputId}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleAdd}
                        />
                    </label>
                )}
            </CardHeader>
            <CardContent className="p-6 pt-0">
                {hero ? (
                    <>
                        <div className="relative aspect-16/10 bg-muted rounded-lg overflow-hidden mb-4">
                            <Image src={hero.url} alt="Selected" fill className="object-contain" />
                            <button
                                type="button"
                                onClick={() => onRemove(currentIndex)}
                                className="absolute top-2 right-2 p-1.5 bg-destructive/90 text-destructive-foreground rounded-md hover:bg-destructive transition-colors"
                                title="Remove this photo"
                                disabled={isMutating}
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                            {images.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCurrentIndex(
                                                (prev) => (prev - 1 + images.length) % images.length
                                            )
                                        }
                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-background/90 backdrop-blur-sm rounded-full border border-border hover:bg-background transition-colors"
                                        aria-label="Previous photo"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCurrentIndex((prev) => (prev + 1) % images.length)
                                        }
                                        className="absolute right-10 top-1/2 -translate-y-1/2 p-2 bg-background/90 backdrop-blur-sm rounded-full border border-border hover:bg-background transition-colors"
                                        aria-label="Next photo"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>

                        {hero.note && (
                            <p className="text-xs text-muted-foreground italic px-1 py-1">
                                {hero.note}
                            </p>
                        )}

                        {images.length > 1 && (
                            <>
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={sortableIds}
                                        strategy={horizontalListSortingStrategy}
                                    >
                                        <div className="flex gap-2 overflow-x-auto pb-1">
                                            {images.map((img, index) => (
                                                <SortableThumbnail
                                                    key={itemId(img, index)}
                                                    img={img}
                                                    index={index}
                                                    isActive={index === currentIndex}
                                                    onSelect={() => setCurrentIndex(index)}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                                <p className="mt-2 text-[10px] uppercase tracking-wide font-mono text-muted-foreground">
                                    Drag a thumbnail to reorder. The first photo is used as the
                                    catalog thumbnail.
                                </p>
                            </>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Camera className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-sm font-mono">No photos yet</p>
                        {emptyLabel && <p className="text-xs font-mono mt-1">{emptyLabel}</p>}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
