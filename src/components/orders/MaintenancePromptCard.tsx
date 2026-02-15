"use client";

import { AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type MaintenancePromptCardProps = {
    damagedItemCount: number;
    canManage: boolean;
    onAddCustomLine: () => void;
};

export function MaintenancePromptCard({
    damagedItemCount,
    canManage,
    onAddCustomLine,
}: MaintenancePromptCardProps) {
    if (damagedItemCount <= 0) return null;

    return (
        <Card className="border-amber-500/40 bg-amber-500/10">
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-amber-700">
                                Maintenance pricing reminder
                            </p>
                            <p className="text-xs text-amber-700/90">
                                {damagedItemCount} damaged item(s) in this order. Add a custom
                                maintenance line if maintenance labor/cost should be included.
                            </p>
                            <p className="text-xs text-amber-700/90">
                                This is strongly recommended but not required to continue.
                            </p>
                        </div>
                    </div>

                    {canManage && (
                        <Button size="sm" variant="outline" onClick={onAddCustomLine}>
                            <Plus className="h-3 w-3 mr-1" />
                            Add Maintenance Line
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
