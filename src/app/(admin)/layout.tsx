'use client'

/**
 * Admin Layout - Warehouse Operations Command Center
 *
 * Industrial logistics aesthetic with technical precision:
 * - Dark sidebar with grid overlay and zone markers
 * - Bold mono typography with uppercase headers
 * - Orange accent highlights for active states
 * - Role-based navigation filtering
 * - Animated loading states
 * - Collapsible sidebar with SidebarTrigger
 */

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
	Users,
	Building,
	Warehouse,
	Grid3x3,
	Tag,
	Package,
	Layers,
	DollarSign,
	ShoppingCart,
	Receipt,
	Mail,
	ScanLine,
	AlertCircle,
	BarChart3,
	LogOut,
	Box,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	useSidebar,
} from '@/components/ui/sidebar'
import Providers from '@/providers'
import { toast } from 'sonner'
import { useToken } from '@/lib/auth/use-token'

type NavItem = {
	name: string
	href: string
	icon: React.ComponentType<{ className?: string }>
	badge?: string
	requiredPermission?: string
}

const navigation: NavItem[] = [
	// {
	// 	name: 'Analytics',
	// 	href: '/analytics',
	// 	icon: BarChart3,
	// },
	{
		name: 'Orders',
		href: '/orders',
		icon: ShoppingCart,
	},
	{
		name: 'Pricing Review',
		href: '/orders/pricing-review',
		icon: DollarSign,
		badge: 'A2',
	},
	{
		name: 'Pending Approval',
		href: '/orders/pending-approval',
		icon: AlertCircle,
		badge: 'PMG',
	},
	{
		name: 'Scanning',
		href: '/scanning',
		icon: ScanLine,
	},
	{
		name: 'Conditions',
		href: '/conditions',
		icon: AlertCircle,
	},
	// {
	// 	name: 'Invoices',
	// 	href: '/invoices',
	// 	icon: Receipt,
	// },
	{
		name: 'Notifications',
		href: '/notifications',
		icon: Mail,
	},
	{
		name: 'Users',
		href: '/users',
		icon: Users,
	},
	{
		name: 'Companies',
		href: '/companies',
		icon: Building,
	},
	{
		name: 'Warehouses',
		href: '/warehouses',
		icon: Warehouse,
	},
	{
		name: 'Zones',
		href: '/zones',
		icon: Grid3x3,
	},
	{
		name: 'Brands',
		href: '/brands',
		icon: Tag,
	},
	{
		name: 'Assets',
		href: '/assets',
		icon: Package,
	},
	{
		name: 'Collections',
		href: '/collections',
		icon: Layers,
	},
	{
		name: 'Pricing Tiers',
		href: '/pricing-tiers',
		icon: DollarSign,
	},
]

