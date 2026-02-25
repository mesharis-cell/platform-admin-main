"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Html5Qrcode } from "html5-qrcode";
import {
    ArrowLeft,
    BookmarkPlus,
    User,
    Briefcase,
    FileText,
    Camera,
    CameraOff,
    CheckCircle2,
    XCircle,
    Clock,
    Package,
    ScanLine,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useSelfBooking, useReturnScan, useCancelSelfBooking } from "@/hooks/use-self-bookings";
import type { SelfBookingStatus, SelfBookingItem } from "@/types/self-booking";

function StatusBadge({ status }: { status: SelfBookingStatus }) {
    if (status === "ACTIVE")
        return (
            <Badge
                className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-mono"
                variant="outline"
            >
                <Clock className="w-3 h-3 mr-1" />
                Active
            </Badge>
        );
    if (status === "COMPLETED")
        return (
            <Badge
                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono"
                variant="outline"
            >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Completed
            </Badge>
        );
    return (
        <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-mono" variant="outline">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
        </Badge>
    );
}

function ItemRow({ item }: { item: SelfBookingItem }) {
    const pct = Math.round((item.returned_quantity / item.quantity) * 100);
    return (
        <div className="flex items-center gap-4 py-3">
            <Package className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="font-mono font-medium text-sm truncate">{item.asset?.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{item.asset?.qr_code}</p>
            </div>
            <div className="w-32 space-y-1">
                <Progress value={pct} className="h-1.5" />
                <p className="text-xs font-mono text-muted-foreground text-right">
                    {item.returned_quantity}/{item.quantity}
                </p>
            </div>
            <Badge
                variant="outline"
                className={`font-mono text-xs shrink-0 ${item.status === "RETURNED" ? "text-emerald-600 border-emerald-500/20" : "text-blue-600 border-blue-500/20"}`}
            >
                {item.status === "RETURNED" ? "Returned" : "Out"}
            </Badge>
        </div>
    );
}

export default function SelfBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data, isLoading } = useSelfBooking(id);
    const booking = data?.data;

    const returnScanMutation = useReturnScan(id);
    const cancelMutation = useCancelSelfBooking();

    // Return scanning
    const [scannerOpen, setScannerOpen] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastReturn, setLastReturn] = useState<string | null>(null);
    const qrScannerRef = useRef<Html5Qrcode | null>(null);
    const lastScanRef = useRef<number>(0);
    const isScanningRef = useRef(false);

    // Cancel dialog
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState("");

    const stopScanner = useCallback(async () => {
        if (qrScannerRef.current) {
            try {
                await qrScannerRef.current.stop();
                await qrScannerRef.current.clear();
            } catch {
                /* ignore stop errors */
            }
            qrScannerRef.current = null;
        }
        setCameraActive(false);
    }, []);

    const startScanner = useCallback(async () => {
        if (qrScannerRef.current) return;
        // eslint-disable-next-line creatr/no-browser-globals-in-ssr
        const el = document.getElementById("qr-scanner-return");
        if (!el) return;
        try {
            qrScannerRef.current = new Html5Qrcode("qr-scanner-return");
            await qrScannerRef.current.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decoded) => {
                    const now = Date.now();
                    if (now - lastScanRef.current < 3000) return;
                    if (isScanningRef.current) return;
                    lastScanRef.current = now;
                    handleReturnScan(decoded);
                },
                undefined
            );
            setCameraActive(true);
        } catch (err) {
            toast.error("Camera failed to start");
        }
    }, []);

    useEffect(() => {
        if (scannerOpen) startScanner();
        else stopScanner();
    }, [scannerOpen, startScanner, stopScanner]);

    useEffect(
        () => () => {
            stopScanner();
        },
        [stopScanner]
    );

    async function handleReturnScan(qrCode: string) {
        isScanningRef.current = true;
        setIsProcessing(true);
        try {
            const result = await returnScanMutation.mutateAsync({ qr_code: qrCode });
            const updatedBooking = result?.data;
            setLastReturn(qrCode);
            toast.success(`Returned: ${qrCode}`);

            if (updatedBooking?.status === "COMPLETED") {
                toast.success("All items returned — booking completed!", { duration: 4000 });
                stopScanner();
                setScannerOpen(false);
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Return failed");
        } finally {
            setIsProcessing(false);
            isScanningRef.current = false;
        }
    }

    async function handleCancel() {
        try {
            await cancelMutation.mutateAsync({
                id,
                data: { cancellation_reason: cancelReason || undefined },
            });
            toast.success("Booking cancelled");
            setCancelOpen(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to cancel");
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background p-6 space-y-6 max-w-[900px] mx-auto">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <BookmarkPlus className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="font-mono text-sm">Booking not found</p>
                    <Button asChild variant="outline" size="sm" className="mt-4 font-mono">
                        <Link href="/self-bookings">
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    const totalQty = booking.items.reduce((s, i) => s + i.quantity, 0);
    const returnedQty = booking.items.reduce((s, i) => s + i.returned_quantity, 0);
    const progressPct = totalQty > 0 ? Math.round((returnedQty / totalQty) * 100) : 0;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card">
                <div className="max-w-[900px] mx-auto px-6 py-4 flex items-center justify-between">
                    <Button variant="ghost" asChild className="font-mono">
                        <Link href="/self-bookings">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Self-Bookings
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        {booking.status === "ACTIVE" && (
                            <>
                                <Button
                                    size="sm"
                                    className="font-mono"
                                    onClick={() => setScannerOpen(true)}
                                >
                                    <ScanLine className="w-4 h-4 mr-2" />
                                    Scan Return
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="font-mono text-destructive hover:text-destructive"
                                    onClick={() => setCancelOpen(true)}
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Cancel
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-[900px] mx-auto px-6 py-8 space-y-6">
                {/* Meta card */}
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle className="font-mono text-xl">
                                {booking.booked_for}
                            </CardTitle>
                            {booking.job_reference && (
                                <p className="text-sm text-muted-foreground font-mono mt-1 flex items-center gap-1.5">
                                    <Briefcase className="w-3.5 h-3.5" />
                                    {booking.job_reference}
                                </p>
                            )}
                        </div>
                        <StatusBadge status={booking.status} />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {booking.reason && (
                            <div className="flex items-start gap-2 text-sm font-mono">
                                <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                                <span className="text-muted-foreground">{booking.reason}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                            <User className="w-4 h-4" />
                            Created by {booking.created_by_user?.name || "Unknown"} ·{" "}
                            {format(new Date(booking.created_at), "d MMM yyyy, HH:mm")}
                        </div>
                        {booking.status === "CANCELLED" && booking.cancelled_by_user && (
                            <div className="flex items-start gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                                <div className="text-sm font-mono">
                                    <p className="text-destructive font-medium">
                                        Cancelled by {booking.cancelled_by_user.name}
                                    </p>
                                    {booking.cancellation_reason && (
                                        <p className="text-muted-foreground mt-0.5">
                                            {booking.cancellation_reason}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <Separator />

                        {/* Return progress */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm font-mono">
                                <span className="text-muted-foreground">Return progress</span>
                                <span className="font-semibold">
                                    {returnedQty}/{totalQty} units
                                </span>
                            </div>
                            <Progress value={progressPct} className="h-2" />
                        </div>
                    </CardContent>
                </Card>

                {/* Items */}
                <Card>
                    <CardHeader>
                        <CardTitle className="font-mono text-sm">
                            Items ({booking.items.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y divide-border px-6">
                        {booking.items.map((item) => (
                            <ItemRow key={item.id} item={item} />
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Return scanner dialog */}
            <Dialog
                open={scannerOpen}
                onOpenChange={(open) => {
                    if (!open) stopScanner();
                    setScannerOpen(open);
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-mono">Scan Returns</DialogTitle>
                        <DialogDescription className="font-mono text-xs">
                            Point camera at each asset QR code to mark it returned
                        </DialogDescription>
                    </DialogHeader>

                    <div
                        id="qr-scanner-return"
                        className="w-full aspect-4/3 bg-muted rounded-lg overflow-hidden flex items-center justify-center"
                    >
                        {!cameraActive && (
                            <div className="text-center text-muted-foreground">
                                <Camera className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                <p className="text-xs font-mono">Initializing…</p>
                            </div>
                        )}
                    </div>

                    {isProcessing && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-mono">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing return…
                        </div>
                    )}

                    {lastReturn && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <p className="text-sm font-mono text-emerald-600">
                                Returned: {lastReturn}
                            </p>
                        </div>
                    )}

                    <div className="text-center font-mono text-sm text-muted-foreground">
                        {returnedQty}/{totalQty} returned
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                stopScanner();
                                setScannerOpen(false);
                            }}
                            className="font-mono"
                        >
                            <CameraOff className="w-4 h-4 mr-2" />
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel confirmation dialog */}
            <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-mono">Cancel Booking?</DialogTitle>
                        <DialogDescription className="font-mono text-xs">
                            All unreturned items will be released. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label className="font-mono text-xs">Reason (Optional)</Label>
                        <Textarea
                            placeholder="Why is this booking being cancelled?"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="font-mono text-sm"
                            rows={2}
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setCancelOpen(false)}
                            className="font-mono"
                        >
                            Keep
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancel}
                            disabled={cancelMutation.isPending}
                            className="font-mono"
                        >
                            {cancelMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cancelling…
                                </>
                            ) : (
                                "Yes, Cancel"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
