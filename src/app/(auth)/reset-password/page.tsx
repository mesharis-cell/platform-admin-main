"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Mail, Package, RefreshCcw } from "lucide-react";

export default function ResetPasswordPage() {
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			const response = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to send reset instructions');
			}

			setIsSuccess(true);
			toast.success("Reset Instructions Sent", {
				description: data.message || "Check your email for password reset instructions.",
			});
		} catch (error) {
			toast.error("System Error", {
				description: error instanceof Error ? error.message : "Unable to process reset request.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-background relative overflow-hidden">
			{/* Industrial Grid Background */}
			<div className="absolute inset-0 opacity-[0.03]">
				<div
					className="h-full w-full"
					style={{
						backgroundImage: `
							linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
							linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
						`,
						backgroundSize: "40px 40px",
					}}
				/>
			</div>

			{/* Warehouse Zone Markers */}
			<div className="absolute top-8 left-8 font-mono text-xs text-muted-foreground tracking-wider opacity-40">
				ZONE: RECOVERY-01
			</div>
			<div className="absolute bottom-8 right-8 font-mono text-xs text-muted-foreground tracking-wider opacity-40">
				SEC-LEVEL: PUBLIC
			</div>

			{/* Main Container */}
			<div className="relative z-10 flex min-h-screen items-center justify-center p-4">
				<div className="w-full max-w-md">
					{/* Logo/Header Section */}
					<div className="mb-12 space-y-4">
						<Link
							href="/login"
							className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-mono mb-8 group animate-in fade-in slide-in-from-left-4 duration-500"
						>
							<ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
							Back to Login
						</Link>

						<div className="flex items-center gap-3 mb-8 animate-in fade-in slide-in-from-top-4 duration-700 delay-100">
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

						{/* Stencil-style heading */}
						<div className="animate-in fade-in slide-in-from-top-5 duration-700 delay-200">
							<div className="relative">
								<h2 className="text-4xl font-bold tracking-tight mb-2 uppercase font-mono">
									Credential
									<br />
									Recovery
								</h2>
								<div className="h-1 w-24 bg-primary rounded-full mt-3" />
							</div>
							<p className="text-sm text-muted-foreground mt-4 font-mono">
								{isSuccess
									? "Reset instructions sent to your email"
									: "Enter your email to receive reset instructions"}
							</p>
						</div>
					</div>

					{/* Reset Form */}
					<div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
						<div className="bg-card border border-border rounded-2xl p-8 shadow-xl backdrop-blur-sm">
							{!isSuccess ? (
								<form onSubmit={handleSubmit} className="space-y-6">
									{/* Email Field */}
									<div className="space-y-2">
										<Label
											htmlFor="email"
											className="text-sm font-mono uppercase tracking-wider text-foreground/80"
										>
											Email Address
										</Label>
										<div className="relative group">
											<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
											<Input
												id="email"
												type="email"
												placeholder="user@company.com"
												value={email}
												onChange={(e) => setEmail(e.target.value)}
												required
												className="pl-10 h-12 font-mono border-border focus:border-primary transition-colors"
											/>
										</div>
										<p className="text-xs text-muted-foreground font-mono mt-2">
											We'll send reset instructions to this email address
										</p>
									</div>

									{/* Submit Button */}
									<Button
										type="submit"
										disabled={isLoading}
										className="w-full h-12 font-mono uppercase tracking-wider text-sm font-bold relative overflow-hidden group"
									>
										<span className="relative z-10 flex items-center justify-center gap-2">
											{isLoading ? (
												<>
													<RefreshCcw className="h-4 w-4 animate-spin" />
													Processing...
												</>
											) : (
												"Send Reset Link"
											)}
										</span>
										<div className="absolute inset-0 bg-primary-foreground/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
									</Button>
								</form>
							) : (
								<div className="space-y-6 text-center">
									{/* Success State */}
									<div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20 mx-auto">
										<Mail className="h-8 w-8 text-primary" />
									</div>
									<div className="space-y-2">
										<h3 className="text-xl font-bold font-mono uppercase">
											Check Your Email
										</h3>
										<p className="text-sm text-muted-foreground font-mono">
											Reset instructions sent to:
											<br />
											<span className="text-foreground font-semibold">
												{email}
											</span>
										</p>
									</div>
									<div className="pt-4 space-y-3">
										<p className="text-xs text-muted-foreground font-mono">
											Didn't receive the email? Check your spam folder or
										</p>
										<Button
											onClick={() => setIsSuccess(false)}
											variant="outline"
											className="w-full font-mono uppercase tracking-wider text-xs"
										>
											Try Again
										</Button>
									</div>
								</div>
							)}

							{/* Divider */}
							<div className="mt-8 pt-6 border-t border-border">
								<div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-mono">
									<div className="h-px w-8 bg-border" />
									<span className="uppercase tracking-wider">
										Security Notice
									</span>
									<div className="h-px w-8 bg-border" />
								</div>
								<p className="text-center text-xs text-muted-foreground mt-4 font-mono leading-relaxed">
									For security, reset links expire after 1 hour.
									<br />
									Contact support if you continue to experience issues.
								</p>
							</div>
						</div>
					</div>

					{/* Footer Info */}
					<div className="mt-8 text-center animate-in fade-in duration-700 delay-400">
						<p className="text-xs text-muted-foreground font-mono">
							PMG Asset Fulfillment Platform v1.0 • Secure Connection Active
						</p>
					</div>
				</div>
			</div>

			{/* Corner Decorations */}
			<div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-primary/10 rounded-tr-3xl" />
			<div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-primary/10 rounded-bl-3xl" />
		</div>
	);
}
