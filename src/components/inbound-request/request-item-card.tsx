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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {/* Image Section */}
          <div className="relative aspect-square md:aspect-auto bg-muted">
            {hasImages ? (
              <>
                <Image
                  src={item.images[selectedImageIndex]}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
                {item.images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setSelectedImageIndex(
                          (selectedImageIndex - 1 + item.images.length) %
                          item.images.length
                        )
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/90 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        setSelectedImageIndex(
                          (selectedImageIndex + 1) % item.images.length
                        )
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/90 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {item.images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-colors ${idx === selectedImageIndex
                            ? "bg-white"
                            : "bg-white/50"
                            }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Package className="h-16 w-16 text-muted-foreground/20" />
              </div>
            )}
            {/* Item Number Badge */}
            <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-mono">
              Item #{index + 1}
            </div>
          </div>

          {/* Details Section */}
          <div className="md:col-span-2 p-6 space-y-4">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="secondary" className="font-mono text-xs">
                  {item.category}
                </Badge>
                <Badge
                  variant="outline"
                  className={`font-mono text-xs ${item.tracking_method === "INDIVIDUAL"
                    ? "border-blue-500/30 text-blue-500"
                    : "border-purple-500/30 text-purple-500"
                    }`}
                >
                  {item.tracking_method}
                </Badge>
              </div>
              <h3 className="text-xl font-bold">{item.name}</h3>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {item.description}
                </p>
              )}
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-muted/30 p-3 rounded-lg">
                <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">
                  <Layers className="w-3 h-3" />
                  Quantity
                </div>
                <p className="text-lg font-bold font-mono">{item.quantity}</p>
              </div>

              <div className="bg-muted/30 p-3 rounded-lg">
                <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">
                  <Scale className="w-3 h-3" />
                  Weight
                </div>
                <p className="text-lg font-bold font-mono">
                  {item.weight_per_unit} kg
                </p>
              </div>

              <div className="bg-muted/30 p-3 rounded-lg">
                <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">
                  <Box className="w-3 h-3" />
                  Volume
                </div>
                <p className="text-lg font-bold font-mono">
                  {item.volume_per_unit} m³
                </p>
              </div>
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-muted/30 p-3 rounded-lg">
                <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">
                  <Ruler className="w-3 h-3" />
                  Length
                </div>
                <p className="text-lg font-bold font-mono">
                  {item.dimensions.length}
                </p>
              </div>

              <div className="bg-muted/30 p-3 rounded-lg">
                <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">
                  <Ruler className="w-3 h-3" />
                  Width
                </div>
                <p className="text-lg font-bold font-mono">
                  {item.dimensions.width}
                </p>
              </div>

              <div className="bg-muted/30 p-3 rounded-lg">
                <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">
                  <Ruler className="w-3 h-3" />
                  Height
                </div>
                <p className="text-lg font-bold font-mono">
                  {item.dimensions.height}
                </p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {item.packaging && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Package className="w-4 h-4" />
                  <span className="font-mono">{item.packaging}</span>
                </div>
              )}
            </div>

            {/* Handling Tags */}
            {item.handling_tags && item.handling_tags.length > 0 && (
              <div>
                <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground uppercase tracking-wide mb-2">
                  <Tag className="w-3 h-3" />
                  Handling Requirements
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.handling_tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="font-mono text-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
