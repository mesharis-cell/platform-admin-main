export type SelfBookingStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type SelfBookingItemStatus = "OUT" | "RETURNED";

export interface SelfBookingItem {
    id: string;
    self_booking_id: string;
    asset_id: string;
    asset: {
        id: string;
        name: string;
        qr_code: string;
        category: string;
        tracking_method: string;
    };
    quantity: number;
    returned_quantity: number;
    status: SelfBookingItemStatus;
    returned_at: string | null;
    created_at: string;
}

export interface SelfBooking {
    id: string;
    platform_id: string;
    booked_for: string;
    reason: string | null;
    job_reference: string | null;
    status: SelfBookingStatus;
    created_by: string;
    created_by_user: { id: string; name: string; email: string } | null;
    cancelled_by: string | null;
    cancelled_by_user: { id: string; name: string; email: string } | null;
    cancellation_reason: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
    notes: string | null;
    items: SelfBookingItem[];
    created_at: string;
    updated_at: string;
}

export interface CreateSelfBookingRequest {
    booked_for: string;
    reason?: string;
    job_reference?: string;
    notes?: string;
    items: { asset_id: string; quantity: number }[];
}

export interface ReturnScanRequest {
    qr_code: string;
    quantity?: number;
}

export interface CancelSelfBookingRequest {
    cancellation_reason?: string;
}

export interface SelfBookingsListResponse {
    data: SelfBooking[];
    meta: {
        total: number;
        page: number;
        limit: number;
        total_pages: number;
    };
}
