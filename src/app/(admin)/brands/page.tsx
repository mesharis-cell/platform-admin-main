'use client'

import { useState, useMemo } from 'react'
import {
	useBrands,
	useCreateBrand,
	useUpdateBrand,
	useDeleteRestoreBrand,
} from '@/hooks/use-brands'
import { useCompanies } from '@/hooks/use-companies'
import {
	Plus,
	Search,
	Trash2,
	Pencil,
	Tag,
	Building2,
	Image as ImageIcon,
	MoreVertical,
	Undo2,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogDescription,
} from '@/components/ui/dialog'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Brand } from '@/types'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export default function BrandsPage() {
	const [searchQuery, setSearchQuery] = useState('')
	const [companyFilter, setCompanyFilter] = useState('all')
	const [includeDeleted, setIncludeDeleted] = useState(false)
	const [isCreateOpen, setIsCreateOpen] = useState(false)
	const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
	const [confirmDelete, setConfirmDelete] = useState<Brand | null>(null)

	const [formData, setFormData] = useState({
		company_id: '',
		name: '',
		description: '',
		logoUrl: '',
	})

	// Fetch companies for reference
	const { data: companiesData } = useCompanies({ limit: '100' })
	const companies = companiesData?.data || []

	// Build query params for brands
	const queryParams = useMemo(() => {
		const params: Record<string, string> = {
			limit: '100',
			offset: '0',
		}
		if (searchQuery) params.search_term = searchQuery
		if (companyFilter && companyFilter !== 'all')
			params.company_id = companyFilter
		if (includeDeleted) params.include_inactive = 'true'
		return params
	}, [searchQuery, companyFilter, includeDeleted])

	// Fetch brands
	const { data, isLoading: loading } = useBrands(queryParams)
	const brands = data?.data || []
	const total = data?.meta?.total || 0

	// Mutations
	const createMutation = useCreateBrand()
	const updateMutation = useUpdateBrand()
	const deleteMutation = useDeleteRestoreBrand()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		try {
			if (editingBrand) {
				// Exclude company field when updating (cannot be changed)
				const { company_id, ...updateData } = formData
				await updateMutation.mutateAsync({
					id: editingBrand.id,
					data: updateData,
				})
				toast.success('Brand updated', {
					description: `${formData.name} has been updated.`,
				})
			} else {
				await createMutation.mutateAsync(formData)
				toast.success('Brand created', {
					description: `${formData.name} has been added.`,
				})
			}

			setIsCreateOpen(false)
			setEditingBrand(null)
			resetForm()
		} catch (error: any) {
			toast.error("Operation failed", {
				description: error.message,
			});
		}
	}

	const handleDeleteRestore = async () => {
		if (!confirmDelete) return

		try {
			await deleteMutation.mutateAsync(confirmDelete.id)
			toast.success('Brand deleted', {
				description: `${confirmDelete.name} has been deleted. Assets are now unbranded.`,
			})
			setConfirmDelete(null)
		} catch (error: any) {
			toast.error('Delete failed', {
				description: error.message,
			})
			setConfirmDelete(null)
		}
	}

	const resetForm = () => {
		setFormData({
			company_id: '',
			name: '',
			description: '',
			logoUrl: '',
		})
	}

	const openEditDialog = (brand: Brand) => {
		setEditingBrand(brand)
		setFormData({
			company_id: brand.company.id, // Note: cannot be changed
			name: brand.name,
			description: brand.description || '',
			logoUrl: brand.logoUrl || '',
		})
		setIsCreateOpen(true)
	}

	return (
		<div className='min-h-screen bg-background'>
			<AdminHeader
				icon={Tag}
				title='BRAND REGISTRY'
				description='Client Brands · Categorization · Asset Tagging'
				stats={{ label: 'REGISTERED BRANDS', value: total }}
				actions={
					<Dialog
						open={isCreateOpen}
						onOpenChange={open => {
							setIsCreateOpen(open)
							if (!open) {
								setEditingBrand(null)
								resetForm()
							}
						}}
					>
						<DialogTrigger asChild>
							<Button className='gap-2 font-mono'>
								<Plus className='h-4 w-4' />
								NEW BRAND
							</Button>
						</DialogTrigger>
						<DialogContent className='max-w-2xl'>
							<DialogHeader>
								<DialogTitle className='font-mono'>
									{editingBrand
										? 'EDIT BRAND'
										: 'CREATE NEW BRAND'}
								</DialogTitle>
								<DialogDescription className='font-mono text-xs'>
									{editingBrand
										? 'Update brand details and identity'
										: 'Add new brand for asset categorization'}
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleSubmit} className='space-y-6'>
								<div className='space-y-2'>
									<Label
										htmlFor='company'
										className='font-mono text-xs flex items-center gap-2'
									>
										<Building2 className='h-3 w-3' />
										PARENT COMPANY *
									</Label>
									<Select
										value={formData.company_id}
										onValueChange={value =>
											setFormData({
												...formData,
												company_id: value,
											})
										}
										disabled={!!editingBrand} // Cannot change company for existing brand
										required
									>
										<SelectTrigger className='font-mono'>
											<SelectValue placeholder='Select company' />
										</SelectTrigger>
										<SelectContent>
											{companies.map(co => (
												<SelectItem
													key={co.id}
													value={co.id}
													className='font-mono'
												>
													{co.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{editingBrand && (
										<p className='text-xs text-muted-foreground font-mono'>
											Company assignment cannot be changed
										</p>
									)}
								</div>

								<div className='space-y-2'>
									<Label
										htmlFor='name'
										className='font-mono text-xs'
									>
										BRAND NAME *
									</Label>
									<Input
										id='name'
										value={formData.name}
										onChange={e =>
											setFormData({
												...formData,
												name: e.target.value,
											})
										}
										placeholder='e.g., Absolut'
										required
										className='font-mono'
									/>
									<p className='text-xs text-muted-foreground font-mono'>
										Must be unique per company
									</p>
								</div>

								<div className='space-y-2'>
									<Label
										htmlFor='description'
										className='font-mono text-xs'
									>
										DESCRIPTION
									</Label>
									<Input
										id='description'
										value={formData.description}
										onChange={e =>
											setFormData({
												...formData,
												description: e.target.value,
											})
										}
										placeholder='Brief brand description'
										className='font-mono'
									/>
								</div>

								<div className='space-y-2'>
									<Label
										htmlFor='logoUrl'
										className='font-mono text-xs flex items-center gap-2'
									>
										<ImageIcon className='h-3 w-3' />
										LOGO URL
									</Label>
									<Input
										id='logoUrl'
										type='url'
										value={formData.logoUrl}
										onChange={e =>
											setFormData({
												...formData,
												logoUrl: e.target.value,
											})
										}
										placeholder='https://cdn.example.com/brands/absolut.png'
										className='font-mono'
									/>
									<p className='text-xs text-muted-foreground font-mono'>
										Must start with http:// or https://, max
										500 chars
									</p>
								</div>

								<div className='flex justify-end gap-3 pt-4 border-t'>
									<Button
										type='button'
										variant='outline'
										onClick={() => {
											setIsCreateOpen(false)
											setEditingBrand(null)
											resetForm()
										}}
										disabled={
											createMutation.isPending ||
											updateMutation.isPending
										}
										className='font-mono'
									>
										CANCEL
									</Button>
									<Button
										type='submit'
										disabled={
											createMutation.isPending ||
											updateMutation.isPending
										}
										className='font-mono'
									>
										{createMutation.isPending ||
											updateMutation.isPending
											? 'PROCESSING...'
											: editingBrand
												? 'UPDATE'
												: 'CREATE'}
									</Button>
								</div>
							</form>
						</DialogContent>
					</Dialog>
				}
			/>

			{/* Control Panel */}
			<div className='border-b border-border bg-card px-8 py-4'>
				<div className='flex items-center gap-4'>
					<div className='relative flex-1 max-w-md'>
						<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
						<Input
							placeholder='Search brands...'
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							className='pl-10 font-mono text-sm'
						/>
					</div>

					<Select
						value={companyFilter}
						onValueChange={setCompanyFilter}
					>
						<SelectTrigger className='w-[250px] font-mono text-sm'>
							<SelectValue placeholder='All Companies' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='all' className='font-mono'>
								All Companies
							</SelectItem>
							{companies.map(co => (
								<SelectItem
									key={co.id}
									value={co.id}
									className='font-mono'
								>
									{co.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Button
						variant={includeDeleted ? 'default' : 'outline'}
						size='sm'
						onClick={() => setIncludeDeleted(!includeDeleted)}
						className='gap-2 font-mono text-xs'
					>
						<Trash2 className='h-3.5 w-3.5' />
						{includeDeleted ? 'HIDE DELETED' : 'SHOW DELETED'}
					</Button>
				</div>
			</div>

			{/* Data Table with Visual Identity */}
			<div className='px-8 py-6'>
				{loading ? (
					<div className='flex items-center justify-center py-12'>
						<div className='text-sm font-mono text-muted-foreground animate-pulse'>
							LOADING BRANDS...
						</div>
					</div>
				) : brands.length === 0 ? (
					<div className='text-center py-12 space-y-3'>
						<Tag className='h-12 w-12 mx-auto text-muted-foreground opacity-50' />
						<p className='font-mono text-sm text-muted-foreground'>
							NO BRANDS FOUND
						</p>
						<Button
							onClick={() => setIsCreateOpen(true)}
							variant='outline'
							className='font-mono text-xs'
						>
							<Plus className='h-3.5 w-3.5 mr-2' />
							CREATE FIRST BRAND
						</Button>
					</div>
				) : (
					<div className='border border-border rounded-lg overflow-hidden bg-card'>
						<Table>
							<TableHeader>
								<TableRow className='bg-muted/50 border-border/50'>
									<TableHead className='font-mono text-xs font-bold'>
										BRAND
									</TableHead>
									<TableHead className='font-mono text-xs font-bold'>
										COMPANY
									</TableHead>
									<TableHead className='font-mono text-xs font-bold'>
										DESCRIPTION
									</TableHead>
									<TableHead className='font-mono text-xs font-bold'>
										LOGO
									</TableHead>
									<TableHead className='font-mono text-xs font-bold'>
										STATUS
									</TableHead>
									<TableHead className='w-12'></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{brands.map((brand, index) => (
									<TableRow
										key={brand.id}
										className='group hover:bg-muted/30 transition-colors border-border/50'
										style={{
											animationDelay: `${index * 50}ms`,
										}}
									>
										<TableCell className='font-mono font-medium'>
											<div className='flex items-center gap-3'>
												<div className='h-10 w-10 rounded-md border-2 border-primary/20 flex items-center justify-center overflow-hidden bg-linear-gradient-to-br from-primary/5 to-primary/10'>
													{brand.logoUrl ? (
														<img
															src={brand.logoUrl}
															alt={brand.name}
															className='h-full w-full object-contain'
														/>
													) : (
														<Tag className='h-5 w-5 text-primary' />
													)}
												</div>
												<div>
													<div className='font-bold text-base'>
														{brand.name}
													</div>
													<div className='text-xs text-muted-foreground'>
														ID:{' '}
														{brand.id.slice(0, 8)}
														...
													</div>
												</div>
											</div>
										</TableCell>
										<TableCell className='font-mono'>
											<div className='flex items-center gap-2'>
												<Building2 className='h-3.5 w-3.5 text-muted-foreground' />
												<span className='text-sm'>
													{brand.company.name || 'Unknown'}
												</span>
											</div>
										</TableCell>
										<TableCell className='font-mono text-sm text-muted-foreground max-w-md'>
											{brand.description || '—'}
										</TableCell>
										<TableCell className='font-mono text-xs'>
											{brand.logoUrl ? (
												<a
													href={brand.logoUrl}
													target='_blank'
													rel='noopener noreferrer'
													className='text-primary hover:underline flex items-center gap-1'
												>
													<ImageIcon className='h-3 w-3' />
													View
												</a>
											) : (
												<span className='text-muted-foreground'>
													No logo
												</span>
											)}
										</TableCell>
										<TableCell>
											{brand.is_active ? (
												<Badge
													variant='outline'
													className='font-mono text-xs border-primary/30 text-primary'
												>
													ACTIVE
												</Badge>
											) : (
												<Badge
													variant='outline'
													className='font-mono text-xs border-destructive/30 text-destructive'
												>
													DELETED
												</Badge>
											)}
										</TableCell>
										<TableCell>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant='ghost'
														size='sm'
														className='h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity'
													>
														<MoreVertical className='h-4 w-4' />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align='end'>
													<DropdownMenuItem
														onClick={() =>
															openEditDialog(
																brand
															)
														}
														className='font-mono text-xs'
													>
														<Pencil className='h-3.5 w-3.5 mr-2' />
														Edit Brand
													</DropdownMenuItem>

													<DropdownMenuItem
														onClick={() =>
															setConfirmDelete(
																brand
															)
														}
														className={`font-mono text-xs ${brand.is_active ? 'text-destructive' : 'text-primary'}`}
													>
														{brand.is_active ? <Trash2 className='h-3.5 w-3.5 mr-2' /> : <Undo2 className='h-3.5 w-3.5 mr-2' />}
														{brand.is_active ? 'Delete Brand' : 'Restore Brand'}
													</DropdownMenuItem>

												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</div>

			<div className='fixed bottom-4 right-4 font-mono text-xs text-muted-foreground/40'>
				ZONE: ADMIN-BRANDS · SEC-LEVEL: PMG-ADMIN
			</div>

			{/* Confirm Delete Dialog */}
			<ConfirmDialog
				open={!!confirmDelete}
				onOpenChange={open => !open && setConfirmDelete(null)}
				onConfirm={handleDeleteRestore}
				title={confirmDelete?.is_active ? 'Delete Brand' : 'Restore Brand'}
				description={`Are you sure you want to ${confirmDelete?.is_active ? 'delete' : 'restore'} ${confirmDelete?.name}? ${confirmDelete?.is_active ? 'This will make all associated assets unbranded (assets will not be deleted).' : ''}`}
				confirmText={confirmDelete?.is_active ? 'Delete' : 'Restore'}
				cancelText='Cancel'
				variant={confirmDelete?.is_active ? 'destructive' : 'default'}
			/>
		</div>
	)
}
