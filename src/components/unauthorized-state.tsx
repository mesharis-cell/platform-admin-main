/**
 * Unauthorized Access State Component
 *
 * Clear visual indicator when user lacks permission to access a resource.
 * Distinct from empty state with security-focused messaging and red accents.
 */

import { ShieldX, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface UnauthorizedStateProps {
    title?: string;
    message?: string;
    showBackButton?: boolean;
    backHref?: string;
}

export function UnauthorizedState({
    title = "Access Denied",
    message = "You do not have permission to access this resource. Contact your administrator if you believe this is an error.",
    showBackButton = true,
    backHref = "/admin/orders",
}: UnauthorizedStateProps) {
    return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
            <div className="max-w-md w-full">
                {/* Security Alert Card */}
                <div className="relative bg-destructive/5 border-2 border-destructive/20 rounded-xl p-8 overflow-hidden">
                    {/* Warning pattern background */}
                    <div
                        className="absolute inset-0 opacity-[0.03]"
                        style={{
                            backgroundImage: `
								repeating-linear-gradient(
									45deg,
									hsl(var(--destructive)),
									hsl(var(--destructive)) 10px,
									transparent 10px,
									transparent 20px
								)
							`,
                        }}
                    />

                    {/* Content */}
                    <div className="relative z-10 space-y-6 text-center">
                        {/* Icon with pulsing alert */}
                        <div className="relative inline-block">
                            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto border-2 border-destructive/30">
                                <ShieldX className="h-10 w-10 text-destructive" strokeWidth={2} />
                            </div>
                            <div className="absolute inset-0 rounded-full border-2 border-destructive/40 animate-ping" />
                        </div>

                        {/* Warning header */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2 text-destructive">
                                <Lock className="h-4 w-4" />
                                <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                                    Unauthorized Access
                                </span>
                            </div>
                            <h2 className="text-2xl font-mono font-bold text-foreground uppercase tracking-tight">
                                {title}
                            </h2>
                        </div>

                        {/* Message */}
                        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>

                        {/* Alert notice */}
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                                <div className="text-left text-xs text-muted-foreground">
                                    <p className="font-semibold text-foreground mb-1">
                                        Security Notice
                                    </p>
                                    <p>
                                        This action has been logged. Repeated unauthorized access
                                        attempts may result in account suspension.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        {showBackButton && (
                            <Link href={backHref}>
                                <Button variant="outline" className="w-full font-mono text-sm">
                                    Return to Dashboard
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Technical footer */}
                <div className="mt-4 text-center">
                    <p className="text-xs font-mono text-muted-foreground/60 tracking-wider uppercase">
                        Error Code: 403 • Access Forbidden
                    </p>
                </div>
            </div>
        </div>
    );
}
