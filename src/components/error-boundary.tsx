"use client";

/**
 * Error Boundary Component
 * Catches React errors and shows graceful fallback UI
 */

import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error("Error caught by boundary:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center p-8 bg-background">
                    <Card className="max-w-md w-full p-10 text-center border-destructive/20 bg-destructive/5">
                        <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="h-10 w-10 text-destructive" />
                        </div>
                        <h2 className="text-2xl font-bold mb-3">Something went wrong</h2>
                        <p className="text-muted-foreground mb-2 leading-relaxed">
                            {this.state.error?.message || "An unexpected error occurred"}
                        </p>
                        <p className="text-sm text-muted-foreground/70 mb-8 font-mono">
                            Please try refreshing the page or contact support if the issue persists
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button
                                onClick={() => window.location.reload()}
                                className="gap-2 font-mono"
                            >
                                Reload Page
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => (window.location.href = "/client-dashboard")}
                                className="gap-2 font-mono"
                            >
                                Go to Dashboard
                            </Button>
                        </div>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
