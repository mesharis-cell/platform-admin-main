"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommerceRuleAcknowledgements } from "@/hooks/use-commerce-rules";

export function CommerceRuleAcknowledgementsCard({
    entityType,
    entityId,
}: {
    entityType: "ORDER" | "SELF_PICKUP";
    entityId: string | null;
}) {
    const { data, isLoading } = useCommerceRuleAcknowledgements(entityType, entityId);
    const rows = data?.data || [];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Cart Rule Warnings ({rows.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {isLoading && <Skeleton className="h-16 w-full" />}
                {!isLoading && rows.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        No cart rule warnings were recorded for this record.
                    </p>
                )}
                {rows.map((row) => (
                    <div
                        key={row.id}
                        className="rounded-md border border-border/60 bg-muted/10 p-3"
                    >
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">{row.rule_name}</p>
                            <Badge variant="outline" className="font-mono text-[10px]">
                                {row.rule_type}
                            </Badge>
                            <Badge variant={row.acknowledged ? "default" : "secondary"}>
                                {row.acknowledged ? "Acknowledged" : "Seen"}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{row.message}</p>
                        <p className="mt-2 text-xs font-mono text-muted-foreground">
                            {new Date(row.created_at).toLocaleString()}
                            {row.acknowledged_by_user?.name
                                ? ` · ${row.acknowledged_by_user.name}`
                                : ""}
                        </p>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
