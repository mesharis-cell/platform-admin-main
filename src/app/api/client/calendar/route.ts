import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { db } from '@/db';
import { orders, brands } from '@/db/schema/schema';
import { eq, and, isNull, asc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  // Require authentication and orders:read permission
  const authResult = await requirePermission('orders:read');
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  // Get query parameters
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // Format: YYYY-MM
  const year = searchParams.get('year'); // Format: YYYY

  try {
    // Get user's company (Client Users have single company in array)
    const userCompanyId = user.companies?.[0];
    if (!userCompanyId || userCompanyId === '*') {
      return errorResponse('Invalid company access', 403);
    }

    // Build WHERE conditions
    const conditions = [
      eq(orders.company, userCompanyId),
      isNull(orders.deletedAt)
    ];

    // Apply month filter
    if (month) {
      const startOfMonth = `${month}-01`;
      const [yearStr, monthStr] = month.split('-');
      const monthNum = parseInt(monthStr, 10);
      const lastDay = new Date(parseInt(yearStr, 10), monthNum, 0).getDate();
      const endOfMonth = `${month}-${String(lastDay).padStart(2, '0')}`;

      conditions.push(sql`${orders.eventStartDate} >= ${startOfMonth}`);
      conditions.push(sql`${orders.eventStartDate} <= ${endOfMonth}`);
    }
    // Apply year filter (if month not provided)
    else if (year) {
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;

      conditions.push(sql`${orders.eventStartDate} >= ${startOfYear}`);
      conditions.push(sql`${orders.eventStartDate} <= ${endOfYear}`);
    }

    // Query orders
    const calendarOrders = await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(asc(orders.eventStartDate));

    // Get brand details for each order
    const eventsWithDetails = await Promise.all(
      calendarOrders.map(async (order) => {
        let brandData = null;
        if (order.brand) {
          [brandData] = await db
            .select()
            .from(brands)
            .where(eq(brands.id, order.brand));
        }

        return {
          id: order.id,
          orderId: order.orderId,
          title: `${order.venueName} Event`,
          eventStartDate: order.eventStartDate,
          eventEndDate: order.eventEndDate,
          venueName: order.venueName,
          venueCity: order.venueCity,
          status: order.status,
          brand: brandData ? { id: brandData.id, name: brandData.name } : null,
        };
      })
    );

    return successResponse({
      events: eventsWithDetails,
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return errorResponse('Failed to fetch calendar events', 500);
  }
}
