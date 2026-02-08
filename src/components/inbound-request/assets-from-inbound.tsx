"use client";

import { motion } from "framer-motion";
import { Package, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { RequestItemCard } from "./request-item-card";
import type { InboundRequestItem } from "@/types/inbound-request";

interface AssetsFromInboundProps {
  items: InboundRequestItem[];
}

export function AssetsFromInbound({ items }: AssetsFromInboundProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-4 mt-8"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold font-mono uppercase tracking-wide">
          Assets created from this request
        </h2>
      </div>

      {/* Items */}
      <div className="grid grid-cols-1 gap-2">
        {items.map((item, index) => {
          if (!item.asset) return null;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >

              <Card className="h-full hover:bg-muted/50 transition-colors border-border/50 overflow-hidden">
                <div className="flex h-full">
                  {/* Image Section */}
                  <div className="w-24 h-24 sm:w-32 sm:h-auto relative bg-muted shrink-0">
                    {item.asset.images?.[0] ? (
                      <img
                        src={item.asset.images[0]}
                        alt={item.asset.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                        <Package className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="p-3 sm:p-4 flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-sm sm:text-base truncate pr-2">
                          {item.asset.name}
                        </h3>
                        <Badge variant="secondary" className="font-mono text-[10px] shrink-0">
                          {item.asset.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
                          {item.asset.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
                          {item.asset.tracking_method}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground font-mono mt-2">
                      <Link
                        href={`/assets/${item.asset_id}`}
                        className="flex items-center gap-1 text-primary hover:underline hover:text-primary/80 transition-colors"
                      >
                        View Details
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                      <div className="text-right">
                        {item.asset.available_quantity} of {item.asset.total_quantity} Available
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
