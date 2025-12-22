/**
 * Phase 11: Scanning Service Layer
 *
 * Utility functions for QR code scanning operations:
 * - Scan event history retrieval
 * - Asset scan history tracking
 */

import { db } from '@/db'
import { scanEvents } from '@/db/schema/schema'
import { eq } from 'drizzle-orm'

// ============================================================
// Scan History Retrieval
// ============================================================

export async function getOrderScanEvents(orderId: string) {
	const events = await db.query.scanEvents.findMany({
		where: eq(scanEvents.order, orderId),
		with: {
			asset: true,
			scannedByUser: true,
			order: true,
		},
		orderBy: (scanEvents, { desc }) => [desc(scanEvents.scannedAt)],
	})

	return events.map(event => ({
		id: event.id,
		order: event.order,
		asset: event.asset.id,
		scanType: event.scanType,
		quantity: event.quantity,
		condition: event.condition,
		notes: event.notes,
		photos: event.photos,
		discrepancyReason: event.discrepancyReason,
		scannedBy: event.scannedBy,
		scannedAt: event.scannedAt,
		assetDetails: {
			assetId: event.asset.id,
			assetName: event.asset.name,
			qrCode: event.asset.qrCode,
			trackingMethod: event.asset.trackingMethod,
		},
		scannedByUser: {
			userId: event.scannedByUser.id,
			name: event.scannedByUser.name,
		},
		orderDetails: {
			orderId: event.order.id,
			orderIdDisplay: event.order.orderId,
		},
	}))
}

export async function getAssetScanHistory(assetId: string) {
	const events = await db.query.scanEvents.findMany({
		where: eq(scanEvents.asset, assetId),
		with: {
			asset: true,
			scannedByUser: true,
			order: true,
		},
		orderBy: (scanEvents, { desc }) => [desc(scanEvents.scannedAt)],
	})

	return events.map(event => ({
		id: event.id,
		order: event.order.id,
		asset: event.asset.id,
		scanType: event.scanType,
		quantity: event.quantity,
		condition: event.condition,
		notes: event.notes,
		photos: event.photos,
		discrepancyReason: event.discrepancyReason,
		scannedBy: event.scannedBy,
		scannedAt: event.scannedAt,
		assetDetails: {
			assetId: event.asset.id,
			assetName: event.asset.name,
			qrCode: event.asset.qrCode,
			trackingMethod: event.asset.trackingMethod,
		},
		scannedByUser: {
			userId: event.scannedByUser.id,
			name: event.scannedByUser.name,
		},
		orderDetails: {
			orderId: event.order.id,
			orderIdDisplay: event.order.orderId,
		},
	}))
}
