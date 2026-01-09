"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, Lock, RefreshCcw, ShieldCheck } from "lucide-react";
import { useToken } from "@/lib/auth/use-token";
import { apiClient } from "@/lib/api/api-client";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { logout } = useToken();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
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

    if (currentPassword === newPassword) {
      toast.error("Same Password", {
        description: "New password must be different from current password.",
      });
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post('/auth/reset-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });

      toast.success("Password Changed", {
        description: "Your password has been updated successfully.",
      });

      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      logout();
      router.push('/');
    } catch (error) {
      toast.error("Change Failed", {
        description: error instanceof Error ? error.message : "Unable to change password.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        icon={KeyRound}
        title="RESET PASSWORD"
        description="Security · Credentials · Access"
      />

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-xl mx-auto">
          {/* Form Card */}
          <div className="bg-card border border-border rounded-2xl p-8 shadow-xl backdrop-blur-sm">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-mono uppercase tracking-tight">
                    Change Password
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono tracking-wider">
                    Update your account credentials
                  </p>
                </div>
              </div>
              <div className="h-1 w-16 bg-primary rounded-full" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Current Password Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="currentPassword"
                  className="text-sm font-mono uppercase tracking-wider text-foreground/80"
                >
                  Current Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="pl-10 pr-10 h-12 font-mono border-border focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-mono text-muted-foreground tracking-[0.15em] uppercase">
                  New Credentials
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* New Password Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="newPassword"
                  className="text-sm font-mono uppercase tracking-wider text-foreground/80"
                >
                  New Password
                </Label>
                <div className="relative group">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
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
                <p className="text-xs text-muted-foreground font-mono">
                  Minimum 8 characters required
                </p>
              </div>

              {/* Confirm Password Field */}
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
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive font-mono">
                    Passwords do not match
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
                className="w-full h-12 font-mono uppercase tracking-wider text-sm font-bold relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <RefreshCcw className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Update Password
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-primary-foreground/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Button>
            </form>

            {/* Security Notice */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-mono">
                <div className="h-px w-8 bg-border" />
                <span className="uppercase tracking-wider">
                  Security Notice
                </span>
                <div className="h-px w-8 bg-border" />
              </div>
              <p className="text-center text-xs text-muted-foreground mt-4 font-mono leading-relaxed">
                After changing your password, you may need to log in again on other devices.
                <br />
                Make sure to use a strong, unique password.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
