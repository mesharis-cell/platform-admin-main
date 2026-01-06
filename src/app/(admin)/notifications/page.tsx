'use client';

/**
 * Phase 10: Failed Notifications Dashboard
 * Monitor and retry failed email notifications
 *
 * Design: Industrial Alert System
 * - Monospace typography for technical precision
 * - Status-based color coding (FAILED=red, RETRYING=yellow)
 * - Compact list view with retry actions
 * - Real-time attempt counter
 */

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, Mail, ExternalLink, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminHeader } from '@/components/admin-header';
import { apiClient } from '@/lib/api/api-client';
import { throwApiError } from '@/lib/utils/throw-api-error';

export default function FailedNotificationsPage() {
	const [filter, setFilter] = useState<'all' | 'FAILED' | 'RETRYING'>('all');
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery({
		queryKey: ['failed-notifications', filter],
		queryFn: async () => {
			try {
				const params = new URLSearchParams();
				if (filter !== 'all') params.append('status', filter);
				const response = await apiClient.get(`/operations/v1/notification-logs/failed?${params}`);
				return response.data;
			} catch (error) {
				console.error('Failed to fetch notifications:', error);
				return [];
			}
		},
	});

	const retryMutation = useMutation({
		mutationFn: async (notificationId: string) => {
			try {
				const response = await apiClient.post(`/operations/v1/notification-logs/${notificationId}/retry`);
				return response.data;

			} catch (error) {
				console.error('Failed to retry notification:', error);
				throwApiError(error);
			}
		},
		onSuccess: () => {
			toast.success('Notification resent successfully');
			queryClient.invalidateQueries({ queryKey: ['failed-notifications'] });
		},
		onError: (error: any) => {
			toast.error(error.message || 'Failed to retry notification');
		},
	});

	const handleRetry = (notificationId: string) => {
		retryMutation.mutate(notificationId);
	};

	return (
		<div className="min-h-screen bg-background">
			<AdminHeader
				icon={Mail}
				title="NOTIFICATION CENTER"
				description="Monitor · Retry · Audit"
				stats={data ? { label: 'TOTAL FAILED', value: data?.data?.total || 0 } : undefined}
				actions={
					<select
						value={filter}
						onChange={(e) => setFilter(e.target.value as any)}
						className="border rounded px-3 py-1.5 bg-background font-mono text-xs"
					>
						<option value="all">ALL FAILURES</option>
						<option value="FAILED">FAILED ONLY</option>
						<option value="RETRYING">RETRYING</option>
					</select>
				}
			/>

			<div className="container mx-auto px-6 py-8">
				{/* Stats */}
				{data && (
					<div className="grid grid-cols-3 gap-4 mb-6">
						<Card className="border-2">
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded bg-red-500/10 flex items-center justify-center">
										<AlertCircle className="h-5 w-5 text-red-600" />
									</div>
									<div>
										<p className="font-mono text-xs text-muted-foreground">TOTAL FAILED</p>
										<p className="font-mono text-2xl font-bold">{data?.data?.total || 0}</p>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card className="border-2">
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded bg-yellow-500/10 flex items-center justify-center">
										<RefreshCw className="h-5 w-5 text-yellow-600" />
									</div>
									<div>
										<p className="font-mono text-xs text-muted-foreground">RETRYING</p>
										<p className="font-mono text-2xl font-bold">
											{data?.data?.notifications?.filter((n: any) => n.status === 'RETRYING').length || 0}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card className="border-2">
							<CardContent className="pt-6">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded bg-green-500/10 flex items-center justify-center">
										<CheckCircle2 className="h-5 w-5 text-green-600" />
									</div>
									<div>
										<p className="font-mono text-xs text-muted-foreground">SUCCESS RATE</p>
										<p className="font-mono text-2xl font-bold">
											{data?.data?.total > 0 ? Math.round((1 - data?.data?.total / 100) * 100) : 100}%
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				)}

				{/* Notifications List */}
				<Card className="border-2">
					<CardHeader>
						<CardTitle className="font-mono text-sm flex items-center gap-2">
							<Mail className="h-4 w-4 text-primary" />
							NOTIFICATION FAILURES
						</CardTitle>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<div className="space-y-3">
								<Skeleton className="h-20 w-full" />
								<Skeleton className="h-20 w-full" />
								<Skeleton className="h-20 w-full" />
							</div>
						) : !data?.data?.notifications?.length ? (
							<div className="p-12 text-center">
								<CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
								<p className="font-mono text-sm text-muted-foreground">
									No failed notifications. All emails delivered successfully.
								</p>
							</div>
						) : (
							<div className="space-y-3">
								{data?.data?.notifications.map((notification: any) => (
									<div key={notification.id} className="p-4 border-2 rounded bg-card hover:bg-muted/20 transition-colors">
										<div className="flex items-start justify-between gap-4">
											<div className="flex-1 space-y-2">
												<div className="flex items-center gap-2">
													<Badge
														className={`font-mono text-[10px] border ${notification.status === 'FAILED'
															? 'bg-red-500/10 text-red-700 border-red-500/20'
															: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
															}`}
													>
														{notification.status}
													</Badge>
													<Badge variant="outline" className="font-mono text-[10px]">
														{notification.notificationType}
													</Badge>
													<span className="font-mono text-[10px] text-muted-foreground">
														ATTEMPTS: {notification.attempts}
													</span>
												</div>

												<div className="flex items-center gap-3">
													<Link href={`/orders/${notification.order.id}`}>
														<Button variant="link" size="sm" className="h-auto p-0 font-mono text-xs">
															{notification.order.orderId}
															<ExternalLink className="h-3 w-3 ml-1" />
														</Button>
													</Link>
													<span className="font-mono text-xs text-muted-foreground">
														{notification.order.companyName}
													</span>
												</div>

												<div className="font-mono text-xs text-muted-foreground">
													TO: {notification.recipients.to?.join(', ')}
												</div>

												{notification.errorMessage && (
													<div className="p-2 bg-red-500/5 border border-red-500/20 rounded">
														<p className="font-mono text-[10px] text-red-700">
															ERROR: {notification.errorMessage}
														</p>
													</div>
												)}

												<p className="font-mono text-[10px] text-muted-foreground">
													Last attempt: {new Date(notification.lastAttemptAt).toLocaleString()}
												</p>
											</div>

											<Button
												size="sm"
												variant="outline"
												onClick={() => handleRetry(notification.id)}
												disabled={retryMutation.isPending}
												className="font-mono text-xs"
											>
												<RefreshCw className={`h-3 w-3 mr-2 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
												RETRY
											</Button>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
