/**
 * Phase 7: Job Number Update API Route
 * PATCH /api/orders/:id/job-number - Update job number (PMG Admin only)
 */

import { NextRequest } from 'next/server';
import { requirePermission, successResponse, errorResponse } from '@/lib/api/auth-middleware';
import { updateJobNumber } from '@/lib/services/order-service';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	try {
		const params = await context.params;
		// Require authentication and orders:add_job_number permission (PMG Admin only)
		const authResult = await requirePermission('orders:add_job_number');
		if (authResult instanceof Response) return authResult;
		const { user } = authResult;

		// Parse request body
		const body = await request.json();
		const { jobNumber } = body;

		// Validate request
		if (jobNumber !== null && typeof jobNumber !== 'string') {
			return errorResponse('Job number must be a string or null', 400);
		}

		// Update job number
		await updateJobNumber(params.id, jobNumber, user);

		return successResponse(
			{
				id: params.id,
				jobNumber,
				message: 'Job number updated successfully',
			},
			200
		);
	} catch (error) {
		console.error('Error updating job number:', error);
		const message = error instanceof Error ? error.message : 'Failed to update job number';
		const statusCode = message.includes('not found') ? 404 : message.includes('denied') ? 403 : 500;
		return errorResponse(message, statusCode);
	}
}
