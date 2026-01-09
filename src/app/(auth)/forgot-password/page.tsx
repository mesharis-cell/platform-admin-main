"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail, Package, RefreshCcw, ShieldCheck } from "lucide-react";
import { usePlatform } from "@/contexts/platform-context";

type Step = "email" | "verify";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { platform } = usePlatform();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-platform': platform.platform_id
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setStep("verify");
      toast.success("OTP Sent", {
        description: "A verification code has been sent to your email.",
      });
    } catch (error) {
      toast.error("System Error", {
        description: error instanceof Error ? error.message : "Unable to send verification code.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Password Mismatch", {
        description: "New password and confirm password do not match.",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Weak Password", {
        description: "Password must be at least 8 characters long.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-platform': platform.platform_id
        },
        body: JSON.stringify({ email, otp: Number(otp), new_password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      toast.success("Password Reset Successful", {
        description: "Your password has been updated. Please login with your new password.",
      });
      router.push("/");
    } catch (error) {
      toast.error("Reset Failed", {
        description: error instanceof Error ? error.message : "Unable to reset password.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-platform': platform.platform_id
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend OTP');
      }

      toast.success("OTP Resent", {
        description: "A new verification code has been sent to your email.",
      });
    } catch (error) {
      toast.error("System Error", {
        description: error instanceof Error ? error.message : "Unable to resend verification code.",
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
              href="/"
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
                  {platform?.company_name || "PMG Platform"}
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
                  {step === "email" ? (
                    <>
                      Password
                      <br />
                      Recovery
                    </>
                  ) : (
                    <>
                      Verify &
                      <br />
                      Reset
                    </>
                  )}
                </h2>
                <div className="h-1 w-24 bg-primary rounded-full mt-3" />
              </div>
              <p className="text-sm text-muted-foreground mt-4 font-mono">
                {step === "email"
                  ? "Enter your email to receive a verification code"
                  : "Enter the OTP and set your new password"}
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="animate-in fade-in slide-in-from-top-6 duration-700 delay-250 mb-6">
            <div className="flex items-center justify-center gap-3">
              <div className={`flex items-center gap-2 ${step === "email" ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-mono font-bold border-2 transition-colors ${step === "email" ? "bg-primary text-primary-foreground border-primary" : "bg-primary/10 border-primary/20 text-primary"}`}>
                  1
                </div>
                <span className="text-xs font-mono uppercase tracking-wider hidden sm:inline">Email</span>
              </div>
              <div className={`w-8 h-0.5 ${step === "verify" ? "bg-primary" : "bg-border"} transition-colors`} />
              <div className={`flex items-center gap-2 ${step === "verify" ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-mono font-bold border-2 transition-colors ${step === "verify" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border"}`}>
                  2
                </div>
                <span className="text-xs font-mono uppercase tracking-wider hidden sm:inline">Verify</span>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <div className="bg-card border border-border rounded-2xl p-8 shadow-xl backdrop-blur-sm">
              {step === "email" ? (
                <form onSubmit={handleSendOtp} className="space-y-6">
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
                      We'll send a verification code to this email
                    </p>
                  </div>

                  {/* Continue Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full h-12 font-mono uppercase tracking-wider text-sm font-bold relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isLoading ? (
                        <>
                          <RefreshCcw className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-primary-foreground/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-6">
                  {/* OTP Field */}
                  <div className="space-y-3">
                    <Label className="text-sm font-mono uppercase tracking-wider text-foreground/80 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Verification Code
                    </Label>
                    <div className="flex justify-center">
                      <InputOTP
                        value={otp}
                        onChange={setOtp}
                        maxLength={6}
                      >
                        <InputOTPGroup className="gap-2">
                          <InputOTPSlot index={0} className="h-12 w-12 text-lg font-mono font-bold" />
                          <InputOTPSlot index={1} className="h-12 w-12 text-lg font-mono font-bold" />
                          <InputOTPSlot index={2} className="h-12 w-12 text-lg font-mono font-bold" />
                          <InputOTPSlot index={3} className="h-12 w-12 text-lg font-mono font-bold" />
                          <InputOTPSlot index={4} className="h-12 w-12 text-lg font-mono font-bold" />
                          <InputOTPSlot index={5} className="h-12 w-12 text-lg font-mono font-bold" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground font-mono">
                      <span>Didn't receive code?</span>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isLoading}
                        className="text-primary hover:underline focus:outline-none"
                      >
                        Resend
                      </button>
                    </div>
                  </div>

                  {/* New Password Field */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="newPassword"
                      className="text-sm font-mono uppercase tracking-wider text-foreground/80 flex items-center gap-2"
                    >
                      <KeyRound className="h-4 w-4" />
                      New Password
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="pl-10 pr-10 h-12 font-mono border-border focus:border-primary transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-mono uppercase tracking-wider text-foreground/80 flex items-center gap-2"
                    >
                      <Lock className="h-4 w-4" />
                      Confirm Password
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="pl-10 pr-10 h-12 font-mono border-border focus:border-primary transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-2">
                      Password must be at least 8 characters
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <Button
                      type="submit"
                      disabled={isLoading || otp.length !== 6 || !newPassword || !confirmPassword}
                      className="w-full h-12 font-mono uppercase tracking-wider text-sm font-bold relative overflow-hidden group"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isLoading ? (
                          <>
                            <RefreshCcw className="h-4 w-4 animate-spin" />
                            Resetting...
                          </>
                        ) : (
                          "Reset Password"
                        )}
                      </span>
                      <div className="absolute inset-0 bg-primary-foreground/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep("email")}
                      className="w-full font-mono uppercase tracking-wider text-xs"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Change Email
                    </Button>
                  </div>
                </form>
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
                  {step === "email" ? (
                    "For security, we'll verify your identity with a one-time code."
                  ) : (
                    <>
                      OTP expires in 10 minutes.
                      <br />
                      Contact support if you continue to experience issues.
                    </>
                  )}
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
