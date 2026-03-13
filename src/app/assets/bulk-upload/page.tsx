"use client";

import Link from "next/link";
import { ArrowLeft, Database, FlaskConicalOff, Lock } from "lucide-react";
import { usePlatform } from "@/contexts/platform-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BulkUploadPage() {
    const { platform } = usePlatform();
    const bulkUploadEnabled = platform?.features?.enable_asset_bulk_upload === true;

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b border-border bg-card">
                <div className="mx-auto flex max-w-5xl items-center gap-4 px-8 py-6">
                    <Button variant="ghost" asChild className="font-mono">
                        <Link href="/assets">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            BACK TO ASSETS
                        </Link>
                    </Button>
                    <div className="h-8 w-px bg-border" />
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                            <Database className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="font-mono text-2xl font-bold uppercase tracking-tight">
                                BULK ASSET IMPORT
                            </h1>
                            <p className="font-mono text-xs tracking-wider text-muted-foreground">
                                Reserved import surface
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-4xl px-8 py-10">
                <Card className="border-primary/20">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            {bulkUploadEnabled ? (
                                <FlaskConicalOff className="h-5 w-5 text-primary" />
                            ) : (
                                <Lock className="h-5 w-5 text-muted-foreground" />
                            )}
                            <CardTitle>
                                {bulkUploadEnabled ? "Bulk Upload Stubbed" : "Bulk Upload Disabled"}
                            </CardTitle>
                            <Badge variant="outline">
                                {bulkUploadEnabled ? "Feature On" : "Feature Off"}
                            </Badge>
                        </div>
                        <CardDescription>
                            CSV bulk upload is intentionally inactive while the batch and individual
                            asset model is being redesigned from first principles.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground">
                        <p>
                            No legacy CSV parsing, template download, or mass insert flow is active
                            from this screen in the current branch.
                        </p>
                        <p>
                            When the new import workflow is ready, this section will be rebuilt
                            cleanly around the revised asset model.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
