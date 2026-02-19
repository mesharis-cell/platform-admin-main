"use client";

/**
 * Phase 10: Enhanced Admin Order Detail Page
 * Status progression controls, time windows management, and comprehensive order view
 *
 * Design: Industrial-Technical Command Center
 * - Monospace Geist Mono typography for precision
 * - Grid-based data layout with clear hierarchy
 * - Interactive status machine with allowed transitions
 * - Timeline visualization with connection lines
 */

import { type ChangeEvent, use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    useAdminOrderDetails,
    useAdminOrderStatusHistory,
    useDownloadGoodsForm,
    useUpdateJobNumber,
} from "@/hooks/use-orders";
import { useUploadImage } from "@/hooks/use-assets";
import { ScanActivityTimeline } from "@/components/scanning/scan-activity-timeline";
import {
    PricingReviewSection,
    PendingApprovalSection,
    AwaitingFabricationSection,
    CancelOrderButton,
} from "./hybrid-sections";
import { OrderApprovalRequestSubmitBtn } from "@/components/orders/OrderApprovalRequestSubmitBtn";
import { OrderItemCard } from "@/components/orders/OrderItemCard";
import { StatusHistoryTimeline } from "@/components/orders/StatusHistoryTimeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    ArrowLeft,
    Package,
    Calendar,
    MapPin,
    User,
    Phone,
    Mail,
    FileText,
    Clock,
    Edit,
    Save,
    X,
    Boxes,
    Truck,
    PlayCircle,
    AlertCircle,
    ScanLine,
    CheckCircle,
    Loader2,
    ImagePlus,
    Trash2,
    Wrench,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { apiClient } from "@/lib/api/api-client";
import { getOrderPrice, removeUnderScore } from "@/lib/utils/helper";
import { addDays, endOfDay, isAfter, isBefore, startOfDay, subDays } from "date-fns";
import { LogisticsPricingReview } from "@/components/orders/LogisticsPricingReview";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";

const FINANCIAL_STATUS = {
    PENDING_QUOTE: {
        label: "PENDING_QUOTE",
        color: "bg-slate-500/10 text-slate-600 border-slate-500/20",
        nextStates: ["QUOTE_SENT"],
    },
    QUOTE_SENT: {
        label: "QUOTE_SENT",
        color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        nextStates: ["QUOTE_ACCEPTED"],
    },
    QUOTE_ACCEPTED: {
        label: "QUOTE_ACCEPTED",
        color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
        nextStates: ["PENDING_INVOICE"],
    },
    QUOTE_REVISED: {
        label: "QUOTE_REVISED",
        color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
        nextStates: ["PENDING_INVOICE"],
    },
    PENDING_INVOICE: {
        label: "PENDING_INVOICE",
        color: "bg-orange-500/10 text-orange-700 border-orange-500/20",
        nextStates: ["INVOICED"],
    },
    INVOICED: {
        label: "INVOICED",
        color: "bg-purple-500/10 text-purple-700 border-purple-500/20",
        nextStates: ["PAID"],
    },
    PAID: {
        label: "PAID",
        color: "bg-teal-500/10 text-teal-700 border-teal-500/20",
        nextStates: [],
    },
    CANCELLED: {
        label: "CANCELLED",
        color: "bg-red-500/10 text-red-700 border-red-500/20",
        nextStates: [],
    },
};

// Status configuration with next states for state machine (Feedback #1: Updated for new flow)
const STATUS_CONFIG: Record<
    string,
    {
        label: string;
        color: string;
        nextStates: string[];
    }
