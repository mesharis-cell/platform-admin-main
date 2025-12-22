'use client';

/**
 * Collection Customizer Dialog
 * Allows users to select specific items and customize quantities from a collection
 */

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Package, Minus, Plus, Layers } from 'lucide-react';
import Image from 'next/image';
import type { CatalogCollectionDetails, CatalogCollectionItemDetail } from '@/types/collection';

interface SelectionState {
	[assetId: string]: {
		selected: boolean;
		quantity: number;
	};
}

interface CollectionCustomizerProps {
	collection: CatalogCollectionDetails;
	onAddToCart: (
		selectedItems: Array<{
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
		}>
	) => void;
	onClose: () => void;
}

export function CollectionCustomizer({ collection, onAddToCart, onClose }: CollectionCustomizerProps) {
	const [selections, setSelections] = useState<SelectionState>({});

	// Initialize selections with default quantities
	useEffect(() => {
		const initial: SelectionState = {};
		collection.items.forEach((item) => {
			initial[item.id] = {
				selected: item.isAvailable,
				quantity: Math.min(item.defaultQuantity, item.availableQuantity),
			};
		});
		setSelections(initial);
	}, [collection]);

	const selectedItems = useMemo(() => {
		return collection.items.filter((item) => selections[item.id]?.selected);
	}, [collection, selections]);

	const totals = useMemo(() => {
		return selectedItems.reduce(
			(acc, item) => {
				const qty = selections[item.id].quantity;
				return {
					items: acc.items + 1,
					units: acc.units + qty,
					volume: acc.volume + parseFloat(item.volume) * qty,
					weight: acc.weight + parseFloat(item.weight) * qty,
				};
			},
			{ items: 0, units: 0, volume: 0, weight: 0 }
		);
	}, [selectedItems, selections]);

	const handleToggle = (itemId: string) => {
		setSelections((prev) => ({
			...prev,
			[itemId]: { ...prev[itemId], selected: !prev[itemId].selected },
		}));
	};

	const handleQuantityChange = (itemId: string, delta: number) => {
		const item = collection.items.find((i) => i.id === itemId);
		if (!item) return;

		setSelections((prev) => {
			const current = prev[itemId].quantity;
			const newQty = Math.max(1, Math.min(current + delta, item.availableQuantity));
			return {
				...prev,
				[itemId]: { ...prev[itemId], quantity: newQty },
			};
		});
	};

	const handleAddToCart = () => {
		if (selectedItems.length === 0) {
			return;
		}

		const itemsToAdd = selectedItems.map((item) => ({
			assetId: item.id,
			assetName: item.name,
			quantity: selections[item.id].quantity,
			availableQuantity: item.availableQuantity,
			volume: parseFloat(item.volume),
			weight: parseFloat(item.weight),
			dimensionLength: parseFloat(item.dimensionLength),
			dimensionWidth: parseFloat(item.dimensionWidth),
			dimensionHeight: parseFloat(item.dimensionHeight),
			category: item.category,
			image: item.images[0],
		}));

		onAddToCart(itemsToAdd);
		onClose();
	};

	return (
		<div className="flex flex-col h-full max-h-[80vh]">
			{/* Header */}
			<div className="border-b border-border p-6">
				<div className="flex items-center gap-3 mb-2">
					<Layers className="h-6 w-6 text-primary" />
					<h3 className="text-2xl font-bold">{collection.name}</h3>
				</div>
				<p className="text-sm text-muted-foreground">Select items and customize quantities before adding to cart</p>
			</div>

			{/* Items List */}
			<ScrollArea className="flex-1 p-6">
				<div className="space-y-3">
					{collection.items.map((item) => {
						const selection = selections[item.id] || { selected: false, quantity: 1 };
						const isSelected = selection.selected;

						return (
							<div
								key={item.id}
								className={`flex gap-4 p-4 border-2 rounded-lg transition-all ${
									isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'
								} ${!item.isAvailable ? 'opacity-50' : ''}`}
							>
								{/* Checkbox */}
								<div className="flex items-center pt-1">
									<Checkbox checked={isSelected} onCheckedChange={() => handleToggle(item.id)} disabled={!item.isAvailable} className="h-5 w-5" />
								</div>

								{/* Thumbnail */}
								<div className="w-16 h-16 rounded-md overflow-hidden border border-border flex-shrink-0 bg-muted">
									{item.images?.[0] ? (
										<Image src={item.images[0]} alt={item.name} width={64} height={64} className="object-cover w-full h-full" />
									) : (
										<div className="w-full h-full flex items-center justify-center">
											<Package className="h-6 w-6 text-muted-foreground/30" />
										</div>
									)}
								</div>

								{/* Details */}
								<div className="flex-1 min-w-0">
									<div className="flex items-start justify-between gap-2 mb-2">
										<div className="flex-1 min-w-0">
											<h4 className="font-medium text-sm truncate">{item.name}</h4>
											<Badge variant="outline" className="text-xs mt-1">
												{item.category}
											</Badge>
										</div>
										<Badge variant={item.isAvailable ? 'default' : 'destructive'} className="text-xs flex-shrink-0">
											{item.isAvailable ? (
												<>
													<CheckCircle className="w-3 h-3 mr-1" />
													{item.availableQuantity} available
												</>
											) : (
												<>
													<XCircle className="w-3 h-3 mr-1" />
													Unavailable
												</>
											)}
										</Badge>
									</div>

									{/* Specs */}
									<div className="flex items-center gap-3 text-xs text-muted-foreground font-mono mb-2">
										<span>
											{Number(item.dimensionLength).toFixed(0)}×{Number(item.dimensionWidth).toFixed(0)}×
											{Number(item.dimensionHeight).toFixed(0)} cm
										</span>
										<span>•</span>
										<span>{Number(item.weight).toFixed(1)} kg</span>
										<span>•</span>
										<span>{Number(item.volume).toFixed(2)} m³</span>
									</div>

									{/* Quantity Controls */}
									{isSelected && (
										<div className="flex items-center gap-2">
											<span className="text-xs text-muted-foreground font-mono">Quantity:</span>
											<div className="flex items-center border border-border rounded-md overflow-hidden">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleQuantityChange(item.id, -1)}
													disabled={selection.quantity <= 1}
													className="h-7 w-7 p-0 rounded-none"
												>
													<Minus className="h-3 w-3" />
												</Button>
												<div className="px-3 font-mono text-sm font-medium min-w-[3ch] text-center">{selection.quantity}</div>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleQuantityChange(item.id, 1)}
													disabled={selection.quantity >= item.availableQuantity}
													className="h-7 w-7 p-0 rounded-none"
												>
													<Plus className="h-3 w-3" />
												</Button>
											</div>
											<span className="text-xs text-muted-foreground font-mono">of {item.availableQuantity} max</span>
										</div>
									)}

									{/* Default Quantity Note */}
									{!isSelected && (
										<p className="text-xs text-muted-foreground font-mono">Default quantity: {item.defaultQuantity}</p>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</ScrollArea>

			{/* Footer with Totals */}
			<div className="border-t border-border bg-muted/30 p-6 space-y-4">
				{/* Totals */}
				<div className="grid grid-cols-4 gap-3">
					<div className="bg-background/50 rounded-lg p-3 border border-border/50">
						<p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">Selected</p>
						<p className="text-lg font-mono font-bold">{totals.items}</p>
						<p className="text-[10px] text-muted-foreground">items</p>
					</div>
					<div className="bg-background/50 rounded-lg p-3 border border-border/50">
						<p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">Total Units</p>
						<p className="text-lg font-mono font-bold">{totals.units}</p>
						<p className="text-[10px] text-muted-foreground">qty</p>
					</div>
					<div className="bg-background/50 rounded-lg p-3 border border-border/50">
						<p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">Volume</p>
						<p className="text-lg font-mono font-bold text-secondary">{totals.volume.toFixed(2)}</p>
						<p className="text-[10px] text-muted-foreground">m³</p>
					</div>
					<div className="bg-background/50 rounded-lg p-3 border border-border/50">
						<p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">Weight</p>
						<p className="text-lg font-mono font-bold text-primary">{totals.weight.toFixed(1)}</p>
						<p className="text-[10px] text-muted-foreground">kg</p>
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-3">
					<Button variant="outline" onClick={onClose} className="flex-1 font-mono">
						Cancel
					</Button>
					<Button onClick={handleAddToCart} disabled={selectedItems.length === 0} className="flex-1 font-mono uppercase tracking-wide">
						Add {totals.items > 0 ? `${totals.items} Items` : 'Items'} to Cart
					</Button>
				</div>
			</div>
		</div>
	);
}
