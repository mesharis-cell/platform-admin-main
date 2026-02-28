"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PrintQrAction } from "@/components/qr/PrintQrAction";
import { useOrderScanEvents } from "@/hooks/use-scanning";
import {
    Camera,
    ShieldAlert,
    ShieldCheck,
    ShieldQuestion,
    Truck,
    Wrench,
    Image as ImageIcon,
} from "lucide-react";
import { format } from "date-fns";

interface ScanActivityTimelineProps {
    orderId: string;
}

const SCAN_TYPE_META: Record<string, { label: string; className: string; icon: React.ReactNode }> =
    {
        OUTBOUND: {
            label: "Outbound Scan",
            className: "border-primary/30 text-primary",
            icon: <Truck className="h-3.5 w-3.5" />,
        },
        INBOUND: {
            label: "Inbound Scan",
            className: "border-secondary/30 text-secondary",
            icon: <Truck className="h-3.5 w-3.5" />,
        },
        DERIG_CAPTURE: {
            label: "Derig Capture",
            className: "border-purple-500/30 text-purple-700",
            icon: <Wrench className="h-3.5 w-3.5" />,
        },
        OUTBOUND_TRUCK_PHOTOS: {
            label: "Outbound Truck Photos",
            className: "border-blue-500/30 text-blue-700",
            icon: <Camera className="h-3.5 w-3.5" />,
        },
        RETURN_TRUCK_PHOTOS: {
            label: "Return Truck Photos",
            className: "border-orange-500/30 text-orange-700",
            icon: <Camera className="h-3.5 w-3.5" />,
        },
        ON_SITE_CAPTURE: {
            label: "On Site Capture",
            className: "border-pink-500/30 text-pink-700",
            icon: <ImageIcon className="h-3.5 w-3.5" />,
        },
    };