> = {
    DRAFT: {
        label: "DRAFT",
        color: "bg-slate-500/10 text-slate-600 border-slate-500/20",
        nextStates: ["SUBMITTED"],
    },
    SUBMITTED: {
        label: "SUBMITTED",
        color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        nextStates: ["PRICING_REVIEW"],
    },
    PRICING_REVIEW: {
        label: "PRICING",
        color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
        nextStates: ["QUOTED", "PENDING_APPROVAL"],
    },
    PENDING_APPROVAL: {
        label: "PLATFORM REVIEW",
        color: "bg-orange-500/10 text-orange-700 border-orange-500/20",
        nextStates: ["QUOTED"],
    },
    QUOTED: {
        label: "QUOTED",
        color: "bg-purple-500/10 text-purple-700 border-purple-500/20",
        nextStates: ["CONFIRMED", "DECLINED"],
    },
    DECLINED: {
        label: "DECLINED",
        color: "bg-red-500/10 text-red-700 border-red-500/20",
        nextStates: [],
    },
    CONFIRMED: {
        label: "CONFIRMED",
        color: "bg-teal-500/10 text-teal-700 border-teal-500/20",
        nextStates: ["IN_PREPARATION"],
    },
    AWAITING_FABRICATION: {
        label: "AWAITING FABRICATION",
        color: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
        nextStates: ["IN_PREPARATION"],
    },
    IN_PREPARATION: {
        label: "IN PREP",
        color: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
        nextStates: ["READY_FOR_DELIVERY"],
    },
    READY_FOR_DELIVERY: {
        label: "READY",
        color: "bg-sky-500/10 text-sky-700 border-sky-500/20",
        nextStates: ["IN_TRANSIT"],
    },
    IN_TRANSIT: {
        label: "IN TRANSIT",
        color: "bg-violet-500/10 text-violet-700 border-violet-500/20",
        nextStates: ["DELIVERED"],
    },
    DELIVERED: {
        label: "DELIVERED",
        color: "bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/20",
        nextStates: ["IN_USE"],
    },
    IN_USE: {
        label: "IN USE",
        color: "bg-pink-500/10 text-pink-700 border-pink-500/20",
        nextStates: ["AWAITING_RETURN"],
    },
    AWAITING_RETURN: {
        label: "AWAITING RET.",
        color: "bg-rose-500/10 text-rose-700 border-rose-500/20",
        nextStates: ["RETURN_IN_TRANSIT", "CLOSED"],
    },
    RETURN_IN_TRANSIT: {
        label: "RETURN TRANSIT",
        color: "bg-orange-500/10 text-orange-700 border-orange-500/20",
        nextStates: ["CLOSED"],
    },
    CLOSED: {
        label: "CLOSED",
        color: "bg-slate-600/10 text-slate-700 border-slate-600/20",
        nextStates: [],
    },
    CANCELLED: {
        label: "CANCELLED",
        color: "bg-red-500/10 text-red-700 border-red-500/20",
        nextStates: [],
    },
};

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user } = useToken();
    const [progressLoading, setProgressLoading] = useState(false);
    const { data: order, isLoading, refetch } = useAdminOrderDetails(id);

    const { data: statusHistory, isLoading: statusHistoryLoading } = useAdminOrderStatusHistory(
        order?.data?.id ? order?.data?.id : ""
    );

    const updateJobNumber = useUpdateJobNumber();
    const downloadGoodsForm = useDownloadGoodsForm();
    const uploadImage = useUploadImage();

    const [isEditingJobNumber, setIsEditingJobNumber] = useState(false);
    const [jobNumber, setJobNumber] = useState("");
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [selectedNextStatus, setSelectedNextStatus] = useState("");
    const [statusNotes, setStatusNotes] = useState("");
    const [deliveryPhotoFiles, setDeliveryPhotoFiles] = useState<File[]>([]);
    const [deliveryPhotoPreviews, setDeliveryPhotoPreviews] = useState<string[]>([]);
    const [timeWindowsOpen, setTimeWindowsOpen] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [updateTimeWindowsLoading, setUpdateTimeWindowsLoading] = useState(false);

    const [paymentDetails, setPaymentDetails] = useState({
        paymentMethod: "",
        paymentReference: "",
        paymentDate: new Date(),
        notes: "",
    });
    const [timeWindows, setTimeWindows] = useState<{
        deliveryWindowStart: Date | undefined;
        deliveryWindowEnd: Date | undefined;
        pickupWindowStart: Date | undefined;
        pickupWindowEnd: Date | undefined;
    }>({
        deliveryWindowStart: undefined,
        deliveryWindowEnd: undefined,
        pickupWindowStart: undefined,
        pickupWindowEnd: undefined,
    });

    const canDownloadGoodsForm = hasPermission(
        user,
        ADMIN_ACTION_PERMISSIONS.ordersDownloadGoodsForm
    );
    const canProgressOrderStatus = hasPermission(user, ADMIN_ACTION_PERMISSIONS.ordersUpdate);
    const canEditJobNumber = hasPermission(user, ADMIN_ACTION_PERMISSIONS.ordersAddJobNumber);
    const canEditTimeWindows = hasPermission(user, ADMIN_ACTION_PERMISSIONS.ordersAddTimeWindows);
    const canSubmitForApproval = hasPermission(
        user,
        ADMIN_ACTION_PERMISSIONS.ordersSubmitForApproval
    );
    const canConfirmInvoicePayment = hasPermission(
        user,
        ADMIN_ACTION_PERMISSIONS.invoicesConfirmPayment
    );

    // Initialize states when order loads
    if (order) {
        if (!jobNumber && order?.data?.job_number) setJobNumber(order?.data?.job_number);
        if (!timeWindows.deliveryWindowStart && order?.data?.delivery_window?.start) {
            setTimeWindows({
                deliveryWindowStart: new Date(order?.data?.delivery_window?.start),
                deliveryWindowEnd: new Date(order?.data?.delivery_window?.end),
                pickupWindowStart: new Date(order?.data?.pickup_window?.start),
                pickupWindowEnd: new Date(order?.data?.pickup_window?.end),
            });
        }
    }

    const handleJobNumberSave = async () => {
        if (!order?.data) return;
        try {
            await updateJobNumber.mutateAsync({
                orderId: order.data.id,
                job_number: jobNumber || null,
            });
            setIsEditingJobNumber(false);
            toast.success("Job number updated");
        } catch (error: any) {
            toast.error(error.message || "Failed to update job number");
        }
    };

    const handleDownloadGoodsForm = async (
        formType: "AUTO" | "GOODS_IN" | "GOODS_OUT" = "AUTO"
    ) => {
        if (!order?.data) return;
        try {
            const blob = await downloadGoodsForm.mutateAsync({
                orderId: order.data.id,
                formType,
            });
            const suffix =
                formType === "AUTO"
                    ? ["AWAITING_RETURN", "RETURN_IN_TRANSIT", "CLOSED"].includes(
                          order.data.order_status
                      )
                        ? "goods-in"
                        : "goods-out"
                    : formType.toLowerCase().replace("_", "-");
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${order.data.order_id}-${suffix}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success("Goods form downloaded");
        } catch (error: any) {
            toast.error(error.message || "Failed to download goods form");
        }
    };

    const resetDeliveryPhotoState = () => {
        setDeliveryPhotoFiles([]);
        setDeliveryPhotoPreviews((prev) => {
            prev.forEach((url) => URL.revokeObjectURL(url));
            return [];
        });
    };

    const resetStatusDialogState = () => {
        setSelectedNextStatus("");
        setStatusNotes("");
        resetDeliveryPhotoState();
    };

    const handleStatusDialogToggle = (open: boolean) => {
        setStatusDialogOpen(open);
        if (!open) resetStatusDialogState();
    };

    const handleDeliveryPhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []).filter((file) =>
            file.type.startsWith("image/")
        );
        if (files.length === 0) return;
        const previewUrls = files.map((file) => URL.createObjectURL(file));
        setDeliveryPhotoFiles((prev) => [...prev, ...files]);
        setDeliveryPhotoPreviews((prev) => [...prev, ...previewUrls]);
        e.target.value = "";
    };

    const handleDeliveryPhotoRemove = (index: number) => {
        setDeliveryPhotoFiles((prev) => prev.filter((_, idx) => idx !== index));
        setDeliveryPhotoPreviews((prev) => {
            const target = prev[index];
            if (target) URL.revokeObjectURL(target);
            return prev.filter((_, idx) => idx !== index);
        });
    };

    const handleStatusProgression = async () => {
        if (!order?.data || !selectedNextStatus) return;
        try {
            setProgressLoading(true);
            let deliveryPhotos: string[] | undefined;
            if (selectedNextStatus === "DELIVERED" && deliveryPhotoFiles.length > 0) {
                const formData = new FormData();
                deliveryPhotoFiles.forEach((file) => formData.append("files", file));
                const uploadResult = await uploadImage.mutateAsync(formData);
                deliveryPhotos = uploadResult.data?.imageUrls?.filter(Boolean) || [];
            }
            await apiClient.patch(`/client/v1/order/${order.data.id}/status`, {
                new_status: selectedNextStatus,
                notes: statusNotes || undefined,
                delivery_photos: selectedNextStatus === "DELIVERED" ? deliveryPhotos : undefined,
            });

            toast.success(`Status updated to ${STATUS_CONFIG[selectedNextStatus]?.label}`);
            setStatusDialogOpen(false);
            resetStatusDialogState();
            window.location.reload();
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message || error?.message || "Failed to update status"
            );
        } finally {
            setProgressLoading(false);
        }
    };

    const handleTimeWindowsSave = async () => {
        if (!order?.data) return;

        // Validate all windows are set
        if (
            !timeWindows.deliveryWindowStart ||
            !timeWindows.deliveryWindowEnd ||
            !timeWindows.pickupWindowStart ||
            !timeWindows.pickupWindowEnd
        ) {
            toast.error("Please set all delivery and pickup windows");
            return;
        }

        try {
            setUpdateTimeWindowsLoading(true);
            await apiClient.patch(`/client/v1/order/${order.data.id}/time-windows`, {
                delivery_window_start: timeWindows.deliveryWindowStart.toISOString(),
                delivery_window_end: timeWindows.deliveryWindowEnd.toISOString(),
                pickup_window_start: timeWindows.pickupWindowStart.toISOString(),
                pickup_window_end: timeWindows.pickupWindowEnd.toISOString(),
            });

            toast.success("Delivery schedule updated");
            setTimeWindowsOpen(false);
            window.location.reload();
        } catch (error: any) {
            toast.error(error.response.data.message);
        } finally {
            setUpdateTimeWindowsLoading(false);
        }
    };

    const handleConfirmPayment = async () => {
        if (!order?.data) return;

        // Validate required fields
        if (
            !paymentDetails.paymentMethod ||
            !paymentDetails.paymentReference ||
            !paymentDetails.paymentDate
        ) {
            toast.error("Payment method, reference, and date are required");
            return;
        }

        try {
            const response = await fetch(`/api/invoices/${order.data.id}/confirm-payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    paymentMethod: paymentDetails.paymentMethod,
                    paymentReference: paymentDetails.paymentReference,
                    paymentDate: paymentDetails.paymentDate.toISOString(),
                    notes: paymentDetails.notes || undefined,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to confirm payment");
            }

            toast.success("Payment confirmed successfully");
            setPaymentDialogOpen(false);
            setPaymentDetails({
                paymentMethod: "",
                paymentReference: "",
                paymentDate: new Date(),
                notes: "",
            });
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8">
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="font-mono text-sm">Order not found</p>
                <Link href="/orders">
                    <Button variant="outline" className="mt-4">
                        Back
                    </Button>
                </Link>
            </div>
        );
    }

    const { total } = getOrderPrice(order?.data?.pricing);
    const currentStatusConfig = STATUS_CONFIG[order.data.order_status] || STATUS_CONFIG.DRAFT;
    const allowedNextStates = currentStatusConfig.nextStates || [];

    const eventStartDate = order?.data?.event_start_date
        ? new Date(order.data.event_start_date)
        : undefined;
    const eventEndDate = order?.data?.event_end_date
        ? new Date(order.data.event_end_date)
        : undefined;

    const deliveryDisabledDays = eventStartDate
        ? (date: Date) =>
              isBefore(date, startOfDay(subDays(eventStartDate, 5))) ||
              isAfter(date, endOfDay(subDays(eventStartDate, 1)))
        : undefined;

    const pickupDisabledDays = eventEndDate
        ? (date: Date) =>
              isBefore(date, startOfDay(addDays(eventEndDate, 1))) ||
              isAfter(date, endOfDay(addDays(eventEndDate, 3)))
        : undefined;

    return (
        <div className="min-h-screen bg-background">
            {/* Sticky Header */}
            <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/orders">
                                <Button variant="ghost" size="sm" className="gap-2 font-mono">
                                    <ArrowLeft className="h-4 w-4" />
                                    ORDERS
                                </Button>
                            </Link>
                            <Separator orientation="vertical" className="h-6" />
                            <div>
                                <h1 className="text-lg font-bold font-mono">
                                    {order?.data?.order_id}
                                </h1>
                                <p className="text-xs text-muted-foreground font-mono">
                                    {order?.data?.company?.name}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Badge
                                className={`${FINANCIAL_STATUS[order?.data?.financial_status]?.color} border font-mono text-xs px-3 py-1`}
                            >
                                {removeUnderScore(
                                    FINANCIAL_STATUS[order?.data?.financial_status]?.label
                                )}
                            </Badge>
                            <Badge
                                className={`${currentStatusConfig.color} border font-mono text-xs px-3 py-1`}
                            >
                                {removeUnderScore(currentStatusConfig.label)}
                            </Badge>

                            {/* NEW: Cancel Order Button */}
                            <CancelOrderButton order={order.data} orderId={order.data.id} />

                            {canDownloadGoodsForm ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-2 font-mono text-xs"
                                    onClick={() => handleDownloadGoodsForm("AUTO")}
                                    disabled={downloadGoodsForm.isPending}
                                >
                                    <FileText className="h-3.5 w-3.5" />
                                    {downloadGoodsForm.isPending
                                        ? "DOWNLOADING..."
                                        : "DOWNLOAD GOODS FORM"}
                                </Button>
                            ) : null}

                            {allowedNextStates.length > 0 && canProgressOrderStatus && (
                                <Dialog
                                    open={statusDialogOpen}
                                    onOpenChange={handleStatusDialogToggle}
                                >
                                    <DialogTrigger asChild>
                                        <Button
                                            size="sm"
                                            className="gap-2 font-mono text-xs disabled:pointer-events-auto disabled:cursor-not-allowed"
                                            disabled={
                                                progressLoading ||
                                                order.data.order_status === "PENDING_APPROVAL" ||
                                                // order.data.order_status === "AWAITING_FABRICATION" ||
                                                order.data.order_status === "PRICING_REVIEW" ||
                                                order.data.order_status === "IN_PREPARATION" ||
                                                order.data.order_status === "AWAITING_RETURN" ||
                                                order.data.order_status === "QUOTED" ||
                                                (order.data.order_status === "CONFIRMED" &&
                                                    (!order?.data?.delivery_window?.start ||
                                                        !order?.data?.delivery_window?.end))
                                            }
                                        >
                                            <PlayCircle className="h-3.5 w-3.5" />
                                            PROGRESS
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle className="font-mono">
                                                PROGRESS ORDER STATUS
                                            </DialogTitle>
                                            <DialogDescription className="font-mono text-xs">
                                                Current: {currentStatusConfig.label} → Select next
                                                status
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label className="font-mono text-xs">
                                                    NEXT STATUS
                                                </Label>
                                                <select
                                                    className="w-full border rounded px-3 py-2 bg-background font-mono text-sm"
                                                    value={selectedNextStatus}
                                                    onChange={(e) => {
                                                        const nextStatus = e.target.value;
                                                        setSelectedNextStatus(nextStatus);
                                                        if (nextStatus !== "DELIVERED")
                                                            resetDeliveryPhotoState();
                                                    }}
                                                >
                                                    <option value="">Select...</option>
                                                    {allowedNextStates.map((status) => (
                                                        <option key={status} value={status}>
                                                            {STATUS_CONFIG[status]?.label || status}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="font-mono text-xs">
                                                    NOTES (Optional)
                                                </Label>
                                                <Textarea
                                                    placeholder="Transition notes..."
                                                    value={statusNotes}
                                                    onChange={(e) => setStatusNotes(e.target.value)}
                                                    className="font-mono text-sm"
                                                    rows={3}
                                                />
                                            </div>
                                            {selectedNextStatus === "DELIVERED" && (
                                                <div className="space-y-2">
                                                    <Label className="font-mono text-xs">
                                                        DELIVERY PROOF PHOTOS (Optional)
                                                    </Label>
                                                    <div className="rounded-md border border-dashed p-3 space-y-3">
                                                        <input
                                                            id="delivery-proof-photos"
                                                            type="file"
                                                            accept="image/*"
                                                            multiple
                                                            className="hidden"
                                                            onChange={handleDeliveryPhotoSelect}
                                                        />
                                                        <label
                                                            htmlFor="delivery-proof-photos"
                                                            className="inline-flex items-center gap-2 text-xs font-mono px-3 py-2 border rounded cursor-pointer hover:bg-muted"
                                                        >
                                                            <ImagePlus className="h-3.5 w-3.5" />
                                                            ADD DELIVERY PHOTOS
                                                        </label>
                                                        {deliveryPhotoPreviews.length > 0 && (
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {deliveryPhotoPreviews.map(
                                                                    (preview, idx) => (
                                                                        <div
                                                                            key={preview}
                                                                            className="relative aspect-square rounded border overflow-hidden"
                                                                        >
                                                                            <Image
                                                                                src={preview}
                                                                                alt={`Delivery proof ${idx + 1}`}
                                                                                fill
                                                                                className="object-cover"
                                                                            />
                                                                            <Button
                                                                                type="button"
                                                                                size="icon"
                                                                                variant="destructive"
                                                                                className="absolute top-1 right-1 h-6 w-6"
                                                                                onClick={() =>
                                                                                    handleDeliveryPhotoRemove(
                                                                                        idx
                                                                                    )
                                                                                }
                                                                            >
                                                                                <Trash2 className="h-3 w-3" />
                                                                            </Button>
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <DialogFooter>
                                            <Button
                                                variant="outline"
                                                onClick={() => handleStatusDialogToggle(false)}
                                                disabled={progressLoading || uploadImage.isPending}
                                                className="font-mono text-xs"
                                            >
                                                CANCEL
                                            </Button>
                                            <Button
                                                onClick={handleStatusProgression}
                                                disabled={
                                                    !selectedNextStatus ||
                                                    progressLoading ||
                                                    uploadImage.isPending ||
                                                    order.data.order_status === "IN_PREPARATION" ||
                                                    order.data.order_status === "AWAITING_RETURN" ||
                                                    order.data.order_status === "QUOTED" ||
                                                    (order.data.order_status === "CONFIRMED" &&
                                                        (!order?.data?.delivery_window?.start ||
                                                            !order?.data?.delivery_window?.end))
                                                }
                                                className="font-mono text-xs"
                                            >
                                                {progressLoading
                                                    ? "Processing..."
                                                    : "UPDATE STATUS"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {(order?.data?.order_status === "CONFIRMED" ||
                            order?.data?.order_status === "AWAITING_FABRICATION") &&
                            !order?.data?.delivery_window?.start && (
                                <Card className="p-4 bg-orange-500/5 border-orange-500/30">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-mono text-sm font-bold text-orange-700">
                                                Action Required
                                            </p>
                                            <p className="font-mono text-xs text-muted-foreground mt-1">
                                                Set delivery schedule before fabricating items and
                                                starting preparation
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            )}

                        {/* NEW: AWAITING_FABRICATION - Fabrication Tracking */}
                        {order.data.order_status === "AWAITING_FABRICATION" && (
                            <AwaitingFabricationSection
                                order={order.data}
                                orderId={order.data.id}
                            />
                        )}

                        {order.data.order_status === "IN_PREPARATION" && (
                            <Card className="bg-red-500/5 border-red-500/30">
                                <CardHeader>
                                    <CardTitle className="text-red-500">
                                        Order In Preparation
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p>
                                        The order is currently being prepared. Please scan out the
                                        items once it&apos;s ready for delivery.
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Feedback #3: Refurb Items Banner - Show for PRICING_REVIEW and PENDING_APPROVAL */}
                        {(order.data.order_status === "PRICING_REVIEW" ||
                            order.data.order_status === "PENDING_APPROVAL") &&
                            (() => {
                                const refurbItems = order.data.items?.filter(
                                    (item: any) =>
                                        item.asset?.refurbishment_days_estimate &&
                                        item.asset.refurbishment_days_estimate > 0
                                );
                                if (refurbItems && refurbItems.length > 0) {
                                    return (
                                        <Card className="p-4 bg-orange-500/5 border-orange-500/30">
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="font-mono text-sm font-bold text-orange-700">
                                                        Items Requiring Refurbishment
                                                    </p>
                                                    <p className="font-mono text-xs text-muted-foreground mt-1 mb-3">
                                                        This order contains items that need
                                                        refurbishment. Consider additional prep time
                                                        in pricing.
                                                    </p>
                                                    <ul className="space-y-2">
                                                        {refurbItems.map((item: any) => (
                                                            <li
                                                                key={item.id}
                                                                className="font-mono text-xs p-2 bg-background/50 rounded border border-orange-500/20"
                                                            >
                                                                <span className="font-medium">
                                                                    {item?.asset?.name}
                                                                </span>
                                                                <span className="text-muted-foreground">
                                                                    {" "}
                                                                    —{" "}
                                                                    {
                                                                        item?.asset
                                                                            ?.refurbishment_days_estimate
                                                                    }{" "}
                                                                    days refurb needed
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                }
                                return null;
                            })()}

                        {/* State-Specific Alerts */}
                        {order.data.order_status === "QUOTED" &&
                            order.data?.final_pricing?.quote_sent_at && (
                                <Card className="p-4 bg-amber-500/5 border-amber-500/30">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-mono text-sm font-bold text-amber-700">
                                                Awaiting Client Response
                                            </p>
                                            <p className="font-mono text-xs text-muted-foreground mt-1">
                                                Quote sent{" "}
                                                {Math.floor(
                                                    (Date.now() -
                                                        new Date(
                                                            order?.data?.final_pricing?.quote_sent_at
                                                        ).getTime()) /
                                                        (1000 * 60 * 60 * 24)
                                                )}{" "}
                                                days ago
                                                {Math.floor(
                                                    (Date.now() -
                                                        new Date(
                                                            order?.data?.final_pricing?.quote_sent_at
                                                        ).getTime()) /
                                                        (1000 * 60 * 60 * 24)
                                                ) >= 2 && " - Consider following up with client"}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            )}

                        {order?.data?.order_status === "AWAITING_RETURN" &&
                            order?.data?.pickup_window?.start &&
                            (() => {
                                const hoursUntilPickup =
                                    (new Date(order?.data?.pickup_window?.start).getTime() -
                                        Date.now()) /
                                    (1000 * 60 * 60);
                                if (hoursUntilPickup <= 48 && hoursUntilPickup > 0) {
                                    return (
                                        <Card className="p-4 bg-rose-500/5 border-rose-500/30">
                                            <div className="flex items-start gap-3">
                                                <Clock className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-mono text-sm font-bold text-rose-700">
                                                        Pickup Reminder Sent
                                                    </p>
                                                    <p className="font-mono text-xs text-muted-foreground mt-1">
                                                        Pickup scheduled in{" "}
                                                        {Math.floor(hoursUntilPickup)} hours - All
                                                        parties notified
                                                    </p>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                }
                                return null;
                            })()}

                        {/* Job Number Card */}
                        {order?.data?.job_number !== undefined && (
                            <Card className="border-2 border-primary/20 bg-primary/5">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <Label className="font-mono text-xs text-muted-foreground">
                                                PLATFORM JOB NUMBER
                                            </Label>
                                            {isEditingJobNumber && canEditJobNumber ? (
                                                <Input
                                                    value={jobNumber}
                                                    onChange={(e) => setJobNumber(e.target.value)}
                                                    placeholder="JOB-XXXX"
                                                    className="mt-2 font-mono"
                                                />
                                            ) : (
                                                <p className="mt-2 font-mono text-lg font-bold">
                                                    {jobNumber || "—"}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-center gap-2">
                                            {isEditingJobNumber && canEditJobNumber ? (
                                                <>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => setIsEditingJobNumber(false)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        disabled={updateJobNumber.isPending}
                                                        onClick={handleJobNumberSave}
                                                    >
                                                        {updateJobNumber.isPending ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Save className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </>
                                            ) : canEditJobNumber ? (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => setIsEditingJobNumber(true)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        {/* Payment Status Card - PMG Admin Only (Feedback #1: Financial status separate) */}
                        {order.invoice?.invoice_id && (
                            <Card className="border-2 border-indigo-500/20 bg-indigo-500/5">
                                <CardHeader>
                                    <CardTitle className="font-mono text-sm flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-indigo-600" />
                                        INVOICE & PAYMENT
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <Label className="font-mono text-xs text-muted-foreground">
                                            INVOICE NUMBER
                                        </Label>
                                        <p className="font-mono text-sm font-bold">
                                            {order?.data?.invoice?.invoice_id || (
                                                <span className="text-muted-foreground">
                                                    Pending...
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    {/* Amount with Breakdown - PMG Admin sees breakdown */}
                                    <div className="flex justify-between items-center">
                                        <Label className="font-mono text-xs text-muted-foreground">
                                            AMOUNT
                                        </Label>
                                        <p className="font-mono text-lg font-bold text-primary">
                                            {total} AED
                                        </p>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-center">
                                        <Label className="font-mono text-xs text-muted-foreground">
                                            PAYMENT STATUS
                                        </Label>
                                        <Badge
                                            className={`font-mono text-xs ${
                                                order?.data?.financial_status === "PAID"
                                                    ? "bg-green-500/10 text-green-700 border-green-500/30"
                                                    : order?.data?.financial_status === "INVOICED"
                                                      ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                                                      : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                                            }`}
                                        >
                                            {order?.data?.financial_status === "PAID"
                                                ? "PAID"
                                                : order?.data?.financial_status === "INVOICED"
                                                  ? "PENDING"
                                                  : order?.data?.financial_status || "N/A"}
                                        </Badge>
                                    </div>
                                    {order?.data?.invoice?.invoice_paid_at && (
                                        <>
                                            <div className="flex justify-between items-center">
                                                <Label className="font-mono text-xs text-muted-foreground">
                                                    PAID ON
                                                </Label>
                                                <p className="font-mono text-xs">
                                                    {new Date(
                                                        order?.data?.invoice?.invoice_paid_at
                                                    ).toLocaleDateString()}
                                                </p>
                                            </div>
                                            {order?.data?.payment_method && (
                                                <div className="flex justify-between items-center">
                                                    <Label className="font-mono text-xs text-muted-foreground">
                                                        METHOD
                                                    </Label>
                                                    <p className="font-mono text-xs">
                                                        {order?.data?.payment_method}
                                                    </p>
                                                </div>
                                            )}
                                            {order?.data?.payment_reference && (
                                                <div className="flex justify-between items-center">
                                                    <Label className="font-mono text-xs text-muted-foreground">
                                                        REFERENCE
                                                    </Label>
                                                    <p className="font-mono text-xs">
                                                        {order?.data?.payment_reference}
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {/* Payment Confirmation Section - PMG Admin Only */}
                                    {canConfirmInvoicePayment &&
                                        order?.data?.financial_status === "INVOICED" &&
                                        !order?.data?.invoice?.invoice_paid_at && (
                                            <>
                                                <Separator />
                                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-md space-y-3">
                                                    <div className="flex items-start gap-2">
                                                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                                        <div className="flex-1">
                                                            <p className="text-xs font-mono font-bold text-amber-700">
                                                                AWAITING PAYMENT CONFIRMATION
                                                            </p>
                                                            <p className="text-xs font-mono text-muted-foreground mt-1">
                                                                Invoice sent to client. Confirm
                                                                payment when received.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Dialog
                                                        open={paymentDialogOpen}
                                                        onOpenChange={setPaymentDialogOpen}
                                                    >
                                                        <DialogTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                className="w-full gap-2 font-mono text-xs bg-green-600 hover:bg-green-700"
                                                            >
                                                                <CheckCircle className="h-3.5 w-3.5" />
                                                                CONFIRM PAYMENT RECEIVED
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="sm:max-w-md">
                                                            <DialogHeader>
                                                                <DialogTitle className="font-mono">
                                                                    CONFIRM PAYMENT
                                                                </DialogTitle>
                                                                <DialogDescription className="font-mono text-xs">
                                                                    Record external payment details
                                                                    for invoice{" "}
                                                                    {
                                                                        order?.data?.invoice
                                                                            ?.invoice_id
                                                                    }
                                                                </DialogDescription>
                                                            </DialogHeader>

                                                            <div className="space-y-4 py-4">
                                                                <div className="space-y-2">
                                                                    <Label className="font-mono text-xs">
                                                                        PAYMENT METHOD *
                                                                    </Label>
                                                                    <select
                                                                        className="w-full border rounded px-3 py-2 bg-background font-mono text-sm"
                                                                        value={
                                                                            paymentDetails.paymentMethod
                                                                        }
                                                                        onChange={(e) =>
                                                                            setPaymentDetails(
                                                                                (prev) => ({
                                                                                    ...prev,
                                                                                    paymentMethod:
                                                                                        e.target
                                                                                            .value,
                                                                                })
                                                                            )
                                                                        }
                                                                    >
                                                                        <option value="">
                                                                            Select method...
                                                                        </option>
                                                                        <option value="Bank Transfer">
                                                                            Bank Transfer
                                                                        </option>
                                                                        <option value="Wire Transfer">
                                                                            Wire Transfer
                                                                        </option>
                                                                        <option value="Check">
                                                                            Check
                                                                        </option>
                                                                        <option value="Cash">
                                                                            Cash
                                                                        </option>
                                                                        <option value="Other">
                                                                            Other
                                                                        </option>
                                                                    </select>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <Label className="font-mono text-xs">
                                                                        PAYMENT REFERENCE *
                                                                    </Label>
                                                                    <Input
                                                                        placeholder="Transaction ID, Check #, etc."
                                                                        value={
                                                                            paymentDetails.paymentReference
                                                                        }
                                                                        onChange={(e) =>
                                                                            setPaymentDetails(
                                                                                (prev) => ({
                                                                                    ...prev,
                                                                                    paymentReference:
                                                                                        e.target
                                                                                            .value,
                                                                                })
                                                                            )
                                                                        }
                                                                        className="font-mono text-sm"
                                                                    />
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <Label className="font-mono text-xs">
                                                                        PAYMENT DATE *
                                                                    </Label>
                                                                    <DateTimePicker
                                                                        value={
                                                                            paymentDetails.paymentDate
                                                                        }
                                                                        onChange={(date) =>
                                                                            setPaymentDetails(
                                                                                (prev) => ({
                                                                                    ...prev,
                                                                                    paymentDate:
                                                                                        date ||
                                                                                        new Date(),
                                                                                })
                                                                            )
                                                                        }
                                                                        placeholder="Select payment date"
                                                                    />
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <Label className="font-mono text-xs">
                                                                        NOTES (Optional)
                                                                    </Label>
                                                                    <Textarea
                                                                        placeholder="Additional payment notes..."
                                                                        value={paymentDetails.notes}
                                                                        onChange={(e) =>
                                                                            setPaymentDetails(
                                                                                (prev) => ({
                                                                                    ...prev,
                                                                                    notes: e.target
                                                                                        .value,
                                                                                })
                                                                            )
                                                                        }
                                                                        className="font-mono text-sm"
                                                                        rows={3}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <DialogFooter>
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        setPaymentDialogOpen(false)
                                                                    }
                                                                    className="font-mono text-xs"
                                                                >
                                                                    CANCEL
                                                                </Button>
                                                                <Button
                                                                    onClick={handleConfirmPayment}
                                                                    disabled={
                                                                        !paymentDetails.paymentMethod ||
                                                                        !paymentDetails.paymentReference
                                                                    }
                                                                    className="font-mono text-xs bg-green-600 hover:bg-green-700"
                                                                >
                                                                    CONFIRM PAYMENT
                                                                </Button>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            </>
                                        )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Delivery Schedule Card - Show for CONFIRMED+ states (Feedback #1: Independent from payment) */}
                        {[
                            "AWAITING_FABRICATION",
                            "CONFIRMED",
                            "IN_PREPARATION",
                            "READY_FOR_DELIVERY",
                        ].includes(order?.data?.order_status) && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="font-mono text-sm flex items-center gap-2">
                                            <Truck className="h-4 w-4 text-secondary" />
                                            DELIVERY SCHEDULE
                                        </CardTitle>
                                        <Dialog
                                            open={timeWindowsOpen}
                                            onOpenChange={setTimeWindowsOpen}
                                        >
                                            <DialogTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className={`font-mono text-xs ${!canEditTimeWindows ? "hidden" : ""}`}
                                                    disabled={!canEditTimeWindows}
                                                >
                                                    <Edit className="h-3 w-3 mr-2" />
                                                    EDIT
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-lg overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle className="font-mono">
                                                        UPDATE DELIVERY SCHEDULE
                                                    </DialogTitle>
                                                    <DialogDescription className="font-mono text-xs">
                                                        Set time windows for delivery and pickup
                                                        coordination
                                                    </DialogDescription>
                                                </DialogHeader>

                                                <div className="space-y-6 py-4">
                                                    <div className="space-y-3">
                                                        <Label className="font-mono text-sm font-bold">
                                                            DELIVERY WINDOW
                                                        </Label>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label className="font-mono text-xs text-muted-foreground">
                                                                    START
                                                                </Label>
                                                                <DateTimePicker
                                                                    value={
                                                                        timeWindows.deliveryWindowStart
                                                                    }
                                                                    onChange={(date) =>
                                                                        setTimeWindows((prev) => ({
                                                                            ...prev,
                                                                            deliveryWindowStart:
                                                                                date,
                                                                        }))
                                                                    }
                                                                    placeholder="Select delivery start"
                                                                    disabledDays={
                                                                        deliveryDisabledDays
                                                                    }
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="font-mono text-xs text-muted-foreground">
                                                                    END
                                                                </Label>
                                                                <DateTimePicker
                                                                    value={
                                                                        timeWindows.deliveryWindowEnd
                                                                    }
                                                                    onChange={(date) =>
                                                                        setTimeWindows((prev) => ({
                                                                            ...prev,
                                                                            deliveryWindowEnd: date,
                                                                        }))
                                                                    }
                                                                    placeholder="Select delivery end"
                                                                    disabledDays={
                                                                        deliveryDisabledDays
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <Separator />

                                                    <div className="space-y-3">
                                                        <Label className="font-mono text-sm font-bold">
                                                            PICKUP WINDOW
                                                        </Label>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label className="font-mono text-xs text-muted-foreground">
                                                                    START
                                                                </Label>
                                                                <DateTimePicker
                                                                    value={
                                                                        timeWindows.pickupWindowStart
                                                                    }
                                                                    onChange={(date) =>
                                                                        setTimeWindows((prev) => ({
                                                                            ...prev,
                                                                            pickupWindowStart: date,
                                                                        }))
                                                                    }
                                                                    placeholder="Select pickup start"
                                                                    disabledDays={
                                                                        pickupDisabledDays
                                                                    }
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="font-mono text-xs text-muted-foreground">
                                                                    END
                                                                </Label>
                                                                <DateTimePicker
                                                                    value={
                                                                        timeWindows.pickupWindowEnd
                                                                    }
                                                                    onChange={(date) =>
                                                                        setTimeWindows((prev) => ({
                                                                            ...prev,
                                                                            pickupWindowEnd: date,
                                                                        }))
                                                                    }
                                                                    placeholder="Select pickup end"
                                                                    disabledDays={
                                                                        pickupDisabledDays
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <DialogFooter>
                                                    <Button
                                                        variant="outline"
                                                        disabled={updateTimeWindowsLoading}
                                                        onClick={() => setTimeWindowsOpen(false)}
                                                        className="font-mono text-xs"
                                                    >
                                                        CANCEL
                                                    </Button>
                                                    <Button
                                                        onClick={handleTimeWindowsSave}
                                                        disabled={updateTimeWindowsLoading}
                                                        className="font-mono text-xs"
                                                    >
                                                        {updateTimeWindowsLoading
                                                            ? "Saving..."
                                                            : "SAVE SCHEDULE"}
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {order?.data?.delivery_window?.start ? (
                                        <>
                                            <div className="p-3 bg-green-500/5 border border-green-500/20 rounded">
                                                <Label className="font-mono text-[10px] text-muted-foreground">
                                                    DELIVERY
                                                </Label>
                                                <p className="font-mono text-xs mt-1">
                                                    {new Date(
                                                        order?.data?.delivery_window?.start
                                                    ).toLocaleString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                    {" → "}
                                                    {new Date(
                                                        order?.data?.delivery_window?.end
                                                    ).toLocaleTimeString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                            </div>
                                            <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded">
                                                <Label className="font-mono text-[10px] text-muted-foreground">
                                                    PICKUP
                                                </Label>
                                                <p className="font-mono text-xs mt-1">
                                                    {new Date(
                                                        order?.data?.pickup_window?.start
                                                    ).toLocaleString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                    {" → "}
                                                    {new Date(
                                                        order?.data?.pickup_window?.end
                                                    ).toLocaleString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="p-8 text-center bg-muted/20 rounded border-2 border-dashed">
                                            <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                                            <p className="font-mono text-xs text-muted-foreground">
                                                NO SCHEDULE SET
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Event & Venue */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    EVENT & VENUE
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="font-mono text-xs text-muted-foreground">
                                            START
                                        </Label>
                                        <p className="font-mono text-sm mt-1">
                                            {new Date(
                                                order?.data?.event_start_date
                                            ).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="font-mono text-xs text-muted-foreground">
                                            END
                                        </Label>
                                        <p className="font-mono text-sm mt-1">
                                            {new Date(
                                                order?.data?.event_end_date
                                            ).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <Separator />
                                <div>
                                    <Label className="font-mono text-xs text-muted-foreground flex items-center gap-2">
                                        <MapPin className="h-3 w-3" /> VENUE
                                    </Label>
                                    <p className="font-mono text-sm font-bold mt-1">
                                        {order?.data?.venue_name}
                                    </p>
                                    <p className="font-mono text-xs text-muted-foreground mt-0.5">
                                        {order?.data?.venue_city}, {order?.data?.venue_country}
                                    </p>
                                </div>
                                {order?.data?.special_instructions && (
                                    <>
                                        <Separator />
                                        <div>
                                            <Label className="font-mono text-xs text-muted-foreground">
                                                SPECIAL INSTRUCTIONS
                                            </Label>
                                            <p className="font-mono text-sm mt-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded">
                                                {order?.data?.special_instructions}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Contact */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm flex items-center gap-2">
                                    <User className="h-4 w-4 text-primary" />
                                    CONTACT
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="font-mono text-sm font-bold">
                                    {order?.data?.contact_name}
                                </p>
                                <p className="font-mono text-xs text-muted-foreground flex items-center gap-2">
                                    <Mail className="h-3 w-3" /> {order?.data?.contact_email}
                                </p>
                                <p className="font-mono text-xs text-muted-foreground flex items-center gap-2">
                                    <Phone className="h-3 w-3" /> {order?.data?.contact_phone}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Linked Service Requests */}
                        {Array.isArray(order?.data?.linked_service_requests) &&
                            order.data.linked_service_requests.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="font-mono text-sm flex items-center gap-2">
                                            <Wrench className="h-4 w-4 text-primary" />
                                            LINKED SERVICE REQUESTS (
                                            {order.data.linked_service_requests.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {order.data.linked_service_requests.map((sr: any) => (
                                            <div
                                                key={sr.id}
                                                className="border rounded p-3 bg-muted/20 space-y-2"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <Link
                                                        href={`/service-requests/${sr.id}`}
                                                        className="font-mono text-xs text-primary hover:underline"
                                                    >
                                                        {sr.service_request_id}
                                                    </Link>
                                                    <div className="flex items-center gap-2">
                                                        <Badge className="font-mono text-[10px] border">
                                                            {sr.request_status}
                                                        </Badge>
                                                        <Badge className="font-mono text-[10px] border">
                                                            {sr.commercial_status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                                                    <span>{sr.request_type}</span>
                                                    <span>
                                                        {sr.total
                                                            ? `AED ${Number(sr.total).toFixed(2)}`
                                                            : "AED —"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                        {/* Order Items */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm flex items-center gap-2">
                                    <Boxes className="h-4 w-4 text-primary" />
                                    ITEMS ({order?.data?.items?.length || 0})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {order?.data?.items?.map((item: any) => (
                                    <OrderItemCard
                                        key={item.id}
                                        item={item}
                                        orderId={order?.data?.id}
                                        orderStatus={order?.data?.order_status}
                                        onRefresh={refetch}
                                    />
                                ))}
                            </CardContent>
                        </Card>

                        {/* Scanning Activity - Show for IN_PREPARATION+ states */}
                        {[
                            "IN_PREPARATION",
                            "READY_FOR_DELIVERY",
                            "IN_TRANSIT",
                            "DELIVERED",
                            "IN_USE",
                            "AWAITING_RETURN",
                            "CLOSED",
                            "PRICING_REVIEW",
                        ].includes(order?.data?.order_status) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-mono text-sm flex items-center gap-2">
                                        <ScanLine className="h-4 w-4 text-primary" />
                                        SCANNING ACTIVITY
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScanActivityTimeline orderId={order?.data?.order_id} />
                                </CardContent>
                            </Card>
                        )}

                        {/* NEW: PRICING_REVIEW - Logistics Review Section */}
                        {order.data.order_status === "PRICING_REVIEW" ? (
                            <PricingReviewSection
                                order={order.data}
                                orderId={order.data.id}
                                onRefresh={refetch}
                            />
                        ) : (
                            <PendingApprovalSection
                                order={order.data}
                                orderId={order.data.id}
                                onRefresh={refetch}
                            />
                        )}

                        {/* Submit order for the review */}
                        <OrderApprovalRequestSubmitBtn
                            orderId={order.data.id}
                            onSubmitSuccess={refetch}
                            isVisible={
                                order?.data?.order_status === "PRICING_REVIEW" &&
                                canSubmitForApproval
                            }
                        />
                    </div>

                    {/* Right: Status History Timeline */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-24">
                            <CardHeader>
                                <CardTitle className="font-mono text-sm flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" />
                                    HISTORY
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(() => {
                                    const history = statusHistory?.data?.history || [];
                                    const currentStatus =
                                        statusHistory?.data?.current_status ||
                                        order?.data?.order_status;
                                    const activeIndex = Math.max(
                                        0,
                                        history.findIndex(
                                            (e: any) => e.status === currentStatus
                                        )
                                    );
                                    const entries = history.map((entry: any, index: number) => {
                                        const cfg = STATUS_CONFIG[entry.status] || {
                                            label: entry.status,
                                            color: "bg-slate-500/10 text-slate-600 border-slate-500/20",
                                        };
                                        return {
                                            id: entry.id,
                                            label: cfg.label,
                                            badgeClassName: cfg.color,
                                            timestamp: entry.timestamp,
                                            user: entry.updated_by_user?.name || "System",
                                            note: entry.notes || null,
                                            isActive: index === activeIndex,
                                        };
                                    });
                                    return (
                                        <StatusHistoryTimeline
                                            entries={entries}
                                            loading={statusHistoryLoading}
                                        />
                                    );
                                })()}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
