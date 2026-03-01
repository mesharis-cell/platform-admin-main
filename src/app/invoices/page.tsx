"use client";

import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvoicesPage() {
    return (
        <div className="p-8">
            <Card className="max-w-3xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" /> Invoicing Disabled
                    </CardTitle>
                    <CardDescription>
                        Invoicing endpoints and UI are intentionally stubbed in this pre-alpha
                        branch.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    Enable invoicing only after the new invoice domain is implemented and approved.
                </CardContent>
            </Card>
        </div>
    );
}