export function ScanActivityTimeline({ orderId }: ScanActivityTimelineProps) {
    const { data: scanData, isLoading } = useOrderScanEvents(orderId);

    if (isLoading) {
        return (
            <Card className="p-6">
                <div className="text-sm text-muted-foreground font-mono">
                    Loading scan activity...
                </div>
            </Card>
        );
    }

    const events: any[] = Array.isArray((scanData as any)?.data)
        ? (scanData as any).data
        : Array.isArray((scanData as any)?.scanEvents)
          ? (scanData as any).scanEvents
          : [];

    if (events.length === 0) {
        return (
            <Card className="p-6 text-center">
                <div className="text-sm text-muted-foreground font-mono">
                    No scanning activity yet
                </div>
            </Card>
        );
    }

    const getConditionIcon = (condition?: string) => {
        switch (condition) {
            case "GREEN":
                return <ShieldCheck className="w-5 h-5 text-green-600" />;
            case "ORANGE":
                return <ShieldQuestion className="w-5 h-5 text-amber-600" />;
            case "RED":
                return <ShieldAlert className="w-5 h-5 text-red-600" />;
            default:
                return null;
        }
    };

    const getConditionBadge = (condition?: string) => {
        const variants: Record<string, string> = {
            GREEN: "bg-green-600/10 text-green-600 border-green-600/30",
            ORANGE: "bg-amber-600/10 text-amber-600 border-amber-600/30",
            RED: "bg-red-600/10 text-red-600 border-red-600/30",
        };
        return variants[condition || ""] || "";
    };

    const getPhotoEntries = (event: any): Array<{ url: string; description?: string }> => {
        const structuredEntries = event.damage_report_entries || event.damageReportEntries;
        if (Array.isArray(structuredEntries) && structuredEntries.length > 0) {
            return structuredEntries
                .map((entry: any) => {
                    if (!entry?.url) return null;
                    return {
                        url: entry.url,
                        description: entry.description || undefined,
                    };
                })
                .filter(Boolean) as Array<{ url: string; description?: string }>;
        }

        return (event.photos || []).map((url: string) => ({ url }));
    };

    const outboundCount = events.filter(
        (event) => (event.scan_type || event.scanType) === "OUTBOUND"
    ).length;
    const inboundCount = events.filter(
        (event) => (event.scan_type || event.scanType) === "INBOUND"
    ).length;
    const captureCount = events.filter((event) => {
        const type = event.scan_type || event.scanType;
        return [
            "DERIG_CAPTURE",
            "OUTBOUND_TRUCK_PHOTOS",
            "RETURN_TRUCK_PHOTOS",
            "ON_SITE_CAPTURE",
        ].includes(type);
    }).length;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
                <Card className="p-4">
                    <div className="text-2xl font-bold font-mono">{outboundCount}</div>
                    <div className="text-xs text-muted-foreground font-mono">Outbound</div>
                </Card>
                <Card className="p-4">
                    <div className="text-2xl font-bold font-mono">{inboundCount}</div>
                    <div className="text-xs text-muted-foreground font-mono">Inbound</div>
                </Card>
                <Card className="p-4">
                    <div className="text-2xl font-bold font-mono">{captureCount}</div>
                    <div className="text-xs text-muted-foreground font-mono">Captures</div>
                </Card>
            </div>

            <Card className="p-6">
                <h3 className="text-sm font-bold font-mono mb-4 text-muted-foreground">
                    SCAN TIMELINE
                </h3>
                <div className="space-y-4">
                    {events.map((event) => {
                        const scanType = event.scan_type || event.scanType;
                        const typeMeta =
                            SCAN_TYPE_META[scanType] ||
                            ({
                                label: scanType || "EVENT",
                                className: "border-border text-foreground",
                                icon: null,
                            } as const);
                        const discrepancyReason =
                            event.discrepancy_reason || event.discrepancyReason;
                        const scannedAt =
                            event.scanned_at ||
                            event.scannedAt ||
                            event.occurred_at ||
                            event.occurredAt;
                        const scannedByName =
                            event?.scanned_by_user?.name ||
                            event?.scannedByUser?.name ||
                            event?.actor_name ||
                            "System";
                        const assetName =
                            event?.asset?.name ||
                            event?.assetDetails?.assetName ||
                            event?.asset_name ||
                            "Order Event";
                        const qrCode = event?.asset?.qr_code || event?.assetDetails?.qrCode || "";
                        const trackingMethod =
                            event?.asset?.tracking_method ||
                            event?.assetDetails?.trackingMethod ||
                            "";
                        const quantity = event.quantity ?? event.total_quantity;
                        const photos = getPhotoEntries(event);

                        return (
                            <div
                                key={event.id}
                                className="relative pl-8 pb-4 border-l-2 border-border last:border-l-0 last:pb-0"
                            >
                                <div className="absolute left-0 top-1 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-4 border-background" />

                                <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <Badge
                                                    variant="outline"
                                                    className={typeMeta.className}
                                                >
                                                    {typeMeta.icon}
                                                    <span className="ml-1">{typeMeta.label}</span>
                                                </Badge>
                                                {event.condition ? (
                                                    <Badge
                                                        variant="outline"
                                                        className={getConditionBadge(
                                                            event.condition
                                                        )}
                                                    >
                                                        {getConditionIcon(event.condition)}
                                                        {event.condition}
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="font-mono text-sm font-bold">
                                                    {assetName}
                                                </div>
                                                {qrCode ? (
                                                    <PrintQrAction
                                                        qrCode={qrCode}
                                                        assetName={assetName}
                                                    />
                                                ) : null}
                                            </div>
                                            <div className="text-xs text-muted-foreground font-mono">
                                                {qrCode ? `QR: ${qrCode} • ` : ""}
                                                {quantity ? `Qty: ${quantity} • ` : ""}
                                                {trackingMethod || ""}
                                            </div>
                                        </div>
                                        <div className="text-right text-xs">
                                            {scannedAt ? (
                                                <div className="text-muted-foreground font-mono">
                                                    {format(new Date(scannedAt), "MMM d, HH:mm")}
                                                </div>
                                            ) : null}
                                            <div className="text-muted-foreground">
                                                by {scannedByName}
                                            </div>
                                        </div>
                                    </div>

                                    {event.notes ? (
                                        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                                            {event.notes}
                                        </div>
                                    ) : null}

                                    {discrepancyReason ? (
                                        <div className="flex items-center gap-2 text-sm text-amber-600">
                                            <ShieldAlert className="w-4 h-4" />
                                            <span className="font-mono font-bold">
                                                Discrepancy: {discrepancyReason}
                                            </span>
                                        </div>
                                    ) : null}

                                    {photos.length > 0 ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                                                <Camera className="w-4 h-4" />
                                                {photos.length} photo(s)
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {photos.map((photo, index) => (
                                                    <div
                                                        key={`${photo.url}-${index}`}
                                                        className="space-y-1"
                                                    >
                                                        <a
                                                            href={photo.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="aspect-square bg-muted rounded-lg overflow-hidden border border-border block"
                                                        >
                                                            <img
                                                                src={photo.url}
                                                                alt={`Scan photo ${index + 1}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </a>
                                                        {photo.description ? (
                                                            <p className="text-[10px] text-muted-foreground">
                                                                {photo.description}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}
