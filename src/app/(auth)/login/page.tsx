"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, Package } from "lucide-react";

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			const result = await signIn.email({
				email,
				password,
			});

			if (result.error) {
				toast.error("Authentication Failed", {
					description: "Invalid email or password. Please try again.",
				});
				return;
			}

			toast.success("Access Granted", {
				description: "Welcome to the fulfillment platform.",
			});

			router.push("/");
		} catch (error) {
			toast.error("System Error", {
				description: "Unable to process authentication request.",
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
				ZONE: AUTH-01
			</div>
			<div className="absolute bottom-8 right-8 font-mono text-xs text-muted-foreground tracking-wider opacity-40">
				SEC-LEVEL: PUBLIC
			</div>

			{/* Main Container */}
			<div className="relative z-10 flex min-h-screen items-center justify-center p-4">
				<div className="w-full max-w-md">
					{/* Logo/Header Section */}
					<div className="mb-12 space-y-4">
						<div className="flex items-center gap-3 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
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
						<div className="animate-in fade-in slide-in-from-top-5 duration-700 delay-100">
							<div className="relative">
								<h2 className="text-4xl font-bold tracking-tight mb-2 uppercase font-mono">
									Access
									<br />
									Control
								</h2>
								<div className="h-1 w-24 bg-primary rounded-full mt-3" />
							</div>
							<p className="text-sm text-muted-foreground mt-4 font-mono">
								Authenticate to access warehouse management system
							</p>
						</div>
					</div>

					{/* Authentication Form */}
					<div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
						<div className="bg-card border border-border rounded-2xl p-8 shadow-xl backdrop-blur-sm">
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
								</div>

								{/* Password Field */}
								<div className="space-y-2">
									<Label
										htmlFor="password"
										className="text-sm font-mono uppercase tracking-wider text-foreground/80"
									>
										Password
									</Label>
									<div className="relative group">
										<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
										<Input
											id="password"
											type={showPassword ? "text" : "password"}
											placeholder="Enter your password"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											required
											className="pl-10 pr-10 h-12 font-mono border-border focus:border-primary transition-colors"
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

								{/* Forgot Password Link */}
								<div className="flex justify-end">
									<Link
										href="/reset-password"
										className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
									>
										Reset Credentials →
									</Link>
								</div>

								{/* Submit Button */}
								<Button
									type="submit"
									disabled={isLoading}
									className="w-full h-12 font-mono uppercase tracking-wider text-sm font-bold relative overflow-hidden group"
								>
									<span className="relative z-10">
										{isLoading ? "Authenticating..." : "Grant Access"}
									</span>
									<div className="absolute inset-0 bg-primary-foreground/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
								</Button>
							</form>

							{/* Divider */}
							<div className="mt-8 pt-6 border-t border-border">
								<div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-mono">
									<div className="h-px w-8 bg-border" />
									<span className="uppercase tracking-wider">
										System Information
									</span>
									<div className="h-px w-8 bg-border" />
								</div>
								<p className="text-center text-xs text-muted-foreground mt-4 font-mono">
									For access requests, contact your system administrator
								</p>
							</div>
						</div>
					</div>

					{/* Footer Info */}
					<div className="mt-8 text-center animate-in fade-in duration-700 delay-300">
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
