"use client";

import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type PointerEventHandler,
    type MouseEventHandler,
    type WheelEventHandler,
} from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface ViewerImageItem {
    url: string;
    note?: string;
}

interface ImageViewerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    images: ViewerImageItem[];
    initialIndex?: number;
    title?: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;

export function ImageViewerModal({
    open,
    onOpenChange,
    images,
    initialIndex = 0,
    title = "Image Viewer",
}: ImageViewerModalProps) {
    const [index, setIndex] = useState(initialIndex);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const stageRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;
        const bounded = Math.max(0, Math.min(initialIndex, Math.max(images.length - 1, 0)));
        setIndex(bounded);
        setScale(1);
        setOffset({ x: 0, y: 0 });
    }, [open, initialIndex, images.length]);

    const current = useMemo(() => images[index], [images, index]);

    const resetTransform = () => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
    };

    const goTo = (next: number) => {
        const bounded = Math.max(0, Math.min(next, images.length - 1));
        setIndex(bounded);
        resetTransform();
    };

    const onWheel: WheelEventHandler<HTMLDivElement> = (event) => {
        event.preventDefault();
        const delta = event.deltaY < 0 ? 0.25 : -0.25;
        setScale((prev) => {
            const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev + delta));
            if (next === MIN_SCALE) setOffset({ x: 0, y: 0 });
            return next;
        });
    };

    const onPointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
        if (scale <= 1) return;
        setDragStart({ x: event.clientX - offset.x, y: event.clientY - offset.y });
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const onPointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
        if (!dragStart || scale <= 1) return;
        setOffset({
            x: event.clientX - dragStart.x,
            y: event.clientY - dragStart.y,
        });
    };

    const onPointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
        if (!dragStart) return;
        setDragStart(null);
        event.currentTarget.releasePointerCapture(event.pointerId);
    };

    const onDoubleClick: MouseEventHandler<HTMLDivElement> = () => {
        setScale((prev) => {
            const next = prev > 1 ? 1 : 2;
            if (next === 1) setOffset({ x: 0, y: 0 });
            return next;
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[96vw] max-w-5xl p-0 overflow-hidden">
                <DialogHeader className="p-4 pb-2">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Scroll to zoom. Drag to pan while zoomed. Double-click to reset.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 pb-4 space-y-3">
                    <div className="relative rounded-lg border bg-black/90">
                        <div
                            ref={stageRef}
                            className="relative h-[55vh] w-full overflow-hidden touch-none cursor-grab active:cursor-grabbing"
                            onWheel={onWheel}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={() => setDragStart(null)}
                            onDoubleClick={onDoubleClick}
                        >
                            {current ? (
                                <img
                                    src={current.url}
                                    alt={`Photo ${index + 1}`}
                                    className="absolute left-1/2 top-1/2 max-h-full max-w-full select-none"
                                    style={{
                                        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
                                        transformOrigin: "center center",
                                    }}
                                />
                            ) : null}
                        </div>

                        {images.length > 1 ? (
                            <>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="secondary"
                                    className="absolute left-3 top-1/2 -translate-y-1/2"
                                    onClick={() => goTo(index - 1)}
                                    disabled={index <= 0}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="secondary"
                                    className="absolute right-3 top-1/2 -translate-y-1/2"
                                    onClick={() => goTo(index + 1)}
                                    disabled={index >= images.length - 1}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </>
                        ) : null}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                            {images.length === 0
                                ? "No image"
                                : `Image ${index + 1} of ${images.length}`}
                        </span>
                        <span>{scale.toFixed(2)}x</span>
                    </div>

                    {current?.note ? (
                        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                            {current.note}
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}
