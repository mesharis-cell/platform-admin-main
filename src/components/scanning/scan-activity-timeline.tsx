'use client';

/**
 * Scan Activity Timeline Component
 * Phase 11: QR Code Tracking System
 *
 * Displays scanning events for an order in a timeline format
 * Shows outbound and inbound scans with condition data
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrderScanEvents } from '@/hooks/use-scanning';
import {
  PackageCheck,
  PackageOpen,
  ShieldCheck,
  ShieldQuestion,
  ShieldAlert,
  Camera,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

interface ScanActivityTimelineProps {
  orderId: string;
}

export function ScanActivityTimeline({ orderId }: ScanActivityTimelineProps) {
  const { data: scanData, isLoading } = useOrderScanEvents(orderId);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground font-mono">Loading scan activity...</div>
      </Card>
    );
  }

  if (!scanData || scanData.scanEvents.length === 0) {
    return (
      <Card className="p-6 text-center">
        <div className="text-sm text-muted-foreground font-mono">No scanning activity yet</div>
      </Card>
    );
  }

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'GREEN':
        return <ShieldCheck className="w-5 h-5 text-green-600" />;
      case 'ORANGE':
        return <ShieldQuestion className="w-5 h-5 text-amber-600" />;
      case 'RED':
        return <ShieldAlert className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getConditionBadge = (condition: string) => {
    const variants = {
      GREEN: 'bg-green-600/10 text-green-600 border-green-600/30',
      ORANGE: 'bg-amber-600/10 text-amber-600 border-amber-600/30',
      RED: 'bg-red-600/10 text-red-600 border-red-600/30',
    };
    return variants[condition as keyof typeof variants] || '';
  };

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <PackageCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono">
                {scanData.scanEvents.filter((e) => e.scanType === 'OUTBOUND').length}
              </div>
              <div className="text-xs text-muted-foreground font-mono">Outbound Scans</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <PackageOpen className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono">
                {scanData.scanEvents.filter((e) => e.scanType === 'INBOUND').length}
              </div>
              <div className="text-xs text-muted-foreground font-mono">Inbound Scans</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Timeline */}
      <Card className="p-6">
        <h3 className="text-sm font-bold font-mono mb-4 text-muted-foreground">
          SCAN TIMELINE
        </h3>
        <div className="space-y-4">
          {scanData.scanEvents.map((event, idx) => (
            <div key={event.id} className="relative pl-8 pb-4 border-l-2 border-border last:border-l-0 last:pb-0">
              {/* Timeline dot */}
              <div className="absolute left-0 top-1 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-4 border-background" />

              {/* Event content */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={
                          event.scanType === 'OUTBOUND'
                            ? 'border-primary/30 text-primary'
                            : 'border-secondary/30 text-secondary'
                        }
                      >
                        {event.scanType}
                      </Badge>
                      <Badge variant="outline" className={getConditionBadge(event.condition)}>
                        {getConditionIcon(event.condition)}
                        {event.condition}
                      </Badge>
                    </div>
                    <div className="font-mono text-sm font-bold">
                      {event.assetDetails.assetName}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      QR: {event.assetDetails.qrCode} • Qty: {event.quantity} •{' '}
                      {event.assetDetails.trackingMethod}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="text-muted-foreground font-mono">
                      {format(new Date(event.scannedAt), 'MMM d, HH:mm')}
                    </div>
                    <div className="text-muted-foreground">by {event.scannedByUser.name}</div>
                  </div>
                </div>

                {/* Notes */}
                {event.notes && (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {event.notes}
                  </div>
                )}

                {/* Discrepancy */}
                {event.discrepancyReason && (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-mono font-bold">
                      Discrepancy: {event.discrepancyReason}
                    </span>
                  </div>
                )}

                {/* Photos */}
                {event.photos.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                      <Camera className="w-4 h-4" />
                      {event.photos.length} photo(s)
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {event.photos.map((photo, photoIdx) => (
                        <div
                          key={photoIdx}
                          className="aspect-square bg-muted rounded-lg overflow-hidden border border-border"
                        >
                          <img
                            src={photo}
                            alt={`Scan photo ${photoIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
