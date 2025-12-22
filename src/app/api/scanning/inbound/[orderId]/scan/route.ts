/**
 * Stateless Inbound Scan API
 * POST /api/scanning/inbound/[orderId]/scan
 *
 * Records inbound scan with condition inspection
 * No sessions needed - writes directly to scan_events table
 */

import { NextRequest, NextResponse } from 'next/server'
import {
	requireAuth,
	errorResponse,
	successResponse,
} from '@/lib/api/auth-middleware'
import { db } from '@/db'
import {
	orders,
	orderItems,
	scanEvents,
	assets,
	assetConditionHistory,
} from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'

interface InboundScanRequest {
	qrCode: string
	condition: 'GREEN' | 'ORANGE' | 'RED'
	notes?: string
	photos?: string[]
	refurbDaysEstimate?: number // Feedback #2: Refurb estimate for ORANGE/RED
	discrepancyReason?: 'BROKEN' | 'LOST' | 'OTHER'
	quantity?: number // For BATCH assets
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ orderId: string }> }
) {
	const { orderId } = await params

	try {
		// Require authentication
		const authResult = await requireAuth()
		if (authResult instanceof Response) return authResult
		const { user } = authResult

		// Get request body
		const body: InboundScanRequest = await request.json()
		const {
			qrCode,
			condition,
			notes,
			photos,
			refurbDaysEstimate,
			discrepancyReason,
			quantity,
		} = body

		if (!qrCode || !condition) {
			return errorResponse('qrCode and condition are required', 400)
		}

		// Get order with items
		const order = await db.query.orders.findFirst({
			where: eq(orders.id, orderId),
			with: {
				company: true,
				items: {
					with: {
						asset: true,
					},
				},
			},
		})

		if (!order) {
			return errorResponse('Order not found', 404)
		}

		// Check company access
		const hasAccess =
			user.companies.includes('*') ||
			user.companies.includes(order.company.id)

		if (!hasAccess) {
			return errorResponse('You do not have access to this order', 403)
		}

		// Find asset by QR code
		const asset = await db.query.assets.findFirst({
			where: eq(assets.qrCode, qrCode),
		})

		if (!asset) {
			return errorResponse('Asset not found with this QR code', 404)
		}

		// Check if asset is in this order
		// When using 'with: { asset: true }', item.asset becomes the full asset object
		const orderItem = order.items.find(item => {
			const itemAsset: any = item.asset
			return itemAsset.id === asset.id
		})

		if (!orderItem) {
			console.log('❌ Asset not found in order items')
			console.log('Asset ID:', asset.id)
			console.log(
				'Order items:',
				order.items.map(i => {
					const itemAsset: any = i.asset
					return {
						assetId: itemAsset.id,
						name: i.assetName,
					}
				})
			)
			return errorResponse('Asset not in this order', 400)
		}

		// Determine quantity to scan
		let scanQuantity = 1
		if (asset.trackingMethod === 'BATCH') {
			if (!quantity || quantity < 1) {
				return errorResponse('Quantity required for BATCH assets', 400)
			}
			scanQuantity = quantity
		}

		// Get existing inbound scans for this asset
		const existingScans = await db.query.scanEvents.findMany({
			where: and(
				eq(scanEvents.order, orderId),
				eq(scanEvents.asset, asset.id),
				eq(scanEvents.scanType, 'INBOUND')
			),
		})

		const alreadyScanned = existingScans.reduce(
			(sum, scan) => sum + scan.quantity,
			0
		)

		// Validate not over-scanning
		if (alreadyScanned + scanQuantity > orderItem.quantity) {
			return errorResponse(
				`Cannot scan ${scanQuantity} units. Already scanned: ${alreadyScanned}, Required: ${orderItem.quantity}`,
				400
			)
		}

		// Create scan event
		await db.insert(scanEvents).values({
			order: orderId,
			asset: asset.id,
			scanType: 'INBOUND',
			quantity: scanQuantity,
			condition,
			notes: notes || null,
			photos: photos || [],
			discrepancyReason: discrepancyReason || null,
			scannedBy: user.id,
		})

		// Update asset condition if changed
		if (asset.condition !== condition) {
			// Feedback #2: Update refurb estimate, clear if GREEN
			const updateData: any = {
				condition,
				lastScannedAt: new Date(),
				lastScannedBy: user.id,
			}

			if (condition === 'GREEN') {
				updateData.refurbDaysEstimate = null // Clear refurb when fixed
			} else if (refurbDaysEstimate) {
				updateData.refurbDaysEstimate = refurbDaysEstimate
			}

			await db
				.update(assets)
				.set(updateData)
				.where(eq(assets.id, asset.id))

			// Create condition history entry
			await db.insert(assetConditionHistory).values({
				asset: asset.id,
				condition,
				notes: notes || null,
				photos: photos || [],
				updatedBy: user.id,
			})
		} else {
			// Just update last scanned info
			await db
				.update(assets)
				.set({
					lastScannedAt: new Date(),
					lastScannedBy: user.id,
				})
				.where(eq(assets.id, asset.id))
		}

		// Feedback #2: Items stay AVAILABLE regardless of condition
		// Status is independent of condition - clients make informed choices
		let newStatus: 'AVAILABLE' | 'IN_MAINTENANCE' = 'AVAILABLE'

		// Feedback #2: Update asset quantities (move from OUT back to AVAILABLE)
		// All items go to AVAILABLE regardless of condition
		await db
			.update(assets)
			.set({
				outQuantity: sql`GREATEST(0, ${assets.outQuantity} - ${scanQuantity})`,
				availableQuantity: sql`${assets.availableQuantity} + ${scanQuantity}`,
				status: newStatus,
			})
			.where(eq(assets.id, asset.id))

		// Get updated asset
		const updatedAsset = await db.query.assets.findFirst({
			where: eq(assets.id, asset.id),
		})

		// Calculate new progress
		const allInboundScans = await db.query.scanEvents.findMany({
			where: and(
				eq(scanEvents.order, orderId),
				eq(scanEvents.scanType, 'INBOUND')
			),
		})

		const totalScanned = allInboundScans.reduce(
			(sum, scan) => sum + scan.quantity,
			0
		)
		const totalRequired = order.items.reduce(
			(sum, item) => sum + item.quantity,
			0
		)
		const percentComplete = Math.round((totalScanned / totalRequired) * 100)

		return successResponse({
			message: 'Item scanned in successfully',
			asset: updatedAsset,
			progress: {
				itemsScanned: totalScanned,
				totalItems: totalRequired,
				percentComplete,
			},
		})
	} catch (error: any) {
		console.error('Error scanning inbound item:', error)
		return errorResponse(error.message || 'Failed to scan item', 500)
	}
}
