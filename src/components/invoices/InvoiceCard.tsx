"use client";

/**
 * InvoiceCard Component
 * Reusable invoice card for displaying invoice information with actions
 */

import {
  FileText,
  DollarSign,
  CheckCircle2,
  Clock,
  Download,
  Calendar,
  Building2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InvoiceListItem } from "@/types/order";
import { getOrderPrice } from "@/lib/utils/helper";

interface InvoiceCardProps {
  invoice: InvoiceListItem;
  onDownload?: (invoiceNumber: string) => void;
  onSendInvoice?: (invoice: InvoiceListItem) => void;
  onConfirmPayment?: (invoice: InvoiceListItem) => void;
  isDownloading?: boolean;
  isSending?: boolean;
  className?: string;
}

export function InvoiceCard({
  invoice,
  onDownload,
  onSendInvoice,
  onConfirmPayment,
  isDownloading = false,
  isSending = false,
  className = "",
}: InvoiceCardProps) {
  const { total } = getOrderPrice(invoice?.order?.order_pricing)

  const getStatusBadge = () => {
    if (invoice?.order?.financial_status === "PAID") {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/30 font-mono">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          PAID
        </Badge>
      );
    }
    if (invoice?.order?.financial_status === "INVOICED") {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 font-mono">
          <Clock className="w-3 h-3 mr-1" />
          INVOICE SENT
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500/10 text-red-600 border-red-500/30 font-mono">
        <Clock className="w-3 h-3 mr-1" />
        PENDING INVOICE
      </Badge>
    );
  };

  return (
    <Card className={`p-6 border-2 hover:border-primary/50 transition-all duration-200 ${className}`}>
      <div className="flex items-start justify-between gap-6">
        {/* Left: Invoice Info */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-mono font-bold text-lg">
                {invoice.invoice_id}
              </div>
              <div className="text-sm text-muted-foreground font-mono">
                Order: {invoice?.order?.order_id}
              </div>
            </div>
            {getStatusBadge()}
          </div>

          <div className="grid grid-cols-3 gap-4 pl-13">
            <div>
              <div className="text-xs text-muted-foreground font-mono">
                COMPANY
              </div>
              <div className="text-sm font-mono flex items-center gap-1.5 mt-1">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                {invoice.company.name}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-mono">
                CONTACT
              </div>
              <div className="text-sm font-mono mt-1">
                {invoice?.order?.contact_name}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-mono">
                INVOICE DATE
              </div>
              <div className="text-sm font-mono flex items-center gap-1.5 mt-1">
                <Calendar className="w-3.5 h-3.5 text-secondary" />
                {new Date(invoice.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Payment Details (shown when paid) */}
          {invoice.invoice_paid_at && (
            <div className="pl-13 pt-2 border-t border-border">
              <div className="flex items-center gap-6 text-sm font-mono">
                <div>
                  <span className="text-muted-foreground">
                    Paid on:
                  </span>{" "}
                  <span className="text-green-600 font-bold">
                    {new Date(invoice.invoice_paid_at).toLocaleDateString()}
                  </span>
                </div>
                {invoice.payment_method && (
                  <div>
                    <span className="text-muted-foreground">
                      Method:
                    </span>{" "}
                    <span>{invoice.payment_method}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Amount & Actions */}
        <div className="flex flex-col items-end gap-3">
          <div className="text-right">
            <div className="text-xs text-muted-foreground font-mono">
              AMOUNT
            </div>
            <div className="text-3xl font-bold font-mono text-primary">
              {Number(total).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              AED
            </div>
          </div>

          <div className="flex gap-2">
            {/* Download Button */}
            <Button
              onClick={() => onDownload?.(invoice.invoice_id)}
              variant="outline"
              size="sm"
              className="font-mono"
              disabled={isDownloading}
            >
              <Download className="w-4 h-4" />
            </Button>

            {/* Send Invoice Button - Show for PENDING_INVOICE status */}
            {invoice.order.financial_status === "PENDING_INVOICE" && onSendInvoice && (
              <Button
                onClick={() => onSendInvoice(invoice)}
                size="sm"
                className="font-mono"
                disabled={isSending}
              >
                <Send className="w-4 h-4 mr-2" />
                SEND INVOICE
              </Button>
            )}

            {/* Confirm Payment Button - Show for INVOICED status */}
            {invoice.order.financial_status === "INVOICED" && onConfirmPayment && (
              <Button
                onClick={() => onConfirmPayment(invoice)}
                size="sm"
                className="font-mono"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                CONFIRM PAYMENT
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
