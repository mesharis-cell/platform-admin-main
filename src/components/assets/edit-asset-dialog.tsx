'use client'

/**
 * Edit Asset Dialog - Multi-step Form for Updating Assets
 *
 * Design: Warehouse terminal interface matching create dialog
 */

import { useState, useEffect } from 'react'
import { useCompanies } from '@/hooks/use-companies'
import { useWarehouses } from '@/hooks/use-warehouses'
import { useZones } from '@/hooks/use-zones'
import { useBrands } from '@/hooks/use-brands'
import { useUpdateAsset, useUploadImage } from '@/hooks/use-assets'
import {
	Upload,
	Package,
	Ruler,
	Check,
	X,
	Loader2,
	Image as ImageIcon,
	ChevronRight,
	Save,
	AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { AssetWithDetails } from '@/types/asset'

const STEPS = [
	{ id: 'basic', label: 'Basic Info', icon: Package },
	{ id: 'photos', label: 'Photos', icon: ImageIcon },
	{ id: 'specs', label: 'Specifications', icon: Ruler },
]

const HANDLING_TAGS = ['Fragile', 'HighValue', 'HeavyLift', 'AssemblyRequired']
const DEFAULT_CATEGORIES = ['Furniture', 'Glassware', 'Installation', 'Decor']

interface EditAssetDialogProps {
	asset: AssetWithDetails
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess: () => void
}

// Helper function to extract ID from string or object
const extractId = (value: any): string => {
	if (!value) return ''
	if (typeof value === 'string') return value
	if (typeof value === 'object' && value.id) return value.id
	return ''
}

export function EditAssetDialog({
	asset,
	open,
	onOpenChange,
	onSuccess,
}: EditAssetDialogProps) {
	const [currentStep, setCurrentStep] = useState(0)
	const [formData, setFormData] = useState({
		company: extractId(asset.company),
		brand: extractId(asset.brand) || undefined,
		warehouse: extractId(asset.warehouse),
		zone: extractId(asset.zone),
		name: asset.name,
		description: asset.description || '',
		category: asset.category,
		images: asset.images,
		weight: asset.weight,
		dimensionLength: asset.dimensionLength,
		dimensionWidth: asset.dimensionWidth,
		dimensionHeight: asset.dimensionHeight,
		volume: asset.volume,
		condition: asset.condition,
		refurbDaysEstimate: asset.refurbDaysEstimate || undefined,
		conditionNotes: asset.latestConditionNotes || '',
		handlingTags: asset.handlingTags,
		packaging: asset.packaging || '',
	})

	const [customCategory, setCustomCategory] = useState('')
	const [customHandlingTag, setCustomHandlingTag] = useState('')

	// Reset form data when asset changes or dialog opens
	useEffect(() => {
		if (open && asset) {
			setFormData({
				company: extractId(asset.company),
				brand: extractId(asset.brand) || undefined,
				warehouse: extractId(asset.warehouse),
				zone: extractId(asset.zone),
				name: asset.name,
				description: asset.description || '',
				category: asset.category,
				images: asset.images,
				weight: asset.weight,
				dimensionLength: asset.dimensionLength,
				dimensionWidth: asset.dimensionWidth,
				dimensionHeight: asset.dimensionHeight,
				volume: asset.volume,
				condition: asset.condition,
				refurbDaysEstimate: asset.refurbDaysEstimate || undefined,
				conditionNotes: asset.latestConditionNotes || '',
				handlingTags: asset.handlingTags,
				packaging: asset.packaging || '',
			})
			setCurrentStep(0)
			setCustomCategory('')
			setCustomHandlingTag('')
		}
	}, [open, asset])

	// Fetch reference data
	const { data: companiesData } = useCompanies()
	const { data: warehousesData } = useWarehouses()
	const { data: zonesData } = useZones(
		formData.warehouse && typeof formData.warehouse === 'string'
			? { warehouse: formData.warehouse }
			: undefined
	)
	const { data: brandsData } = useBrands(
		formData.company && typeof formData.company === 'string'
			? { company: formData.company }
			: undefined
	)

	const companies = companiesData?.companies || []
	const warehouses = warehousesData?.warehouses || []
	const zones = zonesData?.zones || []
	const brands = brandsData?.brands || []

	// Mutations
	const updateMutation = useUpdateAsset()
	const uploadMutation = useUploadImage()

	async function handleImageUpload(files: FileList | null) {
		if (!files || files.length === 0) return

		const uploadedUrls: string[] = []

		try {
			for (let i = 0; i < files.length; i++) {
				const file = files[i]
				const uploadFormData = new FormData()
				uploadFormData.append('file', file)
				uploadFormData.append('companyId', formData.company)

				try {
					const data =
						await uploadMutation.mutateAsync(uploadFormData)
					uploadedUrls.push(data.imageUrl)
				} catch (error) {
					toast.error(`Failed to upload ${file.name}`)
				}
			}

			setFormData(prev => ({
				...prev,
				images: [...prev.images, ...uploadedUrls],
			}))

			if (uploadedUrls.length > 0) {
				toast.success(`Uploaded ${uploadedUrls.length} image(s)`)
			}
		} catch (error) {
			console.error('Upload error:', error)
			toast.error('Failed to upload images')
		}
	}

	function removeImage(index: number) {
		setFormData(prev => ({
			...prev,
			images: prev.images.filter((_, i) => i !== index),
		}))
	}

	function toggleHandlingTag(tag: string) {
		setFormData(prev => {
			const current = prev.handlingTags
			const updated = current.includes(tag)
				? current.filter(t => t !== tag)
				: [...current, tag]
			return { ...prev, handlingTags: updated }
		})
	}

	function addCustomHandlingTag() {
		if (customHandlingTag.trim()) {
			setFormData(prev => ({
				...prev,
				handlingTags: [...prev.handlingTags, customHandlingTag.trim()],
			}))
			setCustomHandlingTag('')
		}
	}

	function calculateVolume(length?: number, width?: number, height?: number) {
		if (
			length &&
			width &&
			height &&
			length > 0 &&
			width > 0 &&
			height > 0
		) {
			return (length * width * height) / 1000000
		}
		return undefined
	}

	function updateDimension(
		field: 'dimensionLength' | 'dimensionWidth' | 'dimensionHeight',
		value: number
	) {
		const newData = { ...formData, [field]: value }
		const calculatedVolume = calculateVolume(
			field === 'dimensionLength' ? value : formData.dimensionLength,
			field === 'dimensionWidth' ? value : formData.dimensionWidth,
			field === 'dimensionHeight' ? value : formData.dimensionHeight
		)

		if (calculatedVolume !== undefined) {
			newData.volume = calculatedVolume
		}

		setFormData(newData)
	}

	async function handleSubmit() {
		// Validation
		if (!formData.name || !formData.category) {
			toast.error('Please fill all required fields')
			return
		}

		if (
			!formData.weight ||
			!formData.dimensionLength ||
			!formData.dimensionWidth ||
			!formData.dimensionHeight ||
			!formData.volume
		) {
			toast.error('Please fill all physical specifications')
			return
		}

		// Feedback #2: Validate refurb days and notes if condition changed to ORANGE/RED
		if (
			formData.condition !== asset.condition &&
			(formData.condition === 'ORANGE' || formData.condition === 'RED')
		) {
			if (
				!formData.refurbDaysEstimate ||
				formData.refurbDaysEstimate < 1
			) {
				toast.error(
					'Refurb days estimate is required when changing to damaged condition'
				)
				return
			}
			if (
				!formData.conditionNotes ||
				formData.conditionNotes.trim().length < 10
			) {
				toast.error(
					'Condition notes are required when changing to damaged condition (minimum 10 characters)'
				)
				return
			}
		}

		try {
			// Update basic asset info
			await updateMutation.mutateAsync({
				id: asset.id,
				data: {
					brand: formData.brand || null,
					warehouse: formData.warehouse,
					zone: formData.zone,
					name: formData.name,
					description: formData.description || null,
					category: formData.category,
					images: formData.images,
					weight: formData.weight,
					dimensionLength: formData.dimensionLength,
					dimensionWidth: formData.dimensionWidth,
					dimensionHeight: formData.dimensionHeight,
					volume: formData.volume,
					handlingTags: formData.handlingTags,
					packaging: formData.packaging || null,
					condition: formData.condition,
					refurbDaysEstimate:
						formData.condition === 'GREEN'
							? null
							: formData.refurbDaysEstimate,
					conditionNotes: formData.conditionNotes || undefined,
				} as any,
			})
			toast.success('Asset updated successfully')
			onSuccess()
		} catch (error) {
			console.error('Update asset error:', error)
			toast.error(
				error instanceof Error
					? error.message
					: 'Failed to update asset'
			)
		}
	}

	function canProceedToNext() {
		switch (currentStep) {
			case 0: // Basic Info
				return formData.name && formData.category
			case 1: // Photos
				return true // Photos optional
			case 2: // Specifications
				const hasBasicSpecs =
					formData.weight &&
					formData.dimensionLength &&
					formData.dimensionWidth &&
					formData.dimensionHeight &&
					formData.volume

				// Feedback #2: Require refurb days and notes if condition changed to ORANGE/RED
				if (
					formData.condition !== asset.condition &&
					(formData.condition === 'ORANGE' ||
						formData.condition === 'RED')
				) {
					return (
						hasBasicSpecs &&
						formData.refurbDaysEstimate &&
						formData.refurbDaysEstimate > 0 &&
						formData.conditionNotes &&
						formData.conditionNotes.trim().length >= 10
					)
				}

				return hasBasicSpecs
			default:
				return false
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='max-w-3xl max-h-[90vh] overflow-hidden flex flex-col'>
				<DialogHeader>
					<DialogTitle className='font-mono text-xl flex items-center gap-2'>
						<Package className='w-5 h-5 text-primary' />
						Edit Asset
					</DialogTitle>
					<DialogDescription className='font-mono text-xs'>
						Update asset information and specifications
					</DialogDescription>
				</DialogHeader>

				{/* Step indicator */}
				<div className='flex items-center justify-between border-y border-border py-4'>
					{STEPS.map((step, index) => {
						const Icon = step.icon
						const isActive = index === currentStep
						const isCompleted = index < currentStep

						return (
							<div
								key={step.id}
								className='flex items-center flex-1'
							>
								<button
									onClick={() => setCurrentStep(index)}
									disabled={index > currentStep}
									className={`flex items-center gap-2 ${
										isActive
											? 'text-primary'
											: isCompleted
												? 'text-foreground'
												: 'text-muted-foreground'
									} disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:text-primary`}
								>
									<div
										className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
											isActive
												? 'bg-primary text-primary-foreground border-primary'
												: isCompleted
													? 'bg-primary/10 border-primary/20 text-primary'
													: 'bg-muted border-border'
										}`}
									>
										{isCompleted ? (
											<Check className='w-4 h-4' />
										) : (
											<Icon className='w-4 h-4' />
										)}
									</div>
									<span className='text-xs font-mono font-medium'>
										{step.label}
									</span>
								</button>
								{index < STEPS.length - 1 && (
									<div
										className={`flex-1 h-[1px] mx-2 ${isCompleted ? 'bg-primary' : 'bg-border'}`}
									/>
								)}
							</div>
						)
					})}
				</div>

				{/* Step content */}
				<div className='flex-1 overflow-y-auto px-1'>
					{currentStep === 0 && (
						<div className='space-y-4 py-4'>
							<div className='space-y-2'>
								<Label className='font-mono text-xs'>
									Asset Name *
								</Label>
								<Input
									placeholder='e.g., Premium Bar Counter'
									value={formData.name}
									onChange={e =>
										setFormData({
											...formData,
											name: e.target.value,
										})
									}
									className='font-mono'
								/>
							</div>

							<div className='space-y-2'>
								<Label className='font-mono text-xs'>
									Category *
								</Label>
								<div className='space-y-2'>
									<Select
										value={formData.category}
										onValueChange={value => {
											if (value === '__custom__') {
												setCustomCategory('')
												setFormData({
													...formData,
													category: undefined as any,
												})
											} else {
												setFormData({
													...formData,
													category: value as any,
												})
												setCustomCategory('')
											}
										}}
									>
										<SelectTrigger className='font-mono'>
											<SelectValue placeholder='Select category' />
										</SelectTrigger>
										<SelectContent>
											{DEFAULT_CATEGORIES.map(cat => (
												<SelectItem
													key={cat}
													value={cat}
												>
													{cat}
												</SelectItem>
											))}
											<SelectItem value='__custom__'>
												+ Custom Category
											</SelectItem>
										</SelectContent>
									</Select>
									{(customCategory !== '' ||
										(!formData.category &&
											!DEFAULT_CATEGORIES.includes(
												formData.category || ''
											))) && (
										<Input
											placeholder='Enter custom category'
											value={
												customCategory ||
												formData.category
											}
											onChange={e => {
												setCustomCategory(
													e.target.value
												)
												setFormData({
													...formData,
													category: e.target
														.value as any,
												})
											}}
											className='font-mono'
										/>
									)}
								</div>
							</div>

							<div className='space-y-2'>
								<Label className='font-mono text-xs'>
									Description (Optional)
								</Label>
								<Textarea
									placeholder='Detailed description of the asset...'
									value={formData.description}
									onChange={e =>
										setFormData({
											...formData,
											description: e.target.value,
										})
									}
									className='font-mono text-sm'
									rows={3}
								/>
							</div>

							<div className='grid grid-cols-2 gap-4'>
								<div className='space-y-2'>
									<Label className='font-mono text-xs'>
										Warehouse *
									</Label>
									<Select
										value={formData.warehouse}
										onValueChange={value =>
											setFormData({
												...formData,
												warehouse: value,
												zone: undefined,
											})
										}
									>
										<SelectTrigger className='font-mono'>
											<SelectValue placeholder='Select warehouse' />
										</SelectTrigger>
										<SelectContent>
											{warehouses.map(warehouse => (
												<SelectItem
													key={warehouse.id}
													value={warehouse.id}
												>
													{warehouse.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className='space-y-2'>
									<Label className='font-mono text-xs'>
										Zone *
									</Label>
									<Select
										value={formData.zone}
										onValueChange={value =>
											setFormData({
												...formData,
												zone: value,
											})
										}
										disabled={!formData.warehouse}
									>
										<SelectTrigger className='font-mono'>
											<SelectValue
												placeholder={
													!formData.warehouse
														? 'Select warehouse first'
														: zones.length === 0
															? 'No zones available'
															: 'Select zone'
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{zones.length === 0 ? (
												<div className='px-2 py-6 text-center text-sm text-muted-foreground font-mono'>
													No zones for this warehouse
												</div>
											) : (
												zones.map(zone => (
													<SelectItem
														key={zone.id}
														value={zone.id}
													>
														{zone.name}
													</SelectItem>
												))
											)}
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className='space-y-2'>
								<Label className='font-mono text-xs'>
									Brand (Optional)
								</Label>
								<Select
									value={formData.brand}
									onValueChange={value =>
										setFormData({
											...formData,
											brand: value,
										})
									}
									disabled={!formData.company}
								>
									<SelectTrigger className='font-mono'>
										<SelectValue
											placeholder={
												!formData.company
													? 'Select company first'
													: brands.length === 0
														? 'No brands available'
														: 'Select brand'
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{brands.length === 0 ? (
											<div className='px-2 py-6 text-center text-sm text-muted-foreground font-mono'>
												No brands for this company
											</div>
										) : (
											brands.map(brand => (
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
					)}

					{currentStep === 1 && (
						<div className='space-y-4 py-4'>
							<div className='space-y-2'>
								<Label className='font-mono text-xs'>
									Product Photos (Optional)
								</Label>
								<div className='border-2 border-dashed border-border rounded-lg p-6 hover:border-primary/50 transition-colors'>
									<input
										type='file'
										accept='image/*'
										multiple
										onChange={e =>
											handleImageUpload(e.target.files)
										}
										className='hidden'
										id='image-upload-edit'
									/>
									<label
										htmlFor='image-upload-edit'
										className='flex flex-col items-center justify-center cursor-pointer'
									>
										{uploadMutation.isPending ? (
											<Loader2 className='w-8 h-8 text-primary animate-spin mb-2' />
										) : (
											<Upload className='w-8 h-8 text-muted-foreground mb-2' />
										)}
										<span className='text-sm font-mono text-muted-foreground'>
											Click to upload images
										</span>
										<span className='text-xs font-mono text-muted-foreground mt-1'>
											JPG, PNG, WEBP up to 5MB
										</span>
									</label>
								</div>
							</div>

							{/* Image preview grid */}
							{formData.images && formData.images.length > 0 && (
								<div className='grid grid-cols-3 gap-4'>
									{formData.images.map((url, index) => (
										<div
											key={index}
											className='relative group aspect-square rounded-lg overflow-hidden border border-border'
										>
											<img
												src={url}
												alt={`Preview ${index + 1}`}
												className='w-full h-full object-cover'
											/>
											<button
												onClick={() =>
													removeImage(index)
												}
												className='absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-md opacity-0 group-hover:opacity-100 transition-opacity'
											>
												<X className='w-3 h-3' />
											</button>
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{currentStep === 2 && (
						<div className='space-y-4 py-4'>
							<div className='grid grid-cols-3 gap-4'>
								<div className='space-y-2'>
									<Label className='font-mono text-xs'>
										Length (cm) *
									</Label>
									<Input
										type='number'
										step='0.01'
										placeholder='0.00'
										value={formData.dimensionLength}
										onChange={e =>
											updateDimension(
												'dimensionLength',
												parseFloat(e.target.value)
											)
										}
										className='font-mono'
									/>
								</div>
								<div className='space-y-2'>
									<Label className='font-mono text-xs'>
										Width (cm) *
									</Label>
									<Input
										type='number'
										step='0.01'
										placeholder='0.00'
										value={formData.dimensionWidth}
										onChange={e =>
											updateDimension(
												'dimensionWidth',
												parseFloat(e.target.value)
											)
										}
										className='font-mono'
									/>
								</div>
								<div className='space-y-2'>
									<Label className='font-mono text-xs'>
										Height (cm) *
									</Label>
									<Input
										type='number'
										step='0.01'
										placeholder='0.00'
										value={formData.dimensionHeight}
										onChange={e =>
											updateDimension(
												'dimensionHeight',
												parseFloat(e.target.value)
											)
										}
										className='font-mono'
									/>
								</div>
							</div>

							<div className='grid grid-cols-2 gap-4'>
								<div className='space-y-2'>
									<Label className='font-mono text-xs'>
										Weight (kg) *
									</Label>
									<Input
										type='number'
										step='0.01'
										placeholder='0.00'
										value={formData.weight}
										onChange={e =>
											setFormData({
												...formData,
												weight: parseFloat(
													e.target.value
												),
											})
										}
										className='font-mono'
									/>
								</div>
								<div className='space-y-2'>
									<Label className='font-mono text-xs'>
										Volume (m³) * (Auto-calculated,
										editable)
									</Label>
									<Input
										type='number'
										step='0.001'
										placeholder='0.000'
										value={
											formData.volume?.toFixed(3) || ''
										}
										onChange={e =>
											setFormData({
												...formData,
												volume: parseFloat(
													e.target.value
												),
											})
										}
										className='font-mono bg-muted/30'
									/>
								</div>
							</div>

							<div className='space-y-2'>
								<Label className='font-mono text-xs'>
									Condition Status *
								</Label>
								<div className='flex gap-3'>
									{['GREEN', 'ORANGE', 'RED'].map(cond => (
										<button
											key={cond}
											type='button'
											onClick={() =>
												setFormData({
													...formData,
													condition: cond as any,
												})
											}
											className={`flex-1 p-3 rounded-lg border-2 transition-all ${
												formData.condition === cond
													? cond === 'GREEN'
														? 'border-emerald-500 bg-emerald-500/10'
														: cond === 'ORANGE'
															? 'border-amber-500 bg-amber-500/10'
															: 'border-red-500 bg-red-500/10'
													: 'border-border hover:border-muted-foreground'
											}`}
										>
											<div className='flex items-center justify-center gap-2'>
												<div
													className={`w-3 h-3 rounded-full ${
														cond === 'GREEN'
															? 'bg-emerald-500'
															: cond === 'ORANGE'
																? 'bg-amber-500'
																: 'bg-red-500'
													}`}
												/>
												<span className='font-mono text-xs font-medium'>
													{cond === 'GREEN'
														? 'Good'
														: cond === 'ORANGE'
															? 'Minor Issues'
															: 'Damaged'}
												</span>
											</div>
										</button>
									))}
								</div>
							</div>

							{/* Conditional fields for damaged items (Feedback #2) */}
							{(formData.condition === 'ORANGE' ||
								formData.condition === 'RED') && (
								<div className='space-y-4 p-4 bg-muted/30 rounded-lg border border-border'>
									<div className='flex items-center gap-2 text-sm font-semibold text-foreground'>
										<AlertCircle className='w-4 h-4 text-amber-500' />
										<span>
											Damage Information{' '}
											{formData.condition !==
											asset.condition
												? 'Required'
												: '(Optional - Update if needed)'}
										</span>
									</div>

									<div className='space-y-2'>
										<Label className='font-mono text-xs'>
											Estimated Refurb Days{' '}
											{formData.condition !==
											asset.condition
												? '*'
												: ''}
										</Label>
										<Input
											type='number'
											min='1'
											max='90'
											placeholder='e.g., 5'
											value={
												formData.refurbDaysEstimate ||
												''
											}
											onChange={e =>
												setFormData({
													...formData,
													refurbDaysEstimate:
														parseInt(
															e.target.value
														) || undefined,
												})
											}
											className='font-mono'
										/>
										<p className='text-xs font-mono text-muted-foreground'>
											How many days will it take to
											refurbish this item?
										</p>
									</div>

									<div className='space-y-2'>
										<Label className='font-mono text-xs'>
											Condition Notes{' '}
											{formData.condition !==
											asset.condition
												? '*'
												: ''}
										</Label>
										<Textarea
											placeholder='Describe the damage or issues...'
											value={
												formData.conditionNotes || ''
											}
											onChange={e =>
												setFormData({
													...formData,
													conditionNotes:
														e.target.value,
												})
											}
											className='font-mono text-sm'
											rows={3}
										/>
										<p className='text-xs font-mono text-muted-foreground'>
											{formData.condition !==
											asset.condition
												? 'Explain what needs to be repaired or refurbished'
												: 'Add additional notes about the condition (optional)'}
										</p>
									</div>
								</div>
							)}

							<div className='space-y-2'>
								<Label className='font-mono text-xs'>
									Handling Tags (Optional)
								</Label>
								<div className='flex flex-wrap gap-2'>
									{HANDLING_TAGS.map(tag => (
										<Badge
											key={tag}
											variant={
												formData.handlingTags.includes(
													tag
												)
													? 'default'
													: 'outline'
											}
											className='cursor-pointer font-mono text-xs'
											onClick={() =>
												toggleHandlingTag(tag)
											}
										>
											{tag}
										</Badge>
									))}
									{formData.handlingTags
										.filter(
											tag => !HANDLING_TAGS.includes(tag)
										)
										.map(tag => (
											<Badge
												key={tag}
												variant='default'
												className='cursor-pointer font-mono text-xs'
												onClick={() =>
													toggleHandlingTag(tag)
												}
											>
												{tag}{' '}
												<X className='w-3 h-3 ml-1' />
											</Badge>
										))}
								</div>
								<div className='flex gap-2'>
									<Input
										placeholder='Add custom tag...'
										value={customHandlingTag}
										onChange={e =>
											setCustomHandlingTag(e.target.value)
										}
										onKeyDown={e => {
											if (e.key === 'Enter') {
												e.preventDefault()
												addCustomHandlingTag()
											}
										}}
										className='font-mono text-sm'
									/>
									<Button
										type='button'
										size='sm'
										variant='outline'
										onClick={addCustomHandlingTag}
										disabled={!customHandlingTag.trim()}
									>
										<Save className='w-4 h-4' />
									</Button>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer with navigation */}
				<div className='flex items-center justify-between pt-4 border-t border-border'>
					<Button
						variant='outline'
						onClick={() =>
							setCurrentStep(Math.max(0, currentStep - 1))
						}
						disabled={currentStep === 0}
						className='font-mono'
					>
						Previous
					</Button>

					{currentStep < STEPS.length - 1 ? (
						<Button
							onClick={() => setCurrentStep(currentStep + 1)}
							disabled={!canProceedToNext()}
							className='font-mono'
						>
							Next
							<ChevronRight className='w-4 h-4 ml-1' />
						</Button>
					) : (
						<Button
							onClick={handleSubmit}
							disabled={
								!canProceedToNext() || updateMutation.isPending
							}
							className='font-mono'
						>
							{updateMutation.isPending ? (
								<>
									<Loader2 className='w-4 h-4 mr-2 animate-spin' />
									Updating...
								</>
							) : (
								<>
									<Check className='w-4 h-4 mr-2' />
									Update Asset
								</>
							)}
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
