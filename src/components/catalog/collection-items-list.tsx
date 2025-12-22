'use client';

/**
 * Collection Items List Component
 * Shows all items in a collection with availability status
 */

import { useState } from 'react';
import { useCatalogCollection } from '@/hooks/use-catalog';
import { useCart } from '@/contexts/cart-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Package, Layers, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { CollectionCustomizer } from './collection-customizer';

export function CollectionItemsList({ collectionId }: { collectionId: string }) {
  const { data, isLoading } = useCatalogCollection(collectionId);
  const { addItem, openCart } = useCart();
  const [showCustomizer, setShowCustomizer] = useState(false);

  const collection = data?.collection;

  const handleAddSelectedItems = (
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
  ) => {
    selectedItems.forEach((item) => {
      addItem(item.assetId, item.quantity, {
        assetName: item.assetName,
        availableQuantity: item.availableQuantity,
        volume: item.volume,
        weight: item.weight,
        dimensionLength: item.dimensionLength,
        dimensionWidth: item.dimensionWidth,
        dimensionHeight: item.dimensionHeight,
        category: item.category,
        image: item.image,
        fromCollection: collectionId,
        fromCollectionName: collection?.name,
      });
    });

    toast.success(`Added ${selectedItems.length} items from ${collection?.name}`);
    openCart();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 p-3">
            <Skeleton className="w-16 h-16 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!collection) return null;

  const allAvailable = collection.items.every(item => item.isAvailable);

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className={`${allAvailable ? 'bg-primary/10 border-primary/20' : 'bg-amber-500/10 border-amber-500/20'} border rounded-lg p-4 flex items-start gap-3`}>
        {allAvailable ? (
          <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          {allAvailable ? (
            <>
              <p className="text-sm font-semibold text-primary mb-1">All items available</p>
              <p className="text-xs text-muted-foreground">
                This collection is fully in stock. You can order the complete collection or customize your selection.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-500 mb-1">Some items unavailable</p>
              <p className="text-xs text-muted-foreground">
                Not all items are currently available. You can still proceed - only available items will be added to your cart. You can also customize your selection.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {collection.items.map((item) => (
          <div
            key={item.id}
            className={`flex gap-4 p-4 border-2 rounded-lg transition-all ${
              item.isAvailable
                ? 'border-border bg-card hover:border-primary/30'
                : 'border-destructive/30 bg-destructive/5'
            }`}
          >
            {/* Thumbnail */}
            <div className="w-20 h-20 rounded-md overflow-hidden border border-border flex-shrink-0 bg-muted">
              {item.images?.[0] ? (
                <Image
                  src={item.images[0]}
                  alt={item.name}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-base mb-1">{item.name}</h4>
                  <Badge variant="outline" className="font-mono text-xs">
                    {item.category}
                  </Badge>
                </div>
                <Badge
                  variant={item.isAvailable ? 'default' : 'destructive'}
                  className="font-mono text-xs flex-shrink-0"
                >
                  {item.isAvailable ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Available
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" />
                      Unavailable
                    </>
                  )}
                </Badge>
              </div>

              {/* Specs Grid */}
              <div className="space-y-2">
                {/* Stock Info */}
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Qty:</span>
                    <span className="font-bold">{item.defaultQuantity}</span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="font-bold">{item.availableQuantity}</span>
                  </div>
                </div>

                {/* Dimensions Grid */}
                <div className="grid grid-cols-5 gap-1.5 max-w-sm">
                  <div className="text-center p-1.5 bg-muted/50 rounded border border-border/30">
                    <div className="text-[9px] text-muted-foreground uppercase font-mono">L</div>
                    <div className="font-bold font-mono text-xs">{Number(item.dimensionLength).toFixed(0)}</div>
                    <div className="text-[8px] text-muted-foreground">cm</div>
                  </div>
                  <div className="text-center p-1.5 bg-muted/50 rounded border border-border/30">
                    <div className="text-[9px] text-muted-foreground uppercase font-mono">W</div>
                    <div className="font-bold font-mono text-xs">{Number(item.dimensionWidth).toFixed(0)}</div>
                    <div className="text-[8px] text-muted-foreground">cm</div>
                  </div>
                  <div className="text-center p-1.5 bg-muted/50 rounded border border-border/30">
                    <div className="text-[9px] text-muted-foreground uppercase font-mono">H</div>
                    <div className="font-bold font-mono text-xs">{Number(item.dimensionHeight).toFixed(0)}</div>
                    <div className="text-[8px] text-muted-foreground">cm</div>
                  </div>
                  <div className="text-center p-1.5 bg-primary/10 rounded border border-primary/20">
                    <div className="text-[9px] text-muted-foreground uppercase font-mono">WT</div>
                    <div className="font-bold font-mono text-xs text-primary">{Number(item.weight).toFixed(1)}</div>
                    <div className="text-[8px] text-primary/70">kg</div>
                  </div>
                  <div className="text-center p-1.5 bg-secondary/10 rounded border border-secondary/20">
                    <div className="text-[9px] text-muted-foreground uppercase font-mono">VOL</div>
                    <div className="font-bold font-mono text-xs text-secondary">{Number(item.volume).toFixed(2)}</div>
                    <div className="text-[8px] text-secondary/70">m³</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Collection Totals */}
      <div className="pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">Total Items</p>
            <p className="text-2xl font-bold font-mono">{collection.items.length}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">Total Volume</p>
            <p className="text-2xl font-bold font-mono text-primary">{Number(collection.totalVolume).toFixed(2)} m³</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">Total Weight</p>
            <p className="text-2xl font-bold font-mono">{Number(collection.totalWeight).toFixed(1)} kg</p>
          </div>
        </div>
      </div>

      {/* Add Collection Button */}
      <Button
        onClick={() => setShowCustomizer(true)}
        className="w-full gap-2 font-mono uppercase tracking-wide h-12"
        size="lg"
      >
        <Layers className="w-5 h-5" />
        Customize Collection
      </Button>

      {!allAvailable && (
        <p className="text-xs text-center text-muted-foreground font-mono">
          Some items are unavailable. You can still customize and add available items.
        </p>
      )}

      {/* Customizer Dialog */}
      <Dialog open={showCustomizer} onOpenChange={setShowCustomizer}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          {collection && <CollectionCustomizer collection={collection} onAddToCart={handleAddSelectedItems} onClose={() => setShowCustomizer(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
