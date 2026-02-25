"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Html5Qrcode } from "html5-qrcode";
import {
    ArrowLeft,
    Camera,
    CameraOff,
    Package,
    Trash2,
    ChevronRight,
    ChevronLeft,
    Loader2,
    Plus,
    BookmarkPlus,
    Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useCreateSelfBooking } from "@/hooks/use-self-bookings";
import { apiClient } from "@/lib/api/api-client";

interface ScannedItem {
    asset_id: string;
    asset_name: string;
    qr_code: string;
    tracking_method: string;
    quantity: number;
}

type Phase = "items" | "meta";

export default function NewSelfBookingPage() {
    const router = useRouter();
    const [phase, setPhase] = useState<Phase>("items");

    // Items phase
    const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
    const [cameraActive, setCameraActive] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const [quantityPrompt, setQuantityPrompt] = useState<{
        item: Omit<ScannedItem, "quantity">;
        qty: number;
    } | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const qrScannerRef = useRef<Html5Qrcode | null>(null);
    const lastScanRef = useRef<number>(0);
    const isScanningRef = useRef(false);

    // Meta phase
    const [bookedFor, setBookedFor] = useState("");
    const [reason, setReason] = useState("");
    const [jobRef, setJobRef] = useState("");
    const [notes, setNotes] = useState("");

    const createMutation = useCreateSelfBooking();

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
        const el = document.getElementById("qr-scanner-new-booking");
        if (!el) return;
        try {
            qrScannerRef.current = new Html5Qrcode("qr-scanner-new-booking");
            await qrScannerRef.current.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    const now = Date.now();
                    if (now - lastScanRef.current < 2000) return;
                    if (isScanningRef.current) return;
                    lastScanRef.current = now;
                    handleQrScan(decodedText);
                },
                undefined
            );
            setCameraActive(true);
        } catch (err) {
            toast.error("Camera failed to start", {
                description: err instanceof Error ? err.message : "Unknown error",
            });
        }
    }, []);

    useEffect(
        () => () => {
            stopScanner();
        },
        [stopScanner]
    );

    async function handleQrScan(qrCode: string) {
        isScanningRef.current = true;
        setIsResolving(true);
        try {
            const res = await apiClient.get(`/operations/v1/asset/qr/${qrCode}`);
            const asset = res.data?.data;
            if (!asset) throw new Error("Asset not found");

            const item: Omit<ScannedItem, "quantity"> = {
                asset_id: asset.id,
                asset_name: asset.name,
                qr_code: qrCode,
                tracking_method: asset.tracking_method,
            };

            if (asset.tracking_method === "BATCH") {
                setQuantityPrompt({ item, qty: 1 });
            } else {
                addItem({ ...item, quantity: 1 });
                toast.success(`Added: ${asset.name}`);
            }
        } catch (err) {
            toast.error("Failed to resolve QR code", {
                description: err instanceof Error ? err.message : "Unknown error",
            });
        } finally {
            setIsResolving(false);
            isScanningRef.current = false;
        }
    }

    function addItem(item: ScannedItem) {
        setScannedItems((prev) => {
            const existing = prev.find((i) => i.asset_id === item.asset_id);
            if (existing) {
                return prev.map((i) =>
                    i.asset_id === item.asset_id
                        ? { ...i, quantity: i.quantity + item.quantity }
                        : i
                );
            }
            return [...prev, item];
        });
    }

    function confirmQuantityPrompt() {
        if (!quantityPrompt) return;
        addItem({ ...quantityPrompt.item, quantity: quantityPrompt.qty });
        toast.success(`Added: ${quantityPrompt.item.asset_name} ×${quantityPrompt.qty}`);
        setQuantityPrompt(null);
    }

    function removeItem(assetId: string) {
        setScannedItems((prev) => prev.filter((i) => i.asset_id !== assetId));
    }

    async function handleSearch(q: string) {
        setSearchQuery(q);
        if (!q.trim()) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const res = await apiClient.get("/operations/v1/asset", {
                params: { search: q, limit: "8" },
            });
            setSearchResults(res.data?.data || []);
        } catch {
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }

    function addFromSearch(asset: any) {
        const item: Omit<ScannedItem, "quantity"> = {
            asset_id: asset.id,
            asset_name: asset.name,
            qr_code: asset.qr_code,
            tracking_method: asset.tracking_method,
        };
        if (asset.tracking_method === "BATCH") {
            setQuantityPrompt({ item, qty: 1 });
        } else {
            addItem({ ...item, quantity: 1 });
            toast.success(`Added: ${asset.name}`);
        }
        setSearchQuery("");
        setSearchResults([]);
    }

    async function handleConfirm() {
        if (!bookedFor.trim()) {
            toast.error("Booked For is required");
            return;
        }
        try {
            const result = await createMutation.mutateAsync({
                booked_for: bookedFor.trim(),
                reason: reason.trim() || undefined,
                job_reference: jobRef.trim() || undefined,
                notes: notes.trim() || undefined,
                items: scannedItems.map((i) => ({ asset_id: i.asset_id, quantity: i.quantity })),
            });
            toast.success("Self-booking created");
            router.push(`/self-bookings/${result.data.id}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to create booking");
        }
    }

    const totalItems = scannedItems.reduce((s, i) => s + i.quantity, 0);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card">
                <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
                    <Button variant="ghost" asChild className="font-mono">
                        <Link href="/self-bookings">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Self-Bookings
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2 font-mono text-sm">
                        <span
                            className={
                                phase === "items"
                                    ? "text-primary font-semibold"
                                    : "text-muted-foreground"
                            }
                        >
                            1. Add Items
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        <span
                            className={
                                phase === "meta"
                                    ? "text-primary font-semibold"
                                    : "text-muted-foreground"
                            }
                        >
                            2. Confirm
                        </span>
                    </div>
                    <div className="w-32" />
                </div>
            </div>

            <div className="max-w-[1200px] mx-auto px-6 py-8">
                {/* -------- PHASE 1: ADD ITEMS -------- */}
                {phase === "items" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Camera scanner */}
                        <div className="space-y-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-3">
                                    <CardTitle className="font-mono text-sm">QR Scanner</CardTitle>
                                    <Button
                                        variant={cameraActive ? "outline" : "default"}
                                        size="sm"
                                        className="font-mono"
                                        onClick={cameraActive ? stopScanner : startScanner}
                                        disabled={isResolving}
                                    >
                                        {cameraActive ? (
                                            <>
                                                <CameraOff className="w-4 h-4 mr-1" /> Stop
                                            </>
                                        ) : (
                                            <>
                                                <Camera className="w-4 h-4 mr-1" /> Start Camera
                                            </>
                                        )}
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div
                                        id="qr-scanner-new-booking"
                                        className="w-full aspect-4/3 bg-muted rounded-lg overflow-hidden flex items-center justify-center"
                                    >
                                        {!cameraActive && (
                                            <div className="text-center text-muted-foreground">
                                                <Camera className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                                <p className="text-sm font-mono">Camera off</p>
                                            </div>
                                        )}
                                    </div>
                                    {isResolving && (
                                        <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground font-mono">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Resolving asset…
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Quantity prompt */}
                            {quantityPrompt && (
                                <Card className="border-primary/40">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="font-mono text-sm">
                                            How many? — {quantityPrompt.item.asset_name}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex gap-2">
                                        <Input
                                            type="number"
                                            min={1}
                                            value={quantityPrompt.qty}
                                            onChange={(e) =>
                                                setQuantityPrompt((p) =>
                                                    p
                                                        ? {
                                                              ...p,
                                                              qty: Math.max(
                                                                  1,
                                                                  parseInt(e.target.value) || 1
                                                              ),
                                                          }
                                                        : p
                                                )
                                            }
                                            className="font-mono w-24"
                                        />
                                        <Button
                                            onClick={confirmQuantityPrompt}
                                            className="font-mono"
                                        >
                                            Add
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setQuantityPrompt(null)}
                                            className="font-mono"
                                        >
                                            Cancel
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Search fallback */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="font-mono text-sm">
                                        Search Asset
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            className="pl-9 font-mono"
                                            placeholder="Asset name…"
                                            value={searchQuery}
                                            onChange={(e) => handleSearch(e.target.value)}
                                        />
                                    </div>
                                    {isSearching && (
                                        <p className="text-xs text-muted-foreground font-mono">
                                            Searching…
                                        </p>
                                    )}
                                    {searchResults.length > 0 && (
                                        <div className="border border-border rounded-lg divide-y divide-border max-h-60 overflow-y-auto">
                                            {searchResults.map((asset: any) => (
                                                <button
                                                    key={asset.id}
                                                    onClick={() => addFromSearch(asset)}
                                                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors text-left"
                                                >
                                                    <div>
                                                        <p className="text-sm font-mono font-medium">
                                                            {asset.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground font-mono">
                                                            {asset.category} ·{" "}
                                                            {asset.tracking_method}
                                                        </p>
                                                    </div>
                                                    <Plus className="w-4 h-4 text-muted-foreground" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Scanned items list */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-mono font-semibold text-sm">
                                    Items ({scannedItems.length} assets, {totalItems} units)
                                </h2>
                            </div>

                            {scannedItems.length === 0 ? (
                                <Card>
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Package className="w-10 h-10 mb-3 opacity-20" />
                                        <p className="text-sm font-mono">No items added yet</p>
                                        <p className="text-xs font-mono mt-1">
                                            Scan QR codes or search above
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-2">
                                    {scannedItems.map((item) => (
                                        <Card key={item.asset_id}>
                                            <CardContent className="flex items-center justify-between p-4">
                                                <div className="flex-1">
                                                    <p className="font-mono font-medium text-sm">
                                                        {item.asset_name}
                                                    </p>
                                                    <div className="flex gap-2 mt-1">
                                                        <Badge
                                                            variant="outline"
                                                            className="font-mono text-xs"
                                                        >
                                                            {item.tracking_method}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground font-mono">
                                                            {item.qr_code}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {item.tracking_method === "BATCH" && (
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            value={item.quantity}
                                                            onChange={(e) =>
                                                                setScannedItems((prev) =>
                                                                    prev.map((i) =>
                                                                        i.asset_id === item.asset_id
                                                                            ? {
                                                                                  ...i,
                                                                                  quantity:
                                                                                      Math.max(
                                                                                          1,
                                                                                          parseInt(
                                                                                              e
                                                                                                  .target
                                                                                                  .value
                                                                                          ) || 1
                                                                                      ),
                                                                              }
                                                                            : i
                                                                    )
                                                                )
                                                            }
                                                            className="w-20 font-mono text-sm"
                                                        />
                                                    )}
                                                    {item.tracking_method !== "BATCH" && (
                                                        <span className="font-mono text-sm">
                                                            ×{item.quantity}
                                                        </span>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeItem(item.asset_id)}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            <Button
                                onClick={() => {
                                    stopScanner();
                                    setPhase("meta");
                                }}
                                disabled={scannedItems.length === 0}
                                className="w-full font-mono"
                            >
                                Continue to Confirm
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* -------- PHASE 2: META & CONFIRM -------- */}
                {phase === "meta" && (
                    <div className="max-w-xl mx-auto space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm flex items-center gap-2">
                                    <BookmarkPlus className="w-4 h-4 text-primary" />
                                    Booking Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="font-mono text-xs">Booked For *</Label>
                                    <Input
                                        placeholder="e.g., Ahmed — Events Team"
                                        value={bookedFor}
                                        onChange={(e) => setBookedFor(e.target.value)}
                                        className="font-mono"
                                    />
                                    <p className="text-xs text-muted-foreground font-mono">
                                        Name or team receiving the assets
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="font-mono text-xs">
                                        Job Reference (Optional)
                                    </Label>
                                    <Input
                                        placeholder="e.g., Absolut Launch 2026"
                                        value={jobRef}
                                        onChange={(e) => setJobRef(e.target.value)}
                                        className="font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="font-mono text-xs">Reason (Optional)</Label>
                                    <Input
                                        placeholder="e.g., Brand activation setup"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="font-mono text-xs">Notes (Optional)</Label>
                                    <Textarea
                                        placeholder="Any additional notes…"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="font-mono text-sm"
                                        rows={2}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Items summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm">
                                    Items Summary ({scannedItems.length} assets, {totalItems} units)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {scannedItems.map((item) => (
                                    <div
                                        key={item.asset_id}
                                        className="flex items-center justify-between text-sm font-mono py-1.5 border-b border-border last:border-0"
                                    >
                                        <span>{item.asset_name}</span>
                                        <span className="text-muted-foreground">
                                            ×{item.quantity}
                                        </span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setPhase("items")}
                                className="font-mono"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Back
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                disabled={!bookedFor.trim() || createMutation.isPending}
                                className="flex-1 font-mono"
                            >
                                {createMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…
                                    </>
                                ) : (
                                    <>
                                        <BookmarkPlus className="w-4 h-4 mr-2" /> Confirm Booking
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
