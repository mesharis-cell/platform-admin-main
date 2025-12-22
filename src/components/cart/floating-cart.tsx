'use client';

/**
 * Floating Cart Panel
 * Slide-out cart with industrial-luxury aesthetic
 */

import { useCart } from '@/contexts/cart-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Plus, Minus, Trash2, ShoppingCart, Package, ArrowRight, Cuboid } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export function FloatingCart() {
  const {
    items,
    itemCount,
    totalVolume,
    totalWeight,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
  } = useCart();

  const router = useRouter();

  const handleCheckout = () => {
    closeCart();
    router.push('/checkout');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={closeCart}
          />

          {/* Cart Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="border-b border-border bg-muted/30 p-6 relative overflow-hidden">
              {/* Grid pattern */}
              <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
                    linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
                  `,
                  backgroundSize: '24px 24px',
                }}
              />

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-mono font-bold uppercase tracking-tight">Your Cart</h2>
                    <p className="text-[10px] font-mono text-muted-foreground tracking-[0.15em] uppercase">
                      {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeCart}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Stats Bar */}
              {items.length > 0 && (
                <div className="mt-4 flex gap-4 relative z-10">
                  <div className="flex-1 bg-background/50 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] font-mono text-muted-foreground tracking-wide uppercase">
                      Total Volume
                    </p>
                    <p className="text-lg font-mono font-bold text-foreground mt-1">
                      {totalVolume.toFixed(2)} m³
                    </p>
                  </div>
                  <div className="flex-1 bg-background/50 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] font-mono text-muted-foreground tracking-wide uppercase">
                      Total Weight
                    </p>
                    <p className="text-lg font-mono font-bold text-foreground mt-1">
                      {totalWeight.toFixed(1)} kg
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items */}
            <ScrollArea className="flex-1 p-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <ShoppingCart className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Your cart is empty</p>
                  <p className="text-xs text-muted-foreground/70 max-w-xs">
                    Browse the catalog and add assets to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.assetId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 100 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-background rounded-lg border border-border p-4 group hover:border-primary/30 transition-colors"
                    >
                      <div className="flex gap-4">
                        {/* Thumbnail */}
                        <div className="w-20 h-20 rounded-md overflow-hidden border border-border flex-shrink-0 bg-muted">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.assetName}
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
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{item.assetName}</h4>
                              {item.fromCollectionName && (
                                <p className="text-xs text-muted-foreground font-mono">
                                  From: {item.fromCollectionName}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.assetId)}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>

                          {/* Specs */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono mb-3">
                            <span>{item.volume} m³</span>
                            <span className="text-border">•</span>
                            <span>{item.weight} kg</span>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center border border-border rounded-md overflow-hidden">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateQuantity(item.assetId, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="h-7 w-7 p-0 rounded-none border-r border-border hover:bg-muted"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <div className="px-3 font-mono text-sm font-medium min-w-[3ch] text-center">
                                {item.quantity}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateQuantity(item.assetId, item.quantity + 1)}
                                disabled={item.quantity >= item.availableQuantity}
                                className="h-7 w-7 p-0 rounded-none border-l border-border hover:bg-muted"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">
                              of {item.availableQuantity} available
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-border bg-muted/30 p-6 space-y-4">
                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-mono">Total Items</span>
                    <span className="font-mono font-bold">{itemCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-mono">Total Volume</span>
                    <span className="font-mono font-bold">{totalVolume.toFixed(2)} m³</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-mono">Total Weight</span>
                    <span className="font-mono font-bold">{totalWeight.toFixed(1)} kg</span>
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    onClick={handleCheckout}
                    className="w-full gap-2 font-mono uppercase tracking-wide h-12"
                    size="lg"
                  >
                    <Cuboid className="h-4 w-4" />
                    Proceed to Checkout
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={closeCart}
                    className="w-full font-mono text-xs uppercase tracking-wide text-muted-foreground"
                    size="sm"
                  >
                    Continue Browsing
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
