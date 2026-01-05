'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
	useCollection,
	useUpdateCollection,
	useDeleteCollection,
	useAddCollectionItem,
	useRemoveCollectionItem,
	useUpdateCollectionItem,
	useUploadCollectionImages,
} from '@/hooks/use-collections'
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
import { Card, CardContent } from '@/components/ui/card'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import {
	ArrowLeft,
	Package,
	Pencil,
	Plus,
	Trash2,
	ImagePlus,
	X,
	Layers,
	AlertCircle,
	CheckCircle,
	Building2,
	Tag,
	ChevronRight,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function CollectionDetailPage() {
	const params = useParams()
	const router = useRouter()
	const collectionId = params?.id as string

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

	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
	const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)
	const [confirmDeleteCollection, setConfirmDeleteCollection] = useState(false)
	const [confirmRemoveItem, setConfirmRemoveItem] = useState<{
		id: string
		name: string
	} | null>(null)

	// Fetch data
	const { data: collectionData, isLoading } = useCollection(collectionId)

	const collection = collectionData?.data

	const updateMutation = useUpdateCollection(collectionId)
	const deleteMutation = useDeleteCollection()
	const addItemMutation = useAddCollectionItem(collectionId)
	const removeItemMutation = useRemoveCollectionItem(collectionId)
	const updateItemMutation = useUpdateCollectionItem
	const uploadMutation = useUploadImage()

	console.log(collectionData)

	// Fetch assets for adding to collection
	const companyId = collection?.company_id

	const { data: assetsData } = useAssets({
		company_id: typeof companyId === 'string' ? companyId : undefined,
		limit: '200',
	})

	// Edit form state
	const [editFormData, setEditFormData] = useState({
		name: '',
		description: '',
		category: '',
		images: [] as string[],
	})

	// Add item form state
	const [addItemFormData, setAddItemFormData] = useState({
		asset_id: '',
		default_quantity: 1,
		notes: undefined,
	})

	const [selectedImages, setSelectedImages] = useState<File[]>([])
	const [previewUrls, setPreviewUrls] = useState<string[]>([])

	// Initialize edit form when collection loads or dialog opens
	useEffect(() => {
		if (collection && isEditDialogOpen) {
			setEditFormData({
				name: collection.name,
				description: collection.description || '',
				category: collection.category || '',
				images: collection.images,
			})
		}
	}, [collection, isEditDialogOpen])

	const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || [])
		setSelectedImages(files)

		const urls = files.map(file => URL.createObjectURL(file))
		setPreviewUrls(urls)
	}

	const handleRemoveNewImage = (index: number) => {
		const newImages = [...selectedImages]
		const newPreviews = [...previewUrls]

		URL.revokeObjectURL(newPreviews[index])

		newImages.splice(index, 1)
		newPreviews.splice(index, 1)

		setSelectedImages(newImages)
		setPreviewUrls(newPreviews)
	}

	const handleRemoveExistingImage = (index: number) => {
		const newImages = [...editFormData.images]
		newImages.splice(index, 1)
		setEditFormData({ ...editFormData, images: newImages })
	}

	const handleUpdateCollection = async () => {
		try {
			// Upload new images if any
			let newImageUrls: string[] = []
			if (selectedImages.length > 0) {
				const formData = new FormData()
				selectedImages.forEach(file => formData.append('files', file))
				const uploadResult = await uploadMutation.mutateAsync(formData)
				newImageUrls = uploadResult.data?.imageUrls || []
			}

			await updateMutation.mutateAsync({
				name: editFormData.name,
				description: editFormData.description || undefined,
				category: editFormData.category || undefined,
				images: [...editFormData.images, ...newImageUrls],
			})

			toast.success('Collection updated successfully')
			setIsEditDialogOpen(false)
			setSelectedImages([])
			setPreviewUrls([])
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: 'Failed to update collection'
			)
		}
	}

	const handleDeleteCollection = async () => {
		if (!collection) return

		try {
			await deleteMutation.mutateAsync(collectionId)
			toast.success('Collection deleted successfully')
			router.push('/collections')
			setConfirmDeleteCollection(false)
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: 'Failed to delete collection'
			)
			setConfirmDeleteCollection(false)
		}
	}

	const handleAddItem = async () => {
		try {
			if (!addItemFormData.asset_id || addItemFormData.default_quantity < 1) {
				toast.error('Asset and positive quantity are required')
				return
			}

			await addItemMutation.mutateAsync({
				asset_id: addItemFormData.asset_id,
				default_quantity: addItemFormData.default_quantity,
				notes: addItemFormData.notes || '',
			})

			toast.success('Item added to collection')
			setIsAddItemDialogOpen(false)
			setAddItemFormData({
				asset_id: '',
				default_quantity: 1,
				notes: undefined,
			})
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to add item'
			)
		}
	}

	const handleRemoveItem = async () => {
		if (!confirmRemoveItem) return

		try {
			await removeItemMutation.mutateAsync(confirmRemoveItem.id)
			toast.success('Item removed from collection')
			setConfirmRemoveItem(null)
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to remove item'
			)
			setConfirmRemoveItem(null)
		}
	}

	if (isLoading) {
		return (
			<div className='min-h-screen bg-background p-8'>
				<div className='animate-pulse space-y-8'>
					<div className='h-8 bg-muted rounded w-1/3' />
					<div className='h-64 bg-muted rounded' />
					<div className='space-y-4'>
						{[...Array(3)].map((_, i) => (
							<div key={i} className='h-32 bg-muted rounded' />
						))}
					</div>
				</div>
			</div>
		)
	}

	if (!collection) {
		return (
			<div className='min-h-screen bg-background p-8 flex items-center justify-center'>
				<Card className='p-12 text-center max-w-md'>
					<AlertCircle className='w-16 h-16 mx-auto mb-4 text-destructive' />
					<h3 className='text-lg font-semibold mb-2'>
						Collection Not Found
					</h3>
					<p className='text-muted-foreground text-sm mb-6'>
						This collection may have been deleted or you don't have
						access to it.
					</p>
					<Button asChild>
						<Link href='/collections'>
							Back to Collections
						</Link>
					</Button>
				</Card>
			</div>
		)
	}

	const assets = assetsData?.data || []
	const totalVolume = collection?.assets?.reduce(
		(sum, item) =>
			sum + parseFloat(item?.asset?.volume_per_unit || '0') * item?.default_quantity,
		0
	)
	const totalWeight = collection?.assets?.reduce(
		(sum, item) =>
			sum + parseFloat(item?.asset?.weight_per_unit || '0') * item?.default_quantity,
		0
	)

	return (
		<div className='min-h-screen bg-background p-8'>
			{/* Header */}
			<div className='mb-8'>
				<Link
					href='/collections'
					className='inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors'
				>
					<ArrowLeft className='w-4 h-4' />
					Back to Collections
				</Link>

				<div className='flex items-start justify-between gap-6'>
					<div className='flex-1'>
						<div className='flex items-center gap-3 mb-2'>
							<div className='p-2 bg-primary/10 rounded-lg'>
								<Layers className='w-6 h-6 text-primary' />
							</div>
							<h1 className='text-4xl font-bold tracking-tight text-foreground'>
								{collection.name}
							</h1>
						</div>

						{collection.description && (
							<p className='text-muted-foreground mt-3 max-w-3xl'>
								{collection.description}
							</p>
						)}

						<div className='flex flex-wrap gap-2 mt-4'>
							{collection.company?.name && (
								<Badge variant='outline' className='gap-1.5'>
									<Building2 className='w-3 h-3' />
									{collection.company?.name}
								</Badge>
							)}
							{collection.brand?.name && (
								<Badge variant='outline' className='gap-1.5'>
									<Tag className='w-3 h-3' />
									{collection.brand?.name}
								</Badge>
							)}
							{collection.category && (
								<Badge variant='outline'>
									{collection.category}
								</Badge>
							)}
							<Badge variant='secondary'>
								{collectionData?.data?.assets?.length}{' '}
								{collectionData?.data?.assets?.length === 1 ? 'item' : 'items'}
							</Badge>
						</div>
					</div>

					<div className='flex gap-2'>
						<Dialog
							open={isEditDialogOpen}
							onOpenChange={setIsEditDialogOpen}
						>
							<DialogTrigger asChild>
								<Button variant='outline' className='gap-2'>
									<Pencil className='w-4 h-4' />
									Edit
								</Button>
							</DialogTrigger>
							<DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
								<DialogHeader>
									<DialogTitle className='text-2xl'>
										Edit Collection
									</DialogTitle>
								</DialogHeader>

								<div className='space-y-6 py-4'>
									<div className='space-y-2'>
										<Label htmlFor='edit-name'>
											Collection Name
										</Label>
										<Input
											id='edit-name'
											value={editFormData.name}
											onChange={e =>
												setEditFormData({
													...editFormData,
													name: e.target.value,
												})
											}
										/>
									</div>

									<div className='space-y-2'>
										<Label htmlFor='edit-description'>
											Description
										</Label>
										<Textarea
											id='edit-description'
											rows={3}
											value={editFormData.description}
											onChange={e =>
												setEditFormData({
													...editFormData,
													description: e.target.value,
												})
											}
										/>
									</div>

									<div className='space-y-2'>
										<Label htmlFor='edit-category'>
											Category
										</Label>
										<Input
											id='edit-category'
											value={editFormData.category}
											onChange={e =>
												setEditFormData({
													...editFormData,
													category: e.target.value,
												})
											}
										/>
									</div>

									<div className='space-y-2'>
										<Label>Collection Images</Label>

										{/* Existing Images */}
										{editFormData.images.length > 0 && (
											<div>
												<p className='text-sm text-muted-foreground mb-2'>
													Current Images
												</p>
												<div className='grid grid-cols-3 gap-4'>
													{editFormData.images.map(
														(url, index) => (
															<div
																key={`existing-${index}`}
																className='relative aspect-square rounded-lg overflow-hidden border border-border group'
															>
																<Image
																	src={url}
																	alt={`Existing ${index + 1}`}
																	fill
																	className='object-cover'
																/>
																<button
																	onClick={() =>
																		handleRemoveExistingImage(
																			index
																		)
																	}
																	className='absolute top-2 right-2 p-1 bg-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
																>
																	<X className='w-4 h-4 text-destructive-foreground' />
																</button>
															</div>
														)
													)}
												</div>
											</div>
										)}

										{/* Upload New Images */}
										<div className='border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors mt-4'>
											<input
												type='file'
												id='edit-images'
												multiple
												accept='image/*'
												onChange={handleImageSelect}
												className='hidden'
											/>
											<label
												htmlFor='edit-images'
												className='cursor-pointer'
											>
												<ImagePlus className='w-10 h-10 mx-auto mb-2 text-muted-foreground' />
												<p className='text-sm text-muted-foreground'>
													Click to upload additional
													images
												</p>
											</label>
										</div>

										{/* New Image Previews */}
										{previewUrls.length > 0 && (
											<div>
												<p className='text-sm text-muted-foreground mb-2'>
													New Images to Add
												</p>
												<div className='grid grid-cols-3 gap-4'>
													{previewUrls.map(
														(url, index) => (
															<div
																key={`new-${index}`}
																className='relative aspect-square rounded-lg overflow-hidden border border-border group'
															>
																<Image
																	src={url}
																	alt={`Preview ${index + 1}`}
																	fill
																	className='object-cover'
																/>
																<button
																	onClick={() => handleRemoveNewImage(index)}
																	className='absolute top-2 right-2 p-1 bg-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
																>
																	<X className='w-4 h-4 text-destructive-foreground' />
																</button>
															</div>
														)
													)}
												</div>
											</div>
										)}
									</div>
								</div>

								<DialogFooter>
									<Button
										variant='outline'
										onClick={() => setIsEditDialogOpen(false)}
									>
										Cancel
									</Button>
									<Button
										onClick={handleUpdateCollection}
										disabled={
											updateMutation.isPending ||
											uploadMutation.isPending
										}
									>
										{updateMutation.isPending ||
											uploadMutation.isPending
											? 'Updating...'
											: 'Update Collection'}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>

						<Button
							variant='outline'
							onClick={() => setConfirmDeleteCollection(true)}
							disabled={deleteMutation.isPending}
							className='gap-2 text-destructive hover:text-destructive'
						>
							<Trash2 className='w-4 h-4' />
							Delete
						</Button>
					</div>
				</div>
			</div>

			{/* Collection Images */}
			{collection.images.length > 0 && (
				<div className='mb-8'>
					<h2 className='text-xl font-semibold mb-4'>Images</h2>
					<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
						{collection.images.map((image, index) => (
							<div
								key={index}
								className='aspect-square rounded-lg overflow-hidden border border-border relative group'
							>
								<Image
									src={image}
									alt={`${collection.name} ${index + 1}`}
									fill
									className='object-cover group-hover:scale-110 transition-transform duration-500'
								/>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Summary Stats */}
			<div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
				<Card>
					<CardContent className='p-6'>
						<div className='text-sm text-muted-foreground mb-1'>
							Total Items
						</div>
						<div className='text-3xl font-bold'>
							{collection?.assets?.length}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className='p-6'>
						<div className='text-sm text-muted-foreground mb-1'>
							Total Volume
						</div>
						<div className='text-3xl font-bold'>
							{totalVolume.toFixed(3)} m³
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className='p-6'>
						<div className='text-sm text-muted-foreground mb-1'>
							Total Weight
						</div>
						<div className='text-3xl font-bold'>
							{totalWeight.toFixed(2)} kg
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Collection Items */}
			<div className='mb-8'>
				<div className='flex items-center justify-between mb-4'>
					<h2 className='text-xl font-semibold'>Collection Items</h2>

					<Dialog
						open={isAddItemDialogOpen}
						onOpenChange={setIsAddItemDialogOpen}
					>
						<DialogTrigger asChild>
							<Button className='gap-2'>
								<Plus className='w-4 h-4' />
								Add Item
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>
									Add Item to Collection
								</DialogTitle>
							</DialogHeader>

							<div className='space-y-4 py-4'>
								<div className='space-y-2'>
									<Label htmlFor='add-asset'>Asset</Label>
									<Select
										value={addItemFormData.asset_id}
										onValueChange={value =>
											setAddItemFormData({
												...addItemFormData,
												asset_id: value,
											})
										}
									>
										<SelectTrigger id='add-asset'>
											<SelectValue placeholder='Select asset' />
										</SelectTrigger>
										<SelectContent>
											{assets.map(asset => (
												<SelectItem
													key={asset.id}
													value={asset.id}
												>
													{asset.name} (Available:{' '}
													{asset?.available_quantity})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className='space-y-2'>
									<Label htmlFor='add-quantity'>
										Default Quantity
									</Label>
									<Input
										id='add-quantity'
										type='number'
										min='1'
										value={addItemFormData.default_quantity}
										onChange={e =>
											setAddItemFormData({
												...addItemFormData,
												default_quantity:
													parseInt(e.target.value) ||
													1,
											})
										}
									/>
								</div>

								<div className='space-y-2'>
									<Label htmlFor='add-notes'>
										Notes (Optional)
									</Label>
									<Textarea
										id='add-notes'
										rows={2}
										value={addItemFormData.notes}
										onChange={e =>
											setAddItemFormData({
												...addItemFormData,
												notes: e.target.value,
											})
										}
									/>
								</div>
							</div>

							<DialogFooter>
								<Button
									variant='outline'
									onClick={() =>
										setIsAddItemDialogOpen(false)
									}
								>
									Cancel
								</Button>
								<Button
									onClick={handleAddItem}
									disabled={addItemMutation.isPending}
								>
									{addItemMutation.isPending
										? 'Adding...'
										: 'Add Item'}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>

				{collection?.assets?.length === 0 ? (
					<Card className='p-12 text-center'>
						<Package className='w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50' />
						<h3 className='text-lg font-semibold mb-2'>
							No items yet
						</h3>
						<p className='text-muted-foreground text-sm mb-6'>
							Add assets to this collection to create a complete
							bundle.
						</p>
						<Button onClick={() => setIsAddItemDialogOpen(true)}>
							<Plus className='w-4 h-4 mr-2' />
							Add First Item
						</Button>
					</Card>
				) : (
					<div className='space-y-4'>
						{collection?.assets?.map(item => (
							<Card
								key={item.id}
								className='overflow-hidden hover:shadow-md transition-shadow'
							>
								<CardContent className='p-6'>
									<div className='flex gap-6'>
										{/* Asset Image */}
										<div className='w-24 h-24 rounded-lg overflow-hidden border border-border shrink-0'>
											{item?.asset?.images?.length >
												0 ? (
												<Image
													src={
														item?.asset?.images?.[0]
													}
													alt={item?.asset?.name}
													width={96}
													height={96}
													className='object-cover w-full h-full'
												/>
											) : (
												<div className='w-full h-full bg-muted flex items-center justify-center'>
													<Package className='w-8 h-8 text-muted-foreground/30' />
												</div>
											)}
										</div>

										{/* Asset Details */}
										<div className='flex-1'>
											<div className='flex items-start justify-between mb-2'>
												<div>
													<h3 className='text-lg font-semibold mb-1'>
														{item?.asset.name}
													</h3>
													<div className='flex items-center gap-2 text-sm text-muted-foreground'>
														<span>
															{item?.asset.category}
														</span>
														<span>•</span>
														<span>
															Qty:{' '}
															{
																item.default_quantity
															}
														</span>
														<span>•</span>
														<span>
															{(
																parseFloat(
																	item?.asset?.volume_per_unit
																) *
																item.default_quantity
															).toFixed(2)}{' '}
															m³
														</span>
														<span>•</span>
														<span>
															{(
																parseFloat(
																	item?.asset?.weight_per_unit
																) *
																item.default_quantity
															).toFixed(2)}{' '}
															kg
														</span>
													</div>
												</div>

												<Button
													size='sm'
													variant='outline'
													onClick={() =>
														setConfirmRemoveItem({
															id: item.id,
															name: item?.name,
														})
													}
													disabled={
														removeItemMutation.isPending
													}
													className='gap-2'
												>
													<Trash2 className='w-4 h-4' />
												</Button>
											</div>

											<div className='flex items-center gap-3 mt-3'>
												<Badge
													variant='outline'
													className={getConditionColor(
														item?.asset?.condition
													)}
												>
													{item?.asset?.condition}
												</Badge>
												<Badge variant='outline'>
													{item?.asset?.available_quantity >=
														item.default_quantity ? (
														<>
															<CheckCircle className='w-3 h-3 mr-1' />
															Available
														</>
													) : (
														<>
															<AlertCircle className='w-3 h-3 mr-1' />
															Low Stock
														</>
													)}
												</Badge>
												<span className='text-sm text-muted-foreground'>
													{
														item?.asset?.available_quantity
													}{' '}
													/{' '}
													{
														item?.asset?.total_quantity
													}{' '}
													available
												</span>
											</div>

											{item?.asset?.notes && (
												<p className='text-sm text-muted-foreground mt-2 italic'>
													Note: {item?.asset?.notes}
												</p>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>

			{/* Confirm Delete Collection Dialog */}
			<ConfirmDialog
				open={confirmDeleteCollection}
				onOpenChange={setConfirmDeleteCollection}
				onConfirm={handleDeleteCollection}
				title='Delete Collection'
				description={`Are you sure you want to delete collection "${collection?.name}"?`}
				confirmText='Delete'
				cancelText='Cancel'
				variant='destructive'
			/>

			{/* Confirm Remove Item Dialog */}
			<ConfirmDialog
				open={!!confirmRemoveItem}
				onOpenChange={open => !open && setConfirmRemoveItem(null)}
				onConfirm={handleRemoveItem}
				title='Remove Item'
				description={`Remove "${confirmRemoveItem?.name}" from collection?`}
				confirmText='Remove'
				cancelText='Cancel'
				variant='destructive'
			/>
		</div>
	)
}