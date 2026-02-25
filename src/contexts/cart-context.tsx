"use client";

/**
 * Cart Context Provider (LocalStorage-Only)
 * Pure frontend cart management without backend draft orders
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
    useCallback,
    ReactNode,
} from "react";
import {
    saveCart,
    loadCart,
    clearCart as clearLocalCart,
    type LocalCartItem,
} from "@/lib/cart/localStorage";
import { toast } from "sonner";

interface CartContextType {
    items: LocalCartItem[];
    itemCount: number;
    totalVolume: number;
    totalWeight: number;
    isOpen: boolean;
    isLoading: boolean;
    isInitialized: boolean;
    openCart: () => void;
    closeCart: () => void;
    toggleCart: () => void;
    addItem: (assetId: string, quantity: number, assetDetails: Partial<LocalCartItem>) => void;
    removeItem: (assetId: string) => void;
    updateQuantity: (assetId: string, quantity: number) => void;
    clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<LocalCartItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [addingItems, setAddingItems] = useState<Set<string>>(new Set());

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedItems = loadCart();
        setItems(savedItems);
        setIsInitialized(true);
    }, []);

    // Save to localStorage whenever items change (skip on initial mount)
    useEffect(() => {
        if (!isInitialized) return;

        if (items.length > 0) {
            saveCart(items);
        } else {
            clearLocalCart();
        }
    }, [items, isInitialized]);

    // Cross-tab synchronization
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "asset-cart-v1" && e.newValue) {
                try {
                    const cart = JSON.parse(e.newValue);
                    setItems(cart.items);
                    toast.info("Cart updated from another tab");
                } catch (error) {
                    console.error("Failed to sync cart:", error);
                }
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    // Calculate totals
    const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
    const totalVolume = useMemo(
        () => items.reduce((sum, item) => sum + item.volume * item.quantity, 0),
        [items]
    );
    const totalWeight = useMemo(
        () => items.reduce((sum, item) => sum + item.weight * item.quantity, 0),
        [items]
    );

    const openCart = useCallback(() => setIsOpen(true), []);
    const closeCart = useCallback(() => setIsOpen(false), []);
    const toggleCart = useCallback(() => setIsOpen((prev) => !prev), []);

    // Add item with race condition prevention using functional state updates
    const addItem = useCallback(
        (assetId: string, quantity: number, assetDetails: Partial<LocalCartItem>) => {
            // Prevent duplicate adds
            if (addingItems.has(assetId)) {
                return;
            }

            setAddingItems((prev) => new Set(prev).add(assetId));
            setIsLoading(true);

            try {
                setItems((currentItems) => {
                    const existingIndex = currentItems.findIndex((i) => i.assetId === assetId);
                    let newItems: LocalCartItem[];

                    if (existingIndex >= 0) {
                        // Merge quantities
                        const existing = currentItems[existingIndex];
                        const newQuantity = existing.quantity + quantity;

                        // Validate against available quantity
                        if (newQuantity > existing.availableQuantity) {
                            toast.error(`Only ${existing.availableQuantity} available`, {
                                description: existing.assetName,
                            });
                            return currentItems; // Return unchanged items
                        }

                        newItems = [...currentItems];
                        newItems[existingIndex] = {
                            ...existing,
                            quantity: newQuantity,
                        };
                        toast.success("Cart updated", {
                            description: `Quantity increased to ${newQuantity}`,
                        });
                    } else {
                        // Add new item
                        if (quantity > (assetDetails.availableQuantity || 0)) {
                            toast.error(`Only ${assetDetails.availableQuantity} available`, {
                                description: assetDetails.assetName,
                            });
                            return currentItems; // Return unchanged items
                        }

                        const newItem: LocalCartItem = {
                            assetId,
                            quantity,
                            assetName: assetDetails.assetName || "",
                            availableQuantity: assetDetails.availableQuantity || 0,
                            volume: assetDetails.volume || 0,
                            weight: assetDetails.weight || 0,
                            dimensionLength: assetDetails.dimensionLength || 0,
                            dimensionWidth: assetDetails.dimensionWidth || 0,
                            dimensionHeight: assetDetails.dimensionHeight || 0,
                            category: assetDetails.category || "",
                            image: assetDetails.image,
                            fromCollection: assetDetails.fromCollection,
                            fromCollectionName: assetDetails.fromCollectionName,
                            addedAt: Date.now(),
                        };

                        newItems = [...currentItems, newItem];
                        toast.success("Added to cart", {
                            description: assetDetails.assetName,
                        });
                    }

                    // Save immediately with the new items
                    saveCart(newItems);
                    return newItems;
                });

                openCart();
            } catch (error) {
                console.error("Failed to add item:", error);
                toast.error("Failed to add item to cart");
            } finally {
                setIsLoading(false);
                setAddingItems((prev) => {
                    const next = new Set(prev);
                    next.delete(assetId);
                    return next;
                });
            }
        },
        [addingItems, openCart]
    );

    const removeItem = useCallback(
        (assetId: string) => {
            const item = items.find((i) => i.assetId === assetId);
            const newItems = items.filter((i) => i.assetId !== assetId);
            setItems(newItems);
            saveCart(newItems); // Save immediately
            toast.success("Item removed from cart", {
                description: item?.assetName,
            });
        },
        [items]
    );

    const updateQuantity = useCallback(
        (assetId: string, quantity: number) => {
            if (quantity < 1) {
                removeItem(assetId);
                return;
            }

            const item = items.find((i) => i.assetId === assetId);
            if (!item) return;

            // Validate against available quantity
            if (quantity > item.availableQuantity) {
                toast.error(`Only ${item.availableQuantity} available`, {
                    description: item.assetName,
                });
                return;
            }

            const newItems = items.map((i) => (i.assetId === assetId ? { ...i, quantity } : i));
            setItems(newItems);
            saveCart(newItems); // Save immediately
        },
        [items, removeItem]
    );

    const clearCart = useCallback(() => {
        setItems([]);
        clearLocalCart();
        toast.success("Cart cleared");
    }, []);

    return (
        <CartContext.Provider
            value={{
                items,
                itemCount,
                totalVolume,
                totalWeight,
                isOpen,
                isLoading,
                isInitialized,
                openCart,
                closeCart,
                toggleCart,
                addItem,
                removeItem,
                updateQuantity,
                clearCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within CartProvider");
    }
    return context;
}
