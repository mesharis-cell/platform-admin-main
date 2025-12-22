import { useMutation } from '@tanstack/react-query';

// Reset password request
async function requestPasswordReset(email: string): Promise<void> {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to request password reset');
  }
}

// Reset password confirm
async function confirmPasswordReset(data: { token: string; newPassword: string }): Promise<void> {
  const response = await fetch('/api/auth/reset-password/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Invalid or expired reset token');
  }
}

// Hooks
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: requestPasswordReset,
  });
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: confirmPasswordReset,
  });
}