function AdminSidebarContent() {
	const pathname = usePathname()
	const router = useRouter()
	const { data: session, isPending } = useSession()
	const { state } = useSidebar()
	const { logout } = useToken()

	const handleSignOut = () => {
		logout()
		router.push('/');
		toast.success('You have been signed out.')
	}

	const isCollapsed = state === 'collapsed'

	return (
		<>
			<SidebarHeader className='relative border-b border-border bg-white'>
				{/* Zone marker - top left */}
				{!isCollapsed && (
					<div className='absolute top-4 left-4 text-[10px] font-mono text-muted-foreground/40 tracking-[0.2em] uppercase z-0'>
						ADMIN-01
					</div>
				)}

				<div className='flex justify-center items-center gap-3 '>
					<div className='h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30 relative overflow-hidden shrink-0'>
						<Box
							className='h-5 w-5 text-primary relative z-10'
							strokeWidth={2.5}
						/>
						<div className='absolute inset-0 bg-primary/5 animate-pulse' />
					</div>
					{!isCollapsed && (
						<div>
							<h2 className='text-lg font-mono font-bold tracking-tight uppercase'>
								PMG Platform
							</h2>
							<p className='text-[10px] font-mono text-muted-foreground tracking-[0.15em] uppercase'>
								Operations Command
							</p>
						</div>
					)}
				</div>
			</SidebarHeader>

			<SidebarContent className='p-3 space-y-0.5 overflow-y-auto bg-background'>
				<SidebarMenu>
					{isPending ? (
						// Loading skeletons
						<>
							{[...Array(8)].map((_, i) => (
								<SidebarMenuItem key={i}>
									<div className='flex items-center gap-3 px-3 py-2.5'>
										<Skeleton className='h-4 w-4 rounded' />
										{!isCollapsed && (
											<Skeleton className='h-3.5 flex-1' />
										)}
									</div>
								</SidebarMenuItem>
							))}
						</>
					) : (
						navigation.map(item => {
							const Icon = item.icon
							// Find the most specific matching route
							const matchingRoutes = navigation.filter(
								navItem =>
									pathname === navItem.href ||
									pathname.startsWith(navItem.href + '/')
							)
							// Highlight only the longest matching route (most specific)
							const mostSpecificRoute = matchingRoutes.reduce(
								(longest, current) =>
									current.href.length > longest.href.length
										? current
										: longest,
								matchingRoutes[0]
							)
							const isActive =
								mostSpecificRoute?.href === item.href
							return (
								<SidebarMenuItem key={item.name}>
									<SidebarMenuButton
										asChild
										isActive={isActive}
										tooltip={
											isCollapsed ? item.name : undefined
										}
										className={cn(
											'group/nav-item flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-mono transition-all relative overflow-hidden',
											isActive
												? 'bg-primary text-primary-foreground font-semibold shadow-sm'
												: 'text-foreground/70 hover:text-foreground hover:bg-muted'
										)}
									>
										<Link href={item.href}>
											{/* Active indicator bar */}
											{isActive && (
												<div className='absolute left-0 top-0 bottom-0 w-1 bg-primary-foreground/30' />
											)}

											<Icon className='h-4 w-4 relative z-10 shrink-0' />
											{!isCollapsed && (
												<>
													<span className='flex-1 relative z-10 uppercase tracking-wide text-xs'>
														{item.name}
													</span>

													{'badge' in item &&
														item.badge && (
															<span
																className={cn(
																	'px-1.5 py-0.5 text-[10px] font-mono rounded uppercase tracking-wider relative z-10 shrink-0',
																	isActive
																		? 'bg-primary-foreground/20 text-primary-foreground'
																		: 'bg-primary/10 text-primary border border-primary/20'
																)}
															>
																{item.badge}
															</span>
														)}
												</>
											)}

											{/* Hover glow effect */}
											{!isActive && (
												<div className='absolute inset-0 bg-primary/0 group-hover/nav-item:bg-primary/5 transition-colors' />
											)}
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							)
						})
					)}
				</SidebarMenu>
			</SidebarContent>

			<SidebarFooter className='p-4 space-y-3 bg-background'>
				{/* Divider with technical detail */}
				{!isCollapsed && (
					<div className='px-2 py-2'>
						<div className='flex items-center gap-2'>
							<div className='h-px flex-1 bg-border' />
							<span className='text-[9px] font-mono text-muted-foreground tracking-[0.2em] uppercase'>
								User Profile
							</span>
							<div className='h-px flex-1 bg-border' />
						</div>
					</div>
				)}

				{/* User Profile & Sign Out */}
				{isPending ? (
					<>
						<div className='flex items-center gap-3 px-2'>
							<Skeleton className='h-10 w-10 rounded-lg' />
							{!isCollapsed && (
								<div className='flex-1 space-y-2'>
									<Skeleton className='h-3.5 w-28' />
									<Skeleton className='h-3 w-20' />
								</div>
							)}
						</div>
						{!isCollapsed && (
							<Skeleton className='h-9 w-full rounded-md' />
						)}
					</>
				) : (
					<>
						<div className='flex items-center gap-3 px-2 py-1'>
							<Avatar className='h-10 w-10 border-2 border-primary/20 shrink-0'>
								<AvatarFallback className='bg-primary/10 text-primary font-mono text-sm font-bold'>
									{session?.user?.name
										?.charAt(0)
										.toUpperCase() || 'A'}
								</AvatarFallback>
							</Avatar>
							{!isCollapsed && (
								<div className='flex-1 min-w-0'>
									<p className='text-sm font-mono font-semibold truncate'>
										{session?.user?.name || 'Admin User'}
									</p>
									<p className='text-[10px] font-mono text-muted-foreground tracking-[0.15em] uppercase'>
										{session?.user?.permissionTemplate ===
											'PMG_ADMIN' && 'PMG Admin'}
										{session?.user?.permissionTemplate ===
											'A2_STAFF' && 'A2 Staff'}
										{!session?.user?.permissionTemplate &&
											'Admin'}
									</p>
								</div>
							)}
						</div>
						{!isCollapsed && (
							<Button
								variant='outline'
								size='sm'
								onClick={handleSignOut}
								className='w-full font-mono text-xs uppercase tracking-wide hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors'
							>
								<LogOut className='h-3.5 w-3.5 mr-2' />
								Sign Out
							</Button>
						)}
					</>
				)}

				{/* Bottom zone marker */}
				{!isCollapsed && (
					<div className='text-[9px] font-mono text-muted-foreground/30 tracking-[0.2em] uppercase text-center pt-2'>
						PMG Asset Fulfillment v1.0
					</div>
				)}
			</SidebarFooter>
		</>
	)
}

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<Providers>
			<SidebarProvider defaultOpen={true}>
				<div className='flex min-h-screen w-full bg-background'>
					{/* Industrial Command Center Sidebar */}
					<Sidebar
						collapsible='icon'
						variant='sidebar'
						className='border-r border-border bg-muted/30 sticky top-0'
					>
						{/* Grid pattern overlay */}
						<div
							className='absolute inset-0 opacity-[0.03] pointer-events-none'
							style={{
								backgroundImage: `
								linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
								linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
							`,
								backgroundSize: '32px 32px',
							}}
						/>

						<AdminSidebarContent />
					</Sidebar>

					{/* Main Content */}
					<SidebarInset>{children}</SidebarInset>
				</div>
			</SidebarProvider>
		</Providers>
	)
}
