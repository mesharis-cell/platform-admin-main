"use client";

import { motion } from "framer-motion";
import { Package } from "lucide-react";
import { RequestItemCard } from "./request-item-card";
import type { InboundRequestItem } from "@/types/inbound-request";

interface RequestItemsListProps {
  items: InboundRequestItem[];
}

export function RequestItemsList({ items }: RequestItemsListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Package className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold font-mono uppercase tracking-wide">
          Items ({items.length})
        </h2>
      </div>

      {/* Items */}
      <div className="space-y-4">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
          >
            <RequestItemCard item={item} index={index} />
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-mono">No items in this request</p>
        </div>
      )}
    </motion.div>
  );
}
