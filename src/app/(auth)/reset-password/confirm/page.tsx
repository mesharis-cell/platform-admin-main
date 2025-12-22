"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConfirmPasswordReset } from "@/hooks/use-auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Lock, Package, Eye, EyeOff } from "lucide-react";

function ResetPasswordForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");

	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);

	const confirmResetMutation = useConfirmPasswordReset();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (newPassword !== confirmPassword) {
			toast.error("Passwords do not match");
			return;
		}

		if (newPassword.length < 8) {
			toast.error("Password must be at least 8 characters");
			return;
		}

		if (!token) {
			toast.error("Invalid reset token");
			return;
		}

		try {
			await confirmResetMutation.mutateAsync({ token, newPassword });
			toast.success("Password Reset Successfully", {
				description: "You can now log in with your new password.",
			});
			router.push("/login");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Unable to process password reset.");
		}
	};

	if (!token) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center p-4">
				<div className="max-w-md w-full text-center">
					<p className="text-muted-foreground font-mono mb-4">
						Invalid reset link
					</p>
					<Link
						href="/reset-password"
						className="text-primary hover:underline font-mono text-sm"
					>
						Request a new reset link
					</Link>
				</div>
			</div>
		);
	}

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

			<div className="relative z-10 flex min-h-screen items-center justify-center p-4">
				<div className="w-full max-w-md">
					<Link
						href="/login"
						className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-mono mb-8 group"
					>
						<ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
						Back to Login
					</Link>

					<div className="mb-12 space-y-4">
						<div className="flex items-center gap-3 mb-8">
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

						<div>
							<h2 className="text-4xl font-bold tracking-tight mb-2 uppercase font-mono">
								Set New
								<br />
								Password
							</h2>
							<div className="h-1 w-24 bg-primary rounded-full mt-3" />
							<p className="text-sm text-muted-foreground mt-4 font-mono">
								Choose a strong password for your account
							</p>
						</div>
					</div>

					<div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
						<form onSubmit={handleSubmit} className="space-y-6">
							<div className="space-y-2">
								<Label
									htmlFor="newPassword"
									className="text-sm font-mono uppercase tracking-wider text-foreground/80"
								>
									New Password
								</Label>
								<div className="relative group">
									<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
									<Input
										id="newPassword"
										type={showPassword ? "text" : "password"}
										placeholder="Enter new password"
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
										required
										minLength={8}
										className="pl-10 pr-10 h-12 font-mono"
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
									>
										{showPassword ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</button>
								</div>
							</div>

							<div className="space-y-2">
								<Label
									htmlFor="confirmPassword"
									className="text-sm font-mono uppercase tracking-wider text-foreground/80"
								>
									Confirm Password
								</Label>
								<div className="relative group">
									<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
									<Input
										id="confirmPassword"
										type={showPassword ? "text" : "password"}
										placeholder="Confirm new password"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										required
										minLength={8}
										className="pl-10 h-12 font-mono"
									/>
								</div>
								<p className="text-xs text-muted-foreground font-mono">
									Minimum 8 characters required
								</p>
							</div>

							<Button
								type="submit"
								disabled={confirmResetMutation.isPending}
								className="w-full h-12 font-mono uppercase tracking-wider text-sm font-bold"
							>
								{confirmResetMutation.isPending ? "Resetting..." : "Reset Password"}
							</Button>
						</form>
					</div>
				</div>
			</div>

			<div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-primary/10 rounded-tr-3xl" />
			<div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-primary/10 rounded-bl-3xl" />
		</div>
	);
}

export default function ResetPasswordConfirmPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-background flex items-center justify-center p-4">
					<div className="max-w-md w-full text-center">
						<p className="text-muted-foreground font-mono">Loading...</p>
					</div>
				</div>
			}
		>
			<ResetPasswordForm />
		</Suspense>
	);
}
