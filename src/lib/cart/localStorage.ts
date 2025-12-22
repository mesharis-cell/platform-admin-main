/**
 * LocalStorage utilities for cart persistence
 * Pure frontend cart management without backend dependencies
 */

import { toast } from 'sonner';

const CART_KEY = 'asset-cart-v1';
const CART_VERSION = 1;

export interface LocalCartItem {
	assetId: string;
	assetName: string;
	quantity: number;
	availableQuantity: number;
	volume: number;
	weight: number;
	dimensionLength: number;
	dimensionWidth: number;
	dimensionHeight: number;
	category: string;
	image?: string;
	fromCollection?: string;
	fromCollectionName?: string;
	addedAt: number;
}

interface LocalCart {
	items: LocalCartItem[];
	version: number;
	lastUpdated: number;
}

/**
 * Save cart to localStorage
 */
export function saveCart(items: LocalCartItem[]): void {
	try {
		const cart: LocalCart = {
			items,
			version: CART_VERSION,
			lastUpdated: Date.now(),
		};
		localStorage.setItem(CART_KEY, JSON.stringify(cart));
	} catch (error) {
		console.error('Failed to save cart:', error);
		if (error instanceof Error && error.name === 'QuotaExceededError') {
			toast.error('Cart storage limit exceeded. Please remove some items.');
		} else {
			toast.error('Failed to save cart');
		}
	}
}

/**
 * Load cart from localStorage with validation
 */
export function loadCart(): LocalCartItem[] {
	try {
		const data = localStorage.getItem(CART_KEY);
		if (!data) return [];

		const cart = JSON.parse(data) as LocalCart;

		// Validate version
		if (cart.version !== CART_VERSION) {
			console.warn('Cart version mismatch, clearing cart');
			clearCart();
			return [];
		}

		// Validate structure
		if (!cart.items || !Array.isArray(cart.items)) {
			throw new Error('Invalid cart structure');
		}

		// Validate each item
		for (const item of cart.items) {
			if (!item.assetId || typeof item.assetId !== 'string') {
				throw new Error('Invalid assetId');
			}
			if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1) {
				throw new Error('Invalid quantity');
			}
			if (!item.assetName) {
				throw new Error('Missing assetName');
			}
		}

		return cart.items;
	} catch (error) {
		console.error('Failed to load cart:', error);
		clearCart();
		toast.error('Cart data corrupted, cart has been cleared');
		return [];
	}
}

/**
 * Clear cart from localStorage
 */
export function clearCart(): void {
	localStorage.removeItem(CART_KEY);
}

/**
 * Get cart item count
 */
export function getCartItemCount(): number {
	const items = loadCart();
	return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Check if asset is in cart
 */
export function isInCart(assetId: string): boolean {
	const items = loadCart();
	return items.some(item => item.assetId === assetId);
}

/**
 * Get item quantity from cart
 */
export function getCartItemQuantity(assetId: string): number {
	const items = loadCart();
	const item = items.find(i => i.assetId === assetId);
	return item?.quantity || 0;
}
