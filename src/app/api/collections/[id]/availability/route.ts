// Phase 4: Collection Availability Check API Route

import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse, requireCompanyAccess } from '@/lib/api/auth-middleware';
import {
	getCollectionById,
	checkCollectionAvailability,
} from '@/lib/services/collection-service';

// GET /api/collections/[id]/availability - Check collection availability for date range
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const authResult = await requirePermission('collections:check_availability');
	if (authResult instanceof Response) return authResult;

	const { user } = authResult;

	try {
		const { id: collectionId } = await params;
		const searchParams = request.nextUrl.searchParams;

		const eventStartDate = searchParams.get('eventStartDate');
		const eventEndDate = searchParams.get('eventEndDate');

		if (!eventStartDate || !eventEndDate) {
			return errorResponse('eventStartDate and eventEndDate are required', 400);
		}

		// Check collection exists and get company
		const collection = await getCollectionById(collectionId);

		if (!collection) {
			return errorResponse('Collection not found', 404);
		}

		// Check company access
		const companyCheck = await requireCompanyAccess(collection.company);
		if (companyCheck instanceof Response) return companyCheck;

		const availability = await checkCollectionAvailability(
			collectionId,
			eventStartDate,
			eventEndDate
		);

		return successResponse(
			{
				collectionId,
				...availability,
			},
			200
		);
	} catch (error) {
		console.error('Error checking collection availability:', error);
		return errorResponse(
			error instanceof Error ? error.message : 'Failed to check collection availability',
			500
		);
	}
}
