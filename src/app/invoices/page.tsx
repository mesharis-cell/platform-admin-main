"use client";

/**
 * Phase 9: PMG Invoice & Payment Tracking Dashboard
 * Industrial-technical payment management interface with invoice operations
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText,
    CheckCircle2,
    Clock,
    Filter,
    AlertCircle,
    TrendingUp,
    Receipt,
    Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
    useInvoices,
    useConfirmPayment,
    useDownloadInvoice,
    useExportReconciliation,
} from "@/hooks/use-invoices";
import { useCompanies } from "@/hooks/use-companies";
import { toast } from "sonner";
import { InvoiceListParams } from "@/types/order";
import { AdminHeader } from "@/components/admin-header";
import { usePlatform } from "@/contexts/platform-context";
import { useSendInvoice } from "@/hooks/use-orders";
import { InvoiceCard } from "@/components/invoices/InvoiceCard";
import { InboundRequestInvoice } from "@/components/invoices/InboundRequestInvoice";
import { ServiceRequestInvoice } from "@/components/invoices/ServiceRequestInvoice";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import { getOrderPrice } from "@/lib/utils/helper";

export default function InvoicesPage() {
    const { user } = useToken();
    // Filters
    const [filters, setFilters] = useState<InvoiceListParams>({
        page: 1,
        limit: 20,
        sortBy: "created_at",
        sortOrder: "desc",
    });

    const [selectedCompany, setSelectedCompany] = useState<string>("");
    const [paymentStatus, setPaymentStatus] = useState<string>("all");
    const [sentInvoice, setSentInvoice] = useState<boolean>(false);
    const { platform } = usePlatform();

    // Modals
    const [confirmPaymentDialogOpen, setConfirmPaymentDialogOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [paymentMethod, setPaymentMethod] = useState("");
    const [paymentReference, setPaymentReference] = useState("");
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
    const [paymentNotes, setPaymentNotes] = useState("");
    const [invoiceType, setInvoiceType] = useState("all");

    // Reconciliation export
    const [reconciliationOpen, setReconciliationOpen] = useState(false);
    const [reconCompany, setReconCompany] = useState("");
    const [reconDateFrom, setReconDateFrom] = useState("");
    const [reconDateTo, setReconDateTo] = useState("");

    // Hooks
    const { data: companies } = useCompanies({});
    const { data: invoicesData, isLoading } = useInvoices({
        ...filters,
        company: selectedCompany || undefined,
        type: invoiceType || undefined,
        isPaid: paymentStatus,
    });
    const confirmPayment = useConfirmPayment();
    const downloadInvoice = useDownloadInvoice();
    const { mutateAsync: sendInvoice, isPending: isSendingInvoice } = useSendInvoice();
    const canDownloadInvoices = hasPermission(user, ADMIN_ACTION_PERMISSIONS.invoicesDownload);
    const canSendInvoices = hasPermission(user, ADMIN_ACTION_PERMISSIONS.invoicesGenerate);
    const canConfirmInvoicePayment = hasPermission(
        user,
        ADMIN_ACTION_PERMISSIONS.invoicesConfirmPayment
    );
    const canExport = hasPermission(user, ADMIN_ACTION_PERMISSIONS.ordersExport);
    const exportReconciliation = useExportReconciliation();

    const getInvoiceAmount = (invoice: any) => {
        const pricing =
            invoice?.order?.pricing ||
            invoice?.order?.order_pricing ||
            invoice?.inbound_request?.pricing ||
            invoice?.service_request?.pricing;
        if (pricing) return Number(getOrderPrice(pricing).total || 0);
        return Number(invoice?.order?.final_pricing?.total_price || 0);
    };

    const getInvoiceReference = (invoice: any) => {
        if (invoice?.order) return { type: "Order", id: invoice.order.order_id };
        if (invoice?.inbound_request)
            return {
                type: "New Stock Request",
                id: invoice.inbound_request.inbound_request_id,
            };
        if (invoice?.service_request)
            return {
                type: "Service Request",
                id: invoice.service_request.service_request_id,
            };
        return { type: "Reference", id: "N/A" };
    };

    const handleApplyFilters = () => {
        setFilters((prev) => ({
            ...prev,
            company: selectedCompany || undefined,
            isPaid: paymentStatus,
            page: 1,
        }));
    };

    const handleClearFilters = () => {
        setSelectedCompany("");
        setPaymentStatus("all");
        setFilters({
            page: 1,
            limit: 20,
            sortBy: "created_at",
            sortOrder: "desc",
        });
    };

    const handleOpenConfirmPayment = (invoice: any) => {
        if (!canConfirmInvoicePayment) return;
        if (!invoice?.order?.id) {
            toast.error("Payment confirmation is only available for order invoices");
            return;
        }
        setSelectedInvoice(invoice);
        setPaymentMethod("");
        setPaymentReference("");
        setPaymentDate(new Date().toISOString().split("T")[0]);
        setPaymentNotes("");
        setConfirmPaymentDialogOpen(true);
    };

    const handleConfirmPayment = async () => {
        if (!canConfirmInvoicePayment) return;
        if (!selectedInvoice) return;
        const orderId = selectedInvoice?.order?.id;
        if (!orderId) {
            toast.error("Invalid invoice source for payment confirmation");
            return;
        }

        if (!paymentMethod || !paymentReference || !paymentDate) {
            toast.error("Payment method, reference, and date are required");
            return;
        }

        try {
            await confirmPayment.mutateAsync({
                orderId,
                data: {
                    payment_method: paymentMethod,
                    payment_reference: paymentReference,
                    payment_date: paymentDate,
                    notes: paymentNotes || undefined,
                },
            });

            toast.success("Payment confirmed successfully");
            setConfirmPaymentDialogOpen(false);
            setSelectedInvoice(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to confirm payment");
        }
    };

    const handleDownloadInvoice = async (invoiceNumber: string) => {
        if (!canDownloadInvoices) return;
        if (!invoiceNumber) return;

        try {
            const pdfBlob = await downloadInvoice.mutateAsync({
                invoiceNumber,
                platformId: platform.platform_id,
            });
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `invoice-${invoiceNumber}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error: any) {
            toast.error(error.message || "Failed to download Invoice");
        }
    };

    const handleSendInvoice = async () => {
        if (!canSendInvoices) return;
        if (!selectedInvoice) return;
        if (!selectedInvoice?.order?.id) {
            toast.error("Sending invoice is only available for order invoices");
            return;
        }

        try {
            await sendInvoice(selectedInvoice.order.id);
            toast.success("Invoice sent successfully");
            setSentInvoice(false);
            setSelectedInvoice(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to send Invoice");
        }
    };

    const handleExportReconciliation = async () => {
        try {
            await exportReconciliation.mutateAsync({
                company_id: reconCompany && reconCompany !== "all" ? reconCompany : undefined,
                date_from: reconDateFrom || undefined,
                date_to: reconDateTo || undefined,
            });
            toast.success("Reconciliation export downloaded");
            setReconciliationOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to export reconciliation");
        }
    };

    // Calculate stats
    const stats = invoicesData?.data
        ? {
              totalInvoices: invoicesData?.meta?.total,
              paidInvoices: invoicesData.data.filter((inv) => inv.invoice_paid_at).length,
              unpaidInvoices: invoicesData.data.filter((inv) => !inv.invoice_paid_at).length,
              totalRevenue: invoicesData.data
                  .filter((inv) => inv.invoice_paid_at)
                  .reduce((sum, inv) => sum + getInvoiceAmount(inv), 0),
          }
        : null;
    const selectedInvoiceReference = selectedInvoice
        ? getInvoiceReference(selectedInvoice)
        : { type: "Reference", id: "N/A" };

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Receipt}
                title="INVOICE MANAGEMENT"
                description="Generate · Track · Payments"
                stats={stats ? { label: "TOTAL INVOICES", value: stats.totalInvoices } : undefined}
                actions={
                    canExport ? (
                        <Button
                            variant="outline"
                            className="font-mono gap-2"
                            onClick={() => setReconciliationOpen(true)}
                        >
                            <Download className="w-4 h-4" />
                            RECONCILIATION EXPORT
                        </Button>
                    ) : undefined
                }
            />

            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Stats Grid */}
                {stats && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
                    >
                        <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-3 mb-2">
                                <FileText className="w-5 h-5 text-primary" />
                                <span className="text-sm font-mono text-muted-foreground">
                                    TOTAL
                                </span>
                            </div>
                            <div className="text-3xl font-bold font-mono">
                                {stats.totalInvoices}
                            </div>
                            <div className="text-xs font-mono text-muted-foreground mt-1">
                                Invoices
                            </div>
                        </Card>

                        <Card className="p-6 border-2 hover:border-green-500/50 transition-colors">
                            <div className="flex items-center gap-3 mb-2">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <span className="text-sm font-mono text-muted-foreground">
                                    PAID
                                </span>
                            </div>
                            <div className="text-3xl font-bold font-mono text-green-600">
                                {stats.paidInvoices}
                            </div>
                            <div className="text-xs font-mono text-muted-foreground mt-1">
                                {stats.totalInvoices > 0
                                    ? Math.round((stats.paidInvoices / stats.totalInvoices) * 100)
                                    : 0}
                                % collected
                            </div>
                        </Card>

                        <Card className="p-6 border-2 hover:border-amber-500/50 transition-colors">
                            <div className="flex items-center gap-3 mb-2">
                                <Clock className="w-5 h-5 text-amber-600" />
                                <span className="text-sm font-mono text-muted-foreground">
                                    PENDING
                                </span>
                            </div>
                            <div className="text-3xl font-bold font-mono text-amber-600">
                                {stats.unpaidInvoices}
                            </div>
                            <div className="text-xs font-mono text-muted-foreground mt-1">
                                Awaiting payment
                            </div>
                        </Card>

                        <Card className="p-6 border-2 hover:border-secondary/50 transition-colors">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingUp className="w-5 h-5 text-secondary" />
                                <span className="text-sm font-mono text-muted-foreground">
                                    REVENUE
                                </span>
                            </div>
                            <div className="text-3xl font-bold font-mono text-secondary">
                                {stats.totalRevenue.toFixed(0)}
                            </div>
                            <div className="text-xs font-mono text-muted-foreground mt-1">
                                AED collected
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                >
                    <Card className="p-6 border-2 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Filter className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-bold font-mono">FILTERS</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <Label className="font-mono text-xs mb-2">COMPANY</Label>
                                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                                    <SelectTrigger className="font-mono">
                                        <SelectValue placeholder="All Companies" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Companies</SelectItem>
                                        {companies?.data.map((company) => (
                                            <SelectItem key={company.id} value={company.id}>
                                                {company.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="font-mono text-xs mb-2">INVOICE TYPE</Label>
                                <Select value={invoiceType} onValueChange={setInvoiceType}>
                                    <SelectTrigger className="font-mono">
                                        <SelectValue placeholder="All Invoice Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="INBOUND_REQUEST">
                                            New Stock Request
                                        </SelectItem>
                                        <SelectItem value="ORDER">Order</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="font-mono text-xs mb-2">PAYMENT STATUS</Label>
                                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                                    <SelectTrigger className="font-mono">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="paid">Paid</SelectItem>
                                        <SelectItem value="unpaid">Unpaid</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-end gap-2">
                                <Button onClick={handleApplyFilters} className="flex-1 font-mono">
                                    <Filter className="w-4 h-4 mr-2" />
                                    APPLY
                                </Button>
                                <Button
                                    onClick={handleClearFilters}
                                    variant="outline"
                                    className="font-mono"
                                >
                                    CLEAR
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Invoice List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                >
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-32 w-full" />
                            ))}
                        </div>
                    ) : invoicesData && invoicesData.data.length > 0 ? (
                        <div className="space-y-4">
                            <AnimatePresence mode="popLayout">
                                {invoicesData.data.map((invoice, index) => (
                                    <motion.div
                                        key={invoice.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ delay: index * 0.05 }}
                                        layout
                                    >
                                        {invoice?.order && (
                                            <InvoiceCard
                                                invoice={invoice}
                                                onDownload={
                                                    canDownloadInvoices
                                                        ? () => handleDownloadInvoice(invoice.id)
                                                        : undefined
                                                }
                                                onSendInvoice={
                                                    canSendInvoices
                                                        ? (inv) => {
                                                              setSelectedInvoice(inv);
                                                              setSentInvoice(true);
                                                          }
                                                        : undefined
                                                }
                                                onConfirmPayment={
                                                    canConfirmInvoicePayment
                                                        ? (inv) => handleOpenConfirmPayment(inv)
                                                        : undefined
                                                }
                                                isDownloading={downloadInvoice.isPending}
                                                isSending={isSendingInvoice}
                                            />
                                        )}

                                        {invoice?.inbound_request && (
                                            <InboundRequestInvoice
                                                invoice={invoice}
                                                onDownload={
                                                    canDownloadInvoices
                                                        ? () => handleDownloadInvoice(invoice.id)
                                                        : undefined
                                                }
                                                isDownloading={downloadInvoice.isPending}
                                                isSending={isSendingInvoice}
                                            />
                                        )}

                                        {invoice?.service_request && (
                                            <ServiceRequestInvoice
                                                invoice={invoice}
                                                onDownload={
                                                    canDownloadInvoices
                                                        ? () => handleDownloadInvoice(invoice.id)
                                                        : undefined
                                                }
                                                isDownloading={downloadInvoice.isPending}
                                                isSending={isSendingInvoice}
                                            />
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {/* Pagination */}
                            {Math.ceil(invoicesData?.meta?.total / invoicesData?.meta?.limit) >
                                1 && (
                                <div className="flex items-center justify-center gap-2 mt-8">
                                    <Button
                                        onClick={() =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                page: Math.max(1, prev.page! - 1),
                                            }))
                                        }
                                        disabled={filters.page === 1}
                                        variant="outline"
                                        size="sm"
                                        className="font-mono"
                                    >
                                        PREV
                                    </Button>
                                    <div className="px-4 py-2 font-mono text-sm">
                                        Page {filters.page} of{" "}
                                        {Math.ceil(
                                            invoicesData?.meta?.total / invoicesData?.meta?.limit
                                        )}
                                    </div>
                                    <Button
                                        onClick={() =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                page: Math.min(
                                                    Math.ceil(
                                                        invoicesData?.meta?.total /
                                                            invoicesData?.meta?.limit
                                                    ),
                                                    prev.page! + 1
                                                ),
                                            }))
                                        }
                                        disabled={
                                            filters.page ===
                                            Math.ceil(
                                                invoicesData?.meta?.total /
                                                    invoicesData?.meta?.limit
                                            )
                                        }
                                        variant="outline"
                                        size="sm"
                                        className="font-mono"
                                    >
                                        NEXT
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Card className="p-12 text-center border-2 border-dashed">
                            <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                            <h3 className="text-xl font-bold font-mono mb-2">NO INVOICES FOUND</h3>
                            <p className="text-muted-foreground font-mono text-sm">
                                No invoices match your current filters
                            </p>
                        </Card>
                    )}
                </motion.div>
            </div>

            {/* Confirm Payment Dialog */}
            <Dialog open={confirmPaymentDialogOpen} onOpenChange={setConfirmPaymentDialogOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="font-mono">CONFIRM PAYMENT</DialogTitle>
                    </DialogHeader>

                    {selectedInvoice && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted/50 rounded-lg border-2">
                                <div className="grid grid-cols-2 gap-3 text-sm font-mono">
                                    <div>
                                        <span className="text-muted-foreground">Invoice:</span>{" "}
                                        <span className="font-bold">
                                            {selectedInvoice.invoice_id}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">
                                            {selectedInvoiceReference.type}:
                                        </span>{" "}
                                        <span className="font-bold">{selectedInvoiceReference.id}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Company:</span>{" "}
                                        <span>{selectedInvoice.company.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Amount:</span>{" "}
                                        <span className="font-bold text-primary">
                                            {getInvoiceAmount(selectedInvoice).toFixed(2)} AED
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label className="font-mono text-xs mb-2">PAYMENT METHOD *</Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger className="font-mono">
                                        <SelectValue placeholder="Select payment method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="Check">Check</SelectItem>
                                        <SelectItem value="Wire Transfer">Wire Transfer</SelectItem>
                                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="font-mono text-xs mb-2">
                                    PAYMENT REFERENCE *
                                </Label>
                                <Input
                                    value={paymentReference}
                                    onChange={(e) => setPaymentReference(e.target.value)}
                                    placeholder="Transaction ID, check number, etc."
                                    className="font-mono"
                                />
                            </div>

                            <div>
                                <Label className="font-mono text-xs mb-2">PAYMENT DATE *</Label>
                                <Input
                                    type="date"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    max={new Date().toISOString().split("T")[0]}
                                    className="font-mono"
                                />
                            </div>

                            <div>
                                <Label className="font-mono text-xs mb-2">NOTES (OPTIONAL)</Label>
                                <textarea
                                    value={paymentNotes}
                                    onChange={(e) => setPaymentNotes(e.target.value)}
                                    placeholder="Internal notes about this payment..."
                                    rows={3}
                                    className="w-full px-3 py-2 font-mono text-sm border-2 rounded-md bg-background"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            onClick={() => setConfirmPaymentDialogOpen(false)}
                            variant="outline"
                            className="font-mono"
                        >
                            CANCEL
                        </Button>
                        <Button
                            onClick={handleConfirmPayment}
                            disabled={confirmPayment.isPending}
                            className="font-mono"
                        >
                            {confirmPayment.isPending ? "CONFIRMING..." : "CONFIRM PAYMENT"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {sentInvoice && (
                <Dialog open={sentInvoice} onOpenChange={setSentInvoice}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Are you sure invoice is sent?</DialogTitle>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                onClick={() => setSentInvoice(false)}
                                variant="outline"
                                className="font-mono"
                                disabled={isSendingInvoice}
                            >
                                CANCEL
                            </Button>
                            <Button
                                onClick={handleSendInvoice}
                                className="font-mono"
                                disabled={isSendingInvoice}
                            >
                                {isSendingInvoice ? "YES..." : "YES"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Reconciliation Export Dialog */}
            <Dialog open={reconciliationOpen} onOpenChange={setReconciliationOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-mono">RECONCILIATION EXPORT</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label className="font-mono text-xs mb-2">COMPANY</Label>
                            <Select value={reconCompany} onValueChange={setReconCompany}>
                                <SelectTrigger className="font-mono">
                                    <SelectValue placeholder="All Companies" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Companies</SelectItem>
                                    {companies?.data.map((company) => (
                                        <SelectItem key={company.id} value={company.id}>
                                            {company.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="font-mono text-xs mb-2">DATE FROM</Label>
                            <Input
                                type="date"
                                value={reconDateFrom}
                                onChange={(e) => setReconDateFrom(e.target.value)}
                                className="font-mono"
                            />
                        </div>
                        <div>
                            <Label className="font-mono text-xs mb-2">DATE TO</Label>
                            <Input
                                type="date"
                                value={reconDateTo}
                                onChange={(e) => setReconDateTo(e.target.value)}
                                className="font-mono"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => setReconciliationOpen(false)}
                            variant="outline"
                            className="font-mono"
                        >
                            CANCEL
                        </Button>
                        <Button
                            onClick={handleExportReconciliation}
                            disabled={exportReconciliation.isPending}
                            className="font-mono gap-2"
                        >
                            <Download className="w-4 h-4" />
                            {exportReconciliation.isPending ? "EXPORTING..." : "EXPORT CSV"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
