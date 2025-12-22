/**
 * React Query hooks for client order tracking operations
 * Phase 13: Client Order Tracking Dashboard
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for client order operations
interface ClientOrderListParams {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  brand?: string;
  page?: number;
  limit?: number;
}

interface ClientOrder {
  id: string;
  orderId: string;
  company: { id: string; name: string };
  brand: { id: string; name: string } | null;
  eventStartDate: string;
  eventEndDate: string;
  venueName: string;
  venueCity: string;
  status: string;
  finalTotalPrice: number;
  createdAt: string;
}

interface ClientOrderDetail {
  id: string;
  orderId: string;
  company: { id: string; name: string };
  brand: { id: string; name: string } | null;
  createdBy: { id: string; name: string; email: string };
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  eventStartDate: string;
  eventEndDate: string;
  venueName: string;
  venueCountry: string;
  venueCity: string;
  venueAddress: string;
  venueAccessNotes: string | null;
  deliveryWindowStart: string | null;
  deliveryWindowEnd: string | null;
  pickupWindowStart: string | null;
  pickupWindowEnd: string | null;
  truckPhotos: string[];
  specialInstructions: string | null;
  calculatedVolume: number;
  calculatedWeight: number;
  finalTotalPrice: number;
  quoteSentAt: string | null;
  invoiceNumber: string | null;
  invoiceGeneratedAt: string | null;
  invoicePdfUrl: string | null;
  status: string;
  items: any[];
  statusHistory: any[];
  createdAt: string;
  updatedAt: string;
}

interface CalendarEvent {
  id: string;
  orderId: string;
  title: string;
  eventStartDate: string;
  eventEndDate: string;
  venueName: string;
  venueCity: string;
  status: string;
  brand: { id: string; name: string } | null;
}

interface DashboardSummary {
  summary: {
    activeOrders: number;
    pendingQuotes: number;
    upcomingEvents: number;
    awaitingReturn: number;
  };
  recentOrders: ClientOrder[];
}

/**
 * Hook to fetch client's orders with filtering
 */
export function useClientOrders(params: ClientOrderListParams = {}) {
  return useQuery({
    queryKey: ['client-orders', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) queryParams.append('dateTo', params.dateTo);
      if (params.brand) queryParams.append('brand', params.brand);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const response = await fetch(`/api/client/orders?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      return response.json();
    },
  });
}

/**
 * Hook to fetch single order detail
 */
export function useClientOrderDetail(orderId: string | null) {
  return useQuery({
    queryKey: ['client-order-detail', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const response = await fetch(`/api/client/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }
      return response.json();
    },
    enabled: !!orderId,
  });
}

/**
 * Hook to approve a quote
 */
export function useApproveQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/client/orders/${orderId}/quote/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve quote');
      }
      return response.json();
    },
    onSuccess: (_, orderId) => {
      // Invalidate order detail and list queries
      queryClient.invalidateQueries({ queryKey: ['client-order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['client-orders'] });
      queryClient.invalidateQueries({ queryKey: ['client-dashboard-summary'] });
    },
  });
}

/**
 * Hook to decline a quote
 */
export function useDeclineQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) => {
      const response = await fetch(`/api/client/orders/${orderId}/quote/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to decline quote');
      }
      return response.json();
    },
    onSuccess: (_, { orderId }) => {
      // Invalidate order detail and list queries
      queryClient.invalidateQueries({ queryKey: ['client-order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['client-orders'] });
      queryClient.invalidateQueries({ queryKey: ['client-dashboard-summary'] });
    },
  });
}

/**
 * Hook to fetch calendar events
 */
export function useClientCalendar(params: { month?: string; year?: string } = {}) {
  return useQuery({
    queryKey: ['client-calendar', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params.month) queryParams.append('month', params.month);
      if (params.year) queryParams.append('year', params.year);

      const response = await fetch(`/api/client/calendar?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }
      return response.json();
    },
  });
}

/**
 * Hook to fetch dashboard summary
 */
export function useClientDashboardSummary() {
  return useQuery({
    queryKey: ['client-dashboard-summary'],
    queryFn: async () => {
      const response = await fetch('/api/client/dashboard/summary');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard summary');
      }
      return response.json();
    },
  });
}

/**
 * Hook to download invoice PDF
 */
export function useDownloadInvoice() {
  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/client/invoices/download/${orderId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to download Cost Estimate');
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
}
