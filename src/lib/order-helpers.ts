/**
 * Order Helper Functions (Admin)
 * Utility functions for order management
 */

import type { OrderStatus } from "@/types/order";

/**
 * Check if order can be cancelled
 */
export function canCancelOrder(status: OrderStatus): boolean {
    const CANCELLABLE = [
        "DRAFT",
        "SUBMITTED",
        "PRICING_REVIEW",
        "PENDING_APPROVAL",
        "QUOTED",
        "CONFIRMED",
        "IN_PREPARATION",
    ];
    return CANCELLABLE.includes(status);
}

/**
 * Check if line items can be added or removed
 * Line item management is only allowed BEFORE the order is CONFIRMED.
 * Once an order reaches CONFIRMED status or later, line items are locked.
 */
export function canManageLineItems(status: OrderStatus): boolean {
    const MANAGEABLE_STATUSES = [
        "DRAFT",
        "SUBMITTED",
        "PRICING_REVIEW",
        "PENDING_APPROVAL",
        "QUOTED",
        "CONFIRMED",
        // "DECLINED",
    ];
    return MANAGEABLE_STATUSES.includes(status);
}

/**
 * Get status badge color
 */
export function getStatusColor(status: OrderStatus): string {
    const colors: Record<string, string> = {
        DRAFT: "bg-gray-500",
        SUBMITTED: "bg-blue-500",
        PRICING_REVIEW: "bg-yellow-500",
        PENDING_APPROVAL: "bg-orange-500",
        QUOTED: "bg-purple-500",
        DECLINED: "bg-red-500",
        CONFIRMED: "bg-green-500",
        IN_PREPARATION: "bg-cyan-500",
        READY_FOR_DELIVERY: "bg-indigo-500",
        IN_TRANSIT: "bg-violet-500",
        DELIVERED: "bg-emerald-500",
        IN_USE: "bg-teal-500",
        DERIG: "bg-purple-600",
        AWAITING_RETURN: "bg-amber-500",
        RETURN_IN_TRANSIT: "bg-orange-500",
        CLOSED: "bg-gray-600",
        CANCELLED: "bg-red-600",
    };
    return colors[status] || "bg-gray-500";
}

/**
 * Format order ID for display
 */
export function formatOrderId(orderId: string): string {
    return orderId; // Already formatted as ORD-YYYYMMDD-XXX
}
