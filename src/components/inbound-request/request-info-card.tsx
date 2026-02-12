"use client";

import { motion } from "framer-motion";
import { Building2, User, Calendar, DollarSign, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface RequestInfoCardProps {
    company: {
        id: string;
        name: string;
    };
    requester: {
        id: string;
        name: string;
        email: string;
    };
    incomingAt: string;
    note: string | null;
    createdAt: string;
    updatedAt: string;
}

export function RequestInfoCard({
    company,
    requester,
    incomingAt,
    note,
    createdAt,
    updatedAt,
}: RequestInfoCardProps) {
    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    function formatDateTime(dateString: string) {
        return new Date(dateString).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
        >
            <Card className="bg-card/50 backdrop-blur-sm border-border/40">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-mono text-lg uppercase tracking-wide">
                        <FileText className="w-5 h-5 text-primary" />
                        Request Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Company */}
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
                                Company
                            </p>
                            <p className="font-semibold">{company.name}</p>
                        </div>
                    </div>

                    {/* Requester */}
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
                                Requester
                            </p>
                            <p className="font-semibold">{requester.name}</p>
                            <p className="text-sm text-muted-foreground">{requester.email}</p>
                        </div>
                    </div>

                    {/* Expected Arrival */}
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
                                Expected Arrival
                            </p>
                            <p className="font-semibold">{formatDate(incomingAt)}</p>
                        </div>
                    </div>

                    <Separator />

                    {/* Note */}
                    {note && (
                        <>
                            <Separator />
                            <div>
                                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-2">
                                    Notes
                                </p>
                                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                                    {note}
                                </p>
                            </div>
                        </>
                    )}

                    {/* Timestamps */}
                    <div className="flex flex-col gap-4 text-sm">
                        <div>
                            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
                                Created
                            </p>
                            <p className="font-mono text-muted-foreground">
                                {formatDateTime(createdAt)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
                                Last Updated
                            </p>
                            <p className="font-mono text-muted-foreground">
                                {formatDateTime(updatedAt)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
