/**
 * Admin Page Header Component
 *
 * Consistent industrial header design across all admin pages.
 * Matches the companies page aesthetic with grid background and mono typography.
 */

import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'
import { SidebarTrigger } from './ui/sidebar'

interface AdminHeaderProps {
	icon: LucideIcon
	title: string
	description: string
	stats?: {
		label: string
		value: number | string
	}
	actions?: ReactNode
}

export function AdminHeader({
	icon: Icon,
	title,
	description,
	stats,
	actions,
}: AdminHeaderProps) {
	return (
		<div className='border-b border-border bg-muted/30 relative overflow-hidden'>
			{/* Industrial grid background */}
			<div
				className='absolute inset-0 opacity-[0.02]'
				style={{
					backgroundImage: `
						linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
						linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
					`,
					backgroundSize: '40px 40px',
				}}
			/>

			<div className='relative px-8 py-6'>
				<div className='flex items-center justify-between'>
					<div className='space-y-1'>
						<div className='flex items-center gap-3'>
							{/* Sidebar trigger for mobile/desktop */}
							<SidebarTrigger className='h-8 w-8 -ml-2' />
							<Icon
								className='h-6 w-6 text-primary'
								strokeWidth={2.5}
							/>
							<div className='flex flex-col gap-y-1'>
								<h1 className='text-2xl font-mono font-bold tracking-tight uppercase'>
									{title}
								</h1>
								<p className='text-sm text-muted-foreground font-mono uppercase tracking-wide hidden lg:block'>
									{description}
								</p>
							</div>
						</div>
					</div>

					<div className='flex items-center gap-4'>
						{/* Stats display */}
						{stats && (
							<div className='text-right'>
								<div className='text-xs font-mono text-muted-foreground uppercase tracking-wide'>
									{stats.label}
								</div>
								<div className='text-2xl font-mono font-bold text-primary'>
									{typeof stats.value === 'number'
										? stats.value
												.toString()
												.padStart(3, '0')
										: stats.value}
								</div>
							</div>
						)}

						{/* Action buttons */}
						{actions && (
							<div className='flex items-center gap-3'>
								{actions}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
