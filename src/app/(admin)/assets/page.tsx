'use client'

/**
 * Asset Management Page - Industrial Warehouse Aesthetic
 * Phase 3: Asset Management & QR Code Generation
 *
 * Design Concept: "Warehouse Operations Terminal"
 * - Monospace typography for data precision
 * - Orange accent for interactive elements (warehouse safety color)
 * - Grid-based layout mimicking inventory shelving
 * - Scanning indicators and QR code visual language
 */

import { useState, useMemo, useEffect } from 'react'
import { useAssets } from '@/hooks/use-assets'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
	Package,
	Plus,
	Search,
	Filter,
	Grid3x3,
	List,
	QrCode,
	Box,
	Warehouse,
	MapPin,
	Tag,
	ChevronRight,
	Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { Asset } from '@/types/asset'
import { CreateAssetDialog } from '@/components/assets/create-asset-dialog'
import { AdminHeader } from '@/components/admin-header'

export default function AssetsPage() {
	const router = useRouter()
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
	const [searchQuery, setSearchQuery] = useState('')
	const [filters, setFilters] = useState({
		category: 'all',
		condition: 'all',
		status: 'all',
		warehouse: 'all',
	})
	const [showCreateDialog, setShowCreateDialog] = useState(false)

	// Build query params
	const queryParams = useMemo(() => {
		const params: Record<string, string> = {}
		if (searchQuery) params.search_term = searchQuery
		if (filters.category && filters.category !== 'all')
			params.category = filters.category
		if (filters.condition && filters.condition !== 'all')
			params.condition = filters.condition
		if (filters.status && filters.status !== 'all')
			params.status = filters.status
		if (filters.warehouse && filters.warehouse !== 'all')
			params.warehouse_id = filters.warehouse
		return params
	}, [searchQuery, filters])

	// Fetch assets
	const { data, isLoading: loading } = useAssets(queryParams)
	const assets = data?.data || []

	function getConditionColor(condition: string) {
		switch (condition) {
			case 'GREEN':
				return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
			case 'ORANGE':
				return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
			case 'RED':
				return 'bg-red-500/10 text-red-600 border-red-500/20'
			default:
				return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'AVAILABLE':
				return 'bg-primary/10 text-primary border-primary/20'
			case 'BOOKED':
				return 'bg-secondary/10 text-secondary border-secondary/20'
			case 'OUT':
				return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
			case 'IN_MAINTENANCE':
				return 'bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20'
			default:
				return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
		}
	}

	return (
		<div className='min-h-screen bg-background'>
			<AdminHeader
				icon={Package}
				title='ASSET INVENTORY'
				description='Physical Items · QR Codes · Tracking'
				stats={
					data
						? { label: 'TOTAL ASSETS', value: data.meta.total }
						: undefined
				}
				actions={
					<div className='flex gap-2'>
						<Button
							variant='outline'
							size='lg'
							className='font-mono'
							onClick={() =>
								router.push('/admin/assets/bulk-upload')
							}
						>
							<Upload className='w-4 h-4 mr-2' />
							Bulk Upload
						</Button>
						<CreateAssetDialog
							open={showCreateDialog}
							onOpenChange={setShowCreateDialog}
							onSuccess={() => {
								setShowCreateDialog(false)
							}}
						/>
					</div>
				}
			/>

			<div className='max-w-[1600px] mx-auto px-6 py-8'>
				{/* Search and filters bar */}
				<div className='mb-6 space-y-4'>
					<div className='flex flex-col lg:flex-row gap-4'>
						{/* Search */}
						<div className='relative flex-1'>
							<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
							<Input
								placeholder='Search assets by name...'
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								className='pl-10 font-mono bg-background'
							/>
						</div>

						{/* Filters */}
						<div className='flex gap-2 flex-wrap'>
							<Select
								value={filters.category}
								onValueChange={value =>
									setFilters({ ...filters, category: value })
								}
							>
								<SelectTrigger className='w-[160px] font-mono'>
									<SelectValue placeholder='Category' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>
										All Categories
									</SelectItem>
									<SelectItem value='Furniture'>
										Furniture
									</SelectItem>
									<SelectItem value='Glassware'>
										Glassware
									</SelectItem>
									<SelectItem value='Installation'>
										Installation
									</SelectItem>
									<SelectItem value='Decor'>Decor</SelectItem>
								</SelectContent>
							</Select>

							<Select
								value={filters.condition}
								onValueChange={value =>
									setFilters({ ...filters, condition: value })
								}
							>
								<SelectTrigger className='w-[160px] font-mono'>
									<SelectValue placeholder='Condition' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>
										All Conditions
									</SelectItem>
									<SelectItem value='GREEN'>Green</SelectItem>
									<SelectItem value='ORANGE'>
										Orange
									</SelectItem>
									<SelectItem value='RED'>Red</SelectItem>
								</SelectContent>
							</Select>

							<Select
								value={filters.status}
								onValueChange={value =>
									setFilters({ ...filters, status: value })
								}
							>
								<SelectTrigger className='w-[160px] font-mono'>
									<SelectValue placeholder='Status' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>
										All Status
									</SelectItem>
									<SelectItem value='AVAILABLE'>
										Available
									</SelectItem>
									<SelectItem value='BOOKED'>
										Booked
									</SelectItem>
									<SelectItem value='OUT'>Out</SelectItem>
									<SelectItem value='IN_MAINTENANCE'>
										Maintenance
									</SelectItem>
								</SelectContent>
							</Select>

							{/* View mode toggle */}
							<div className='flex border border-border rounded-lg overflow-hidden'>
								<Button
									variant={
										viewMode === 'grid'
											? 'default'
											: 'ghost'
									}
									size='sm'
									onClick={() => setViewMode('grid')}
									className='rounded-none border-r border-border'
								>
									<Grid3x3 className='w-4 h-4' />
								</Button>
								<Button
									variant={
										viewMode === 'list'
											? 'default'
											: 'ghost'
									}
									size='sm'
									onClick={() => setViewMode('list')}
									className='rounded-none'
								>
									<List className='w-4 h-4' />
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Asset grid/list */}
			<div className='max-w-[1600px] mx-auto px-6 py-8'>
				{loading ? (
					<div
						className={
							viewMode === 'grid'
								? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
								: 'space-y-4'
						}
					>
						{[...Array(8)].map((_, i) => (
							<Card key={i} className='overflow-hidden'>
								<Skeleton className='w-full h-48' />
								<CardContent className='p-4 space-y-2'>
									<Skeleton className='h-4 w-3/4' />
									<Skeleton className='h-3 w-1/2' />
								</CardContent>
							</Card>
						))}
					</div>
				) : assets.length === 0 ? (
					<div className='flex flex-col items-center justify-center py-16 text-center'>
						<div className='p-4 bg-muted/50 rounded-full mb-4'>
							<Package className='w-12 h-12 text-muted-foreground' />
						</div>
						<h3 className='text-lg font-semibold font-mono mb-2'>
							No Assets Found
						</h3>
						<p className='text-muted-foreground font-mono text-sm mb-6 max-w-md'>
							Create your first asset to start tracking inventory
							with QR codes
						</p>
						<Button onClick={() => setShowCreateDialog(true)}>
							<Plus className='w-4 h-4 mr-2' />
							Create Asset
						</Button>
					</div>
				) : viewMode === 'grid' ? (
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
						{assets.map(asset => (
							<Link
								key={asset.id}
								href={`/assets/${asset.id}`}
							>
								<Card className='group overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg cursor-pointer'>
									{/* Asset image */}
									<div className='relative aspect-4/3 bg-muted overflow-hidden'>
										{asset.images.length > 0 ? (
											<Image
												src={asset.images[0]}
												alt={asset.name}
												fill
												className='object-cover group-hover:scale-105 transition-transform duration-300'
											/>
										) : (
											<div className='absolute inset-0 flex items-center justify-center'>
												<Box className='w-12 h-12 text-muted-foreground/30' />
											</div>
										)}

										{/* QR indicator overlay */}
										<div className='absolute top-2 right-2 p-1.5 bg-background/90 backdrop-blur-sm rounded-md border border-border'>
											<QrCode className='w-4 h-4 text-primary' />
										</div>

										{/* Condition indicator */}
										<div className='absolute bottom-2 left-2'>
											<Badge
												variant='outline'
												className={`${getConditionColor(asset.condition)} font-mono text-[10px]`}
											>
												{asset.condition}
											</Badge>
										</div>
									</div>

									<CardContent className='p-4 space-y-3'>
										{/* Asset name */}
										<div>
											<h3 className='font-semibold font-mono text-sm line-clamp-1 group-hover:text-primary transition-colors'>
												{asset.name}
											</h3>
											<p className='text-xs text-muted-foreground font-mono mt-0.5'>
												{asset.category}
											</p>
										</div>

										{/* Status and availability */}
										<div className='flex items-center justify-between text-xs font-mono'>
											<Badge
												variant='outline'
												className={`${getStatusColor(asset.status)} text-[10px]`}
											>
												{asset.status.replace('_', ' ')}
											</Badge>
											<span
												className='text-muted-foreground'
												title='Total quantity in stock. Availability calculated per event dates.'
											>
												{asset.total_quantity} units
											</span>
										</div>

										{/* Tracking method */}
										<div className='pt-2 border-t border-border flex items-center justify-between'>
											<span className='text-xs text-muted-foreground font-mono'>
												{asset.tracking_method}
											</span>
											<ChevronRight className='w-3 h-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all' />
										</div>
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				) : (
					<div className='gap-y-4 flex flex-col'>
						{assets.map(asset => (
							<Link
								key={asset.id}
								href={`/assets/${asset.id}`}
							>
								<Card className='group hover:border-primary/50 transition-all hover:shadow-md cursor-pointer'>
									<CardContent className='p-4'>
										<div className='flex items-center gap-4'>
											{/* Thumbnail */}
											<div className='relative w-20 h-20 bg-muted rounded-lg overflow-hidden shrink-0'>
												{asset.images.length > 0 ? (
													<Image
														src={asset.images[0]}
														alt={asset.name}
														fill
														className='object-cover'
													/>
												) : (
													<div className='absolute inset-0 flex items-center justify-center'>
														<Box className='w-8 h-8 text-muted-foreground/30' />
													</div>
												)}
											</div>

											{/* Details */}
											<div className='flex-1 min-w-0'>
												<div className='flex items-start justify-between gap-4'>
													<div>
														<h3 className='font-semibold font-mono text-sm group-hover:text-primary transition-colors'>
															{asset.name}
														</h3>
														<p className='text-xs text-muted-foreground font-mono mt-0.5'>
															{asset.category} •{' '}
															{
																asset.tracking_method
															}
														</p>
													</div>

													<div className='flex items-center gap-2'>
														<Badge
															variant='outline'
															className={`${getConditionColor(asset.condition)} font-mono text-[10px]`}
														>
															{asset.condition}
														</Badge>
														<Badge
															variant='outline'
															className={`${getStatusColor(asset.status)} font-mono text-[10px]`}
														>
															{asset.status.replace(
																'_',
																' '
															)}
														</Badge>
													</div>
												</div>

												<div className='mt-2 flex items-center gap-4 text-xs font-mono text-muted-foreground'>
													<span>
														{asset.total_quantity}{' '}
														total
													</span>
													<span>•</span>
													<span>
														{asset.volume_per_unit}m³
													</span>
													<span>•</span>
													<span className='flex items-center gap-1'>
														<QrCode className='w-3 h-3' />
														{asset.qr_code}
													</span>
												</div>
											</div>

											<ChevronRight className='w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0' />
										</div>
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
