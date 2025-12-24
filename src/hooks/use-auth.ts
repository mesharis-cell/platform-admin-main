'use client';

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';

// Reset password request
async function requestPasswordReset(email: string): Promise<void> {
  const response = await apiClient.post('/auth/reset-password', { email });

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to request password reset');
  }
}

// Reset password confirm
async function confirmPasswordReset(data: { token: string; newPassword: string }): Promise<void> {
  const response = await apiClient.post('/auth/reset-password/confirm', data);

  if (!response.data.success) {
    throw new Error(response.data.message || 'Invalid or expired reset token');
  }
}

// Hooks
export function useLogin() {
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await apiClient.post('/auth/login', data);
      return response
    },
  });
}

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
