"use client";

/**
 * Empty State Component
 *
 * Friendly, informative state when no data exists yet.
 * Distinct from unauthorized state with neutral colors and helpful CTAs.
 */

import { LucideIcon, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface EmptyStateProps {
    icon?: LucideIcon;
    title?: string;
    message?: string;
    action?: {
        label: string;
        onClick?: () => void;
        href?: string;
    };
    children?: ReactNode;
}

export function EmptyState({
    icon: Icon = Package,
    title = "No Items Found",
    message = "There are no items to display yet. Get started by creating your first entry.",
    action,
    children,
}: EmptyStateProps) {
    return (
        <div className="min-h-[50vh] flex items-center justify-center p-8">
            <div className="max-w-md w-full">
                {/* Empty state card */}
                <div className="relative bg-card border border-border rounded-xl p-8 overflow-hidden">
                    {/* Subtle dot pattern background */}
                    <div
                        className="absolute inset-0 opacity-[0.02]"
                        style={{
                            backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
                            backgroundSize: "24px 24px",
                        }}
                    />

                    {/* Content */}
                    <div className="relative z-10 space-y-6 text-center">
                        {/* Icon with subtle animation */}
                        <div className="relative inline-block">
                            <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center mx-auto border border-border">
                                <Icon
                                    className="h-10 w-10 text-muted-foreground"
                                    strokeWidth={1.5}
                                />
                            </div>
                            {/* Decorative corner accents */}
                            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-primary/30" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-primary/30" />
                            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-primary/30" />
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-primary/30" />
                        </div>

                        {/* Header */}
                        <div className="space-y-2">
                            <div className="inline-block px-3 py-1 bg-muted rounded-full">
                                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                                    Empty State
                                </span>
                            </div>
                            <h2 className="text-xl font-mono font-bold text-foreground uppercase tracking-tight">
                                {title}
                            </h2>
                        </div>

                        {/* Message */}
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                            {message}
                        </p>

                        {/* Custom content */}
                        {children}

                        {/* Action button */}
                        {action && (
                            <div className="pt-2">
                                {action.href ? (
                                    <a href={action.href}>
                                        <Button className="gap-2 font-mono text-sm uppercase tracking-wide">
                                            <Plus className="h-4 w-4" />
                                            {action.label}
                                        </Button>
                                    </a>
                                ) : (
                                    <Button
                                        onClick={action.onClick}
                                        className="gap-2 font-mono text-sm uppercase tracking-wide"
                                    >
                                        <Plus className="h-4 w-4" />
                                        {action.label}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Helpful hint */}
                <div className="mt-4 text-center">
                    <p className="text-xs font-mono text-muted-foreground/60 tracking-wider">
                        Data will appear here once entries are created
                    </p>
                </div>
            </div>
        </div>
    );
}
