"use client";

import { motion } from "framer-motion";
import { DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface RequestPricingCardProps {
  finalTotal: string;
}

export function RequestPricingCard({ finalTotal }: RequestPricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mb-6"
    >
      <Card className="bg-card/50 backdrop-blur-sm border-border/40 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">
                  Estimated Total Cost
                </p>
                <p className="text-3xl font-bold font-mono text-primary">
                  AED {parseFloat(finalTotal || "0").toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono text-muted-foreground">
                Based on current pricing
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
