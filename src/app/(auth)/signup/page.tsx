"use client";

import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";

export default function SignupPage() {
	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-4">
			<div className="max-w-md w-full space-y-8 text-center">
				<div className="flex items-center justify-center gap-3 mb-8">
					<div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
						<Package className="h-6 w-6 text-primary" strokeWidth={2.5} />
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-tight font-mono uppercase">
							PMG Platform
						</h1>
						<p className="text-xs text-muted-foreground font-mono tracking-wider">
							Asset Fulfillment System
						</p>
					</div>
				</div>
				<div className="bg-card border border-border rounded-2xl p-8">
					<h2 className="text-2xl font-bold font-mono uppercase mb-4">
						Registration Disabled
					</h2>
					<p className="text-muted-foreground font-mono text-sm mb-6">
						User accounts are created by PMG administrators only. Contact your
						system administrator to request access.
					</p>
					<Link
						href="/login"
						className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-mono"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to Login
					</Link>
				</div>
			</div>
		</div>
	);
}
