"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw, Mail, Settings, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminHeader } from "@/components/admin-header";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import type { NotificationLog } from "@/types/notifications";

export default function FailedNotificationsPage() {
    const [filter, setFilter] = useState<"all" | "FAILED" | "RETRYING">("all");
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ["failed-notifications", filter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filter !== "all") params.append("status", filter);
            const res = await apiClient.get(`/operations/v1/notification-logs/failed?${params}`);
            return res.data.data as { notifications: NotificationLog[]; total: number };
        },
    });

    const retryMutation = useMutation({
        mutationFn: async (id: string) => {
            try {
                const res = await apiClient.post(`/operations/v1/notification-logs/${id}/retry`);
                return res.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            toast.success("Notification resent");
            queryClient.invalidateQueries({ queryKey: ["failed-notifications"] });
        },
        onError: (err: any) => toast.error(err.message || "Retry failed"),
    });

    const notifications = data?.notifications ?? [];
    const retryingCount = notifications.filter((n) => n.status === "RETRYING").length;

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Mail}
                title="NOTIFICATION CENTER"
                description="Monitor · Retry · Audit"
                stats={data ? { label: "TOTAL FAILED", value: data.total } : undefined}
                actions={
                    <div className="flex items-center gap-2">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as any)}
                            className="border rounded px-3 py-1.5 bg-background font-mono text-xs"
                        >
                            <option value="all">ALL FAILURES</option>
                            <option value="FAILED">FAILED ONLY</option>
                            <option value="RETRYING">RETRYING</option>
                        </select>
                        <Link href="/settings/notifications">
                            <Button variant="outline" size="sm" className="font-mono text-xs gap-1">
                                <Settings className="h-3 w-3" />
                                CONFIGURE RULES
                            </Button>
                        </Link>
                    </div>
                }
            />

            <div className="container mx-auto px-6 py-8">
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <Card className="border-2">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded bg-red-500/10 flex items-center justify-center">
                                    <AlertCircle className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                    <p className="font-mono text-xs text-muted-foreground">
                                        TOTAL FAILED
                                    </p>
                                    <p className="font-mono text-2xl font-bold">
                                        {data?.total ?? 0}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-2">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded bg-yellow-500/10 flex items-center justify-center">
                                    <RefreshCw className="h-5 w-5 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="font-mono text-xs text-muted-foreground">
                                        RETRYING
                                    </p>
                                    <p className="font-mono text-2xl font-bold">{retryingCount}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-2">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded bg-green-500/10 flex items-center justify-center">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="font-mono text-xs text-muted-foreground">
                                        STATUS
                                    </p>
                                    <p className="font-mono text-2xl font-bold">
                                        {data?.total === 0 ? "CLEAN" : "ACTION NEEDED"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-2">
                    <CardHeader>
                        <CardTitle className="font-mono text-sm flex items-center gap-2">
                            <Mail className="h-4 w-4 text-primary" />
                            NOTIFICATION FAILURES
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        ) : !notifications.length ? (
                            <div className="p-12 text-center">
                                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
                                <p className="font-mono text-sm text-muted-foreground">
                                    No failed notifications. All emails delivered successfully.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className="p-4 border-2 rounded bg-card hover:bg-muted/20 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge
                                                        className={`font-mono text-[10px] border ${
                                                            n.status === "FAILED"
                                                                ? "bg-red-500/10 text-red-700 border-red-500/20"
                                                                : "bg-yellow-500/10 text-yellow-700 border-yellow-500/20"
                                                        }`}
                                                    >
                                                        {n.status}
                                                    </Badge>
                                                    <Badge
                                                        variant="outline"
                                                        className="font-mono text-[10px]"
                                                    >
                                                        {n.event?.event_type ?? n.template_key}
                                                    </Badge>
                                                    {n.event?.entity_type && (
                                                        <Badge
                                                            variant="outline"
                                                            className="font-mono text-[10px]"
                                                        >
                                                            {n.event.entity_type}
                                                        </Badge>
                                                    )}
                                                    <span className="font-mono text-[10px] text-muted-foreground">
                                                        ATTEMPTS: {n.attempts}
                                                    </span>
                                                </div>

                                                <div className="font-mono text-xs text-muted-foreground">
                                                    TO: {n.recipient_email}
                                                    {n.recipient_value && (
                                                        <span className="ml-2 opacity-60">
                                                            ({n.recipient_type}: {n.recipient_value}
                                                            )
                                                        </span>
                                                    )}
                                                </div>

                                                {n.subject && (
                                                    <div className="font-mono text-xs text-muted-foreground">
                                                        SUBJECT: {n.subject}
                                                    </div>
                                                )}

                                                {n.error_message && (
                                                    <div className="p-2 bg-red-500/5 border border-red-500/20 rounded">
                                                        <p className="font-mono text-[10px] text-red-700">
                                                            ERROR: {n.error_message}
                                                        </p>
                                                    </div>
                                                )}

                                                <p className="font-mono text-[10px] text-muted-foreground">
                                                    {n.last_attempt_at
                                                        ? `Last attempt: ${new Date(n.last_attempt_at).toLocaleString()}`
                                                        : `Logged: ${new Date(n.created_at).toLocaleString()}`}
                                                </p>
                                            </div>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => retryMutation.mutate(n.id)}
                                                disabled={retryMutation.isPending}
                                                className="font-mono text-xs"
                                            >
                                                <RefreshCw
                                                    className={`h-3 w-3 mr-2 ${retryMutation.isPending ? "animate-spin" : ""}`}
                                                />
                                                RETRY
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
