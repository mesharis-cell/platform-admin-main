'use client'

import { useState } from 'react'
import {
	useCollections,
	useCreateCollection,
	useDeleteCollection,
	useUploadCollectionImages,
} from '@/hooks/use-collections'
import { useCompanies } from '@/hooks/use-companies'
import { useBrands } from '@/hooks/use-brands'
import { useAssets, useUploadImage } from '@/hooks/use-assets'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from '@/components/ui/dialog'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import {
	Plus,
	Package,
	Search,
	ImagePlus,
	Trash2,
	Archive,
	Building2,
	Tag,
	Layers,
	X,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { AdminHeader } from '@/components/admin-header'

export default function CollectionsPage() {
	const [searchQuery, setSearchQuery] = useState('')
	const [selectedCompany, setSelectedCompany] = useState<string>('')
	const [selectedBrand, setSelectedBrand] = useState<string>('')
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	const [confirmDelete, setConfirmDelete] = useState<{
		id: string
		name: string
	} | null>(null)

	// Fetch data
	const { data: collectionsData, isLoading } = useCollections({
		search_term: searchQuery || undefined,
		company_id:
			selectedCompany && selectedCompany !== ''
				? selectedCompany
				: undefined,
		brand_id:
			selectedBrand && selectedBrand !== '' ? selectedBrand : undefined,
		limit: 100,
	})

	const { data: companiesData } = useCompanies({ limit: '100' })

	// Create collection form state
	const [formData, setFormData] = useState({
		company: '',
		brand: '',
		name: '',
		description: '',
		category: '',
		images: [] as string[],
	})

	// Brands for filter dropdown (based on selectedCompany)
	const { data: brandsData } = useBrands({
		company_id:
			selectedCompany &&
				selectedCompany !== '' &&
				selectedCompany !== ''
				? selectedCompany
				: undefined,
		limit: '100',
	})

	// Brands for create dialog (based on formData.company)
	const { data: formBrandsData } = useBrands({
		company_id: formData.company || undefined,
		limit: '100',
	})

	const createMutation = useCreateCollection()
	const deleteMutation = useDeleteCollection()
	const uploadMutation = useUploadImage()

	const [selectedImages, setSelectedImages] = useState<File[]>([])
	const [previewUrls, setPreviewUrls] = useState<string[]>([])

	const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || [])
		setSelectedImages(files)

		// Create preview URLs
		const urls = files.map(file => URL.createObjectURL(file))
		setPreviewUrls(urls)
	}

	const handleRemoveImage = (index: number) => {
		const newImages = [...selectedImages]
		const newPreviews = [...previewUrls]

		// Revoke object URL
		URL.revokeObjectURL(newPreviews[index])

		newImages.splice(index, 1)
		newPreviews.splice(index, 1)

		setSelectedImages(newImages)
		setPreviewUrls(newPreviews)
	}

	const handleCreateCollection = async () => {
		try {
			if (!formData.company || !formData.name) {
				toast.error('Company and name are required')
				return
			}

			// Upload images first
			let imageUrls: string[] = []
			if (selectedImages.length > 0) {
				const formData = new FormData()
				selectedImages.forEach(file => formData.append('files', file))
				const uploadResult = await uploadMutation.mutateAsync(formData)
				imageUrls = uploadResult.data?.imageUrls || []
			}

			// Create collection
			await createMutation.mutateAsync({
				company_id: formData.company,
				brand_id: formData.brand || undefined,
				name: formData.name,
				description: formData.description || '',
				category: formData.category || '',
				images: imageUrls,
			})

			toast.success('Collection created successfully')
			setIsCreateDialogOpen(false)

			// Reset form
			setFormData({
				company: '',
				brand: '',
				name: '',
				description: '',
				category: '',
				images: [],
			})
			setSelectedImages([])
			setPreviewUrls([])
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: 'Failed to create collection'
			)
		}
	}

	const handleDeleteCollection = async () => {
		if (!confirmDelete) return

		try {
			await deleteMutation.mutateAsync(confirmDelete.id)
			toast.success('Collection deleted successfully')
			setConfirmDelete(null)
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: 'Failed to delete collection'
			)
			setConfirmDelete(null)
		}
	}

	const collections = collectionsData?.data || []
	const companies = companiesData?.data || []
	const brands = brandsData?.data || []
	const formBrands = formBrandsData?.data || []

	return (
		<div className='min-h-screen bg-background'>
			<AdminHeader
				icon={Layers}
				title='COLLECTION CATALOG'
				description='Asset Bundles · Pre-configured Sets · Quick Ordering'
				stats={
					collectionsData
						? {
							label: 'TOTAL COLLECTIONS',
							value: collectionsData.data.length,
						}
						: undefined
				}
				actions={
					<Dialog
						open={isCreateDialogOpen}
						onOpenChange={setIsCreateDialogOpen}
					>
						<DialogTrigger asChild>
							<Button className='gap-2 font-mono'>
								<Plus className='h-4 w-4' />
								NEW COLLECTION
							</Button>
						</DialogTrigger>
						<DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
							<DialogHeader>
								<DialogTitle className='text-2xl'>
									Create Collection
								</DialogTitle>
							</DialogHeader>

							<div className='space-y-6 py-4'>
								{/* Company Selection */}
								<div className='space-y-2'>
									<Label htmlFor='company'>Company *</Label>
									<Select
										value={formData.company}
										onValueChange={value =>
											setFormData({
												...formData,
												company: value,
												brand: '',
											})
										}
									>
										<SelectTrigger id='company'>
											<SelectValue placeholder='Select company' />
										</SelectTrigger>
										<SelectContent>
											{companies.map(company => (
												<SelectItem
													key={company.id}
													value={company.id}
												>
													{company.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Brand Selection */}
								<div className='space-y-2'>
									<Label htmlFor='brand'>
										Brand (Optional)
									</Label>
									<div className='flex gap-2'>
										<Select
											value={
												formData.brand || '__empty__'
											}
											onValueChange={value =>
												setFormData({
													...formData,
													brand:
														value === '__empty__'
															? ''
															: value,
												})
											}
											disabled={!formData.company}
										>
											<SelectTrigger
												id='brand'
												className='flex-1'
											>
												<SelectValue placeholder='Select brand (optional)' />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='__empty__'>
													No Brand
												</SelectItem>
												{formBrands.length === 0 ? (
													<div className='px-2 py-6 text-center text-sm text-muted-foreground'>
														No brands for this
														company
													</div>
												) : (
													formBrands.map(brand => (
														<SelectItem
															key={brand.id}
															value={brand.id}
														>
															{brand.name}
														</SelectItem>
													))
												)}
											</SelectContent>
										</Select>
									</div>
								</div>

								{/* Collection Name */}
								<div className='space-y-2'>
									<Label htmlFor='name'>
										Collection Name *
									</Label>
									<Input
										id='name'
										placeholder='e.g., Absolut Bar Setup'
										value={formData.name}
										onChange={e =>
											setFormData({
												...formData,
												name: e.target.value,
											})
										}
									/>
								</div>

								{/* Description */}
								<div className='space-y-2'>
									<Label htmlFor='description'>
										Description
									</Label>
									<Textarea
										id='description'
										placeholder='Describe this collection bundle...'
										rows={3}
										value={formData.description}
										onChange={e =>
											setFormData({
												...formData,
												description: e.target.value,
											})
										}
									/>
								</div>

								{/* Category */}
								<div className='space-y-2'>
									<Label htmlFor='category'>Category</Label>
									<Input
										id='category'
										placeholder='e.g., Bar Setup, Lounge Area'
										value={formData.category}
										onChange={e =>
											setFormData({
												...formData,
												category: e.target.value,
											})
										}
									/>
								</div>

								{/* Image Upload */}
								<div className='space-y-2'>
									<Label>Collection Images</Label>
									<div className='border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors'>
										<input
											type='file'
											id='collection-images'
											multiple
											accept='image/*'
											onChange={handleImageSelect}
											className='hidden'
										/>
										<label
											htmlFor='collection-images'
											className='cursor-pointer'
										>
											<ImagePlus className='w-12 h-12 mx-auto mb-3 text-muted-foreground' />
											<p className='text-sm text-muted-foreground mb-1'>
												Click to upload collection
												images
											</p>
											<p className='text-xs text-muted-foreground'>
												PNG, JPG, WebP (max 5MB each)
											</p>
										</label>
									</div>

									{/* Image Previews */}
									{previewUrls.length > 0 && (
										<div className='grid grid-cols-3 gap-4 mt-4'>
											{previewUrls.map((url, index) => (
												<div
													key={index}
													className='relative aspect-square rounded-lg overflow-hidden border border-border group'
												>
													<Image
														src={url}
														alt={`Preview ${index + 1}`}
														fill
														className='object-cover'
													/>
													<button
														onClick={() =>
															handleRemoveImage(
																index
															)
														}
														className='absolute top-2 right-2 p-1 bg-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
													>
														<X className='w-4 h-4 text-destructive-foreground' />
													</button>
												</div>
											))}
										</div>
									)}
								</div>
							</div>

							<DialogFooter>
								<Button
									variant='outline'
									onClick={() => setIsCreateDialogOpen(false)}
								>
									Cancel
								</Button>
								<Button
									onClick={handleCreateCollection}
									disabled={
										createMutation.isPending ||
										uploadMutation.isPending ||
										!formData.company ||
										!formData.name
									}
								>
									{createMutation.isPending ||
										uploadMutation.isPending
										? 'Creating...'
										: 'Create Collection'}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				}
			/>

			<div className='p-8'>
				{/* Filters */}
				<div className='mb-8 grid grid-cols-1 md:grid-cols-3 gap-4'>
					{/* Search */}
					<div className='relative'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
						<Input
							placeholder='Search collections...'
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							className='pl-10'
						/>
					</div>

					{/* Company Filter */}
					<Select
						value={selectedCompany}
						onValueChange={(value) => {
							setSelectedCompany(value)
							setSelectedBrand('') // Reset brand when company changes
						}}
					>
						<SelectTrigger>
							<SelectValue placeholder='All companies' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='_all_'>All companies</SelectItem>
							{companies.map(company => (
								<SelectItem key={company.id} value={company.id}>
									{company.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{/* Brand Filter */}
					<Select
						value={selectedBrand}
						onValueChange={setSelectedBrand}
						disabled={
							!selectedCompany || selectedCompany === '_all_'
						}
					>
						<SelectTrigger>
							<SelectValue placeholder='All brands' />
						</SelectTrigger>
						<SelectContent>
							{brands.length > 0 ? (
								<>
									<SelectItem value='_all_'>All brands</SelectItem>
									{brands.map(brand => (
										<SelectItem key={brand.id} value={brand.id}>
											{brand.name}
										</SelectItem>
									))}
								</>
							) : (
								<SelectItem value='_all_' disabled>No brands available</SelectItem>
							)}
						</SelectContent>
					</Select>
				</div>

				{/* Collections Grid */}
				{isLoading ? (
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
						{[...Array(6)].map((_, i) => (
							<Card key={i} className='overflow-hidden'>
								<div className='aspect-video bg-muted animate-pulse' />
								<CardContent className='p-6 space-y-3'>
									<div className='h-6 bg-muted rounded animate-pulse' />
									<div className='h-4 bg-muted rounded w-2/3 animate-pulse' />
								</CardContent>
							</Card>
						))}
					</div>
				) : collections.length === 0 ? (
					<Card className='p-12 text-center'>
						<Package className='w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50' />
						<h3 className='text-lg font-semibold mb-2'>
							No collections found
						</h3>
						<p className='text-muted-foreground text-sm mb-6'>
							Create your first collection to group assets for
							streamlined ordering.
						</p>
						<Button onClick={() => setIsCreateDialogOpen(true)}>
							<Plus className='w-4 h-4 mr-2' />
							Create Collection
						</Button>
					</Card>
				) : (
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
						{collections.map(collection => (
							<Card
								key={collection.id}
								className='overflow-hidden hover:shadow-lg transition-all duration-300 group'
							>
								<Link
									href={`/collections/${collection.id}`}
								>
									<div className='aspect-video bg-muted relative overflow-hidden'>
										{collection.images.length > 0 ? (
											<Image
												src={collection.images[0]}
												alt={collection.name}
												fill
												className='object-cover group-hover:scale-105 transition-transform duration-500'
											/>
										) : (
											<div className='absolute inset-0 flex items-center justify-center'>
												<Layers className='w-16 h-16 text-muted-foreground/30' />
											</div>
										)}

										{/* Overlay with item count */}
										<Badge
											variant='default'
											className='backdrop-blur-sm'
										>
											{collectionsData?.meta?.total}{' '}
											{collectionsData?.meta?.total === 1
												? 'item'
												: 'items'}
										</Badge>
									</div>
								</Link>

								<CardContent className='p-6 space-y-4'>
									<div>
										<Link
											href={`/collections/${collection.id}`}
										>
											<h3 className='text-lg font-semibold mb-1 group-hover:text-primary transition-colors'>
												{collection.name}
											</h3>
										</Link>
										{collection.description && (
											<p className='text-sm text-muted-foreground line-clamp-2'>
												{collection.description}
											</p>
										)}
									</div>

									<div className='flex flex-wrap gap-2'>
										{collection.company?.name && (
											<Badge
												variant='outline'
												className='gap-1.5'
											>
												<Building2 className='w-3 h-3' />
												{collection.company?.name}
											</Badge>
										)}
										{collection.brand?.name && (
											<Badge
												variant='outline'
												className='gap-1.5'
											>
												<Tag className='w-3 h-3' />
												{collection.brand?.name}
											</Badge>
										)}
										{collection.category && (
											<Badge
												variant='outline'
												className='gap-1.5'
											>
												{collection.category}
											</Badge>
										)}
									</div>

									<div className='flex gap-2 pt-2 border-t border-border'>
										<Button
											size='sm'
											variant='outline'
											className='flex-1'
											asChild
										>
											<Link
												href={`/collections/${collection.id}`}
											>
												View Details
											</Link>
										</Button>
										<Button
											size='sm'
											variant='outline'
											onClick={e => {
												e.stopPropagation()
												setConfirmDelete({
													id: collection.id,
													name: collection.name,
												})
											}}
											disabled={deleteMutation.isPending}
											className='gap-2'
										>
											<Trash2 className='w-4 h-4' />
										</Button>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}

				{/* Results count */}
				{!isLoading && collectionsData?.data?.length > 0 && (
					<div className='mt-8 text-center text-sm text-muted-foreground'>
						Showing {collectionsData?.data?.length} collection
						{collectionsData?.data?.length !== 1 ? 's' : ''}
					</div>
				)}
			</div>

			{/* Confirm Delete Dialog */}
			<ConfirmDialog
				open={!!confirmDelete}
				onOpenChange={open => !open && setConfirmDelete(null)}
				onConfirm={handleDeleteCollection}
				title='Delete Collection'
				description={`Are you sure you want to delete collection "${confirmDelete?.name}"?`}
				confirmText='Delete'
				cancelText='Cancel'
				variant='destructive'
			/>
		</div>
	)
}
