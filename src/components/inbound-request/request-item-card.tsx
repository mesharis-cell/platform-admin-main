"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ChevronLeft,
  ChevronRight,
  Ruler,
  Scale,
  Box,
  Layers,
  Tag,
} from "lucide-react";
import type { InboundRequestItem } from "@/types/inbound-request";

interface RequestItemCardProps {
  item: InboundRequestItem;
  index: number;
}

export function RequestItemCard({ item, index }: RequestItemCardProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const hasImages = item.images && item.images.length > 0;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/40 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row h-full">
          {/* Image Section - Compact */}
          <div className="relative w-full sm:w-24 h-24 sm:h-auto bg-muted shrink-0">
            {hasImages ? (
              <>
                <Image
                  src={item.images[selectedImageIndex]}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
                {item.images.length > 1 && (
                  <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                    1/{item.images.length}
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Package className="h-8 w-8 text-muted-foreground/20" />
              </div>
            )}
            {/* Item Number Badge */}
            <div className="absolute top-1 left-1 bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-mono shadow-sm">
              #{index + 1}
            </div>
          </div>

          {/* Details Section - Compact */}
          <div className="flex-1 p-3 sm:p-4 min-w-0 flex flex-col justify-center">
            {/* Header Line */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <h3 className="text-base font-bold truncate pr-2 leading-tight">{item.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground font-mono">{item.category}</span>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <span className={`text-[10px] font-mono ${item.tracking_method === "INDIVIDUAL" ? "text-blue-500" : "text-purple-500"}`}>
                    {item.tracking_method}
                  </span>
                </div>
              </div>
            </div>

            {/* Description - Truncate */}
            {item.description && (
              <p className="text-xs text-muted-foreground truncate mb-2 max-w-lg">
                {item.description}
              </p>
            )}

            {/* Compact Specs Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 text-xs font-mono text-muted-foreground border-t border-border/40 pt-2 mt-auto">
              <div>
                <span className="block text-[10px] text-muted-foreground/70 uppercase">Qty</span>
                <span className="font-semibold text-foreground">{item.quantity}</span>
              </div>
              <div>
                <span className="block text-[10px] text-muted-foreground/70 uppercase">Wgt</span>
                <span className="font-semibold text-foreground">{item.weight_per_unit}kg</span>
              </div>
              <div>
                <span className="block text-[10px] text-muted-foreground/70 uppercase">Vol</span>
                <span className="font-semibold text-foreground">{item.volume_per_unit}m³</span>
              </div>
              <div className="col-span-2 sm:col-span-3 flex gap-2">
                <div>
                  <span className="block text-[10px] text-muted-foreground/70 uppercase">Dim (L×W×H)</span>
                  <span className="font-semibold text-foreground">
                    {item.dimensions.length}×{item.dimensions.width}×{item.dimensions.height}
                  </span>
                </div>
              </div>
            </div>

            {/* Handling Tags - Inline */}
            {item.handling_tags && item.handling_tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.handling_tags.map(tag => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-muted/50 rounded border border-border/50 text-muted-foreground font-mono">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
