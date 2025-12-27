'use client'

/**
 * Mobile Inbound Scanning Interface
 * Phase 11: QR Code Tracking System + Condition Management
 *
 * Tactical inspection HUD for warehouse return operations:
 * - Full-screen QR camera with condition inspection workflow
 * - Immediate condition assessment (GREEN/ORANGE/RED)
 * - Damage photo documentation for RED items
 * - Discrepancy tracking (BROKEN/LOST/OTHER)
 */

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog'
import {
	useInboundScanProgress,
	useScanInboundItem,
	useCompleteInboundScan,
} from '@/hooks/use-scanning'
import {
	Camera,
	CheckCircle2,
	AlertTriangle,
	XCircle,
	ScanLine,
	Package,
	ShieldAlert,
	ShieldCheck,
	ShieldQuestion,
} from 'lucide-react'
import { toast } from 'sonner'
import { Html5Qrcode } from 'html5-qrcode'

type ScanStep = 'scanning' | 'complete'
type InspectionState = {
	qrCode: string
	assetId: string
	assetName: string
	trackingMethod: 'INDIVIDUAL' | 'BATCH'
	requiredQuantity: number
	scannedQuantity: number
	condition: 'GREEN' | 'ORANGE' | 'RED' | null
	notes: string
	photos: string[]
	refurbDaysEstimate: number | null // Feedback #2: Refurb estimate for damaged items
	discrepancyReason: 'BROKEN' | 'LOST' | 'OTHER' | null
	quantity: number | null
}

export default function InboundScanningPage() {
	const params = useParams()
	const router = useRouter()
	const orderId = params.orderId as string

	const [step, setStep] = useState<ScanStep>('scanning')
	const [cameraPermissionGranted, setCameraPermissionGranted] =
		useState(false)
	const [cameraActive, setCameraActive] = useState(false)
	const [damagePhotoCameraActive, setDamagePhotoCameraActive] =
		useState(false)
	const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false)
	const [currentInspection, setCurrentInspection] =
		useState<InspectionState | null>(null)
	const [lastScannedQR, setLastScannedQR] = useState<string | null>(null)
	const [manualQRInput, setManualQRInput] = useState('')
	const [isScanning, setIsScanning] = useState(false)

	const videoRef = useRef<HTMLVideoElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const qrScannerRef = useRef<Html5Qrcode | null>(null)
	const scannerDivRef = useRef<HTMLDivElement>(null)
	const lastScanTimeRef = useRef<number>(0)

	const scanItem = useScanInboundItem()
	const completeScan = useCompleteInboundScan()
	const progress = useInboundScanProgress(orderId)

	// Initialize scanner when permission is granted
	useEffect(() => {
		if (!cameraPermissionGranted || qrScannerRef.current) return

		const initializeScanner = async () => {
			try {
				const scannerId = 'qr-reader-inbound'
				const scannerDiv = document.getElementById(scannerId)

				if (!scannerDiv) {
					console.error('Scanner div not found')
					toast.error('Scanner initialization failed', {
						description: 'Please refresh and try again',
					})
					return
				}

				// Initialize Html5Qrcode
				qrScannerRef.current = new Html5Qrcode(scannerId)

				// Start scanning
				await qrScannerRef.current.start(
					{ facingMode: 'environment' },
					{
						fps: 10,
						qrbox: { width: 250, height: 250 },
					},
					decodedText => {
						// Debounce: Only allow one scan every 2 seconds
						const now = Date.now()
						if (now - lastScanTimeRef.current < 2000) {
							console.log(
								'⏱️ Scan debounced - too soon after last scan'
							)
							return
						}

						// Prevent duplicate scans while processing
						if (isScanning) {
							console.log('⏱️ Scan ignored - already processing')
							return
						}

						lastScanTimeRef.current = now
						handleCameraScan(decodedText)
					},
					undefined
				)

				setCameraActive(true)
				toast.success('Scanner ready', {
					description: 'Point camera at QR code',
				})
			} catch (error) {
				console.error('Scanner initialization error:', error)
				toast.error('Failed to start scanner', {
					description:
						error instanceof Error
							? error.message
							: 'Unknown error',
				})
			}
		}

		initializeScanner()

		// Cleanup on unmount
		return () => {
			stopCamera()
		}
	}, [cameraPermissionGranted])

	const requestCameraPermission = async () => {
		try {
			// Check if mediaDevices API is available
			if (
				!navigator.mediaDevices ||
				!navigator.mediaDevices.getUserMedia
			) {
				throw new Error(
					'Camera API not available. Please use HTTPS or enable insecure origins in Chrome flags.'
				)
			}

			// Request camera permission
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' },
			})
			// Stop the test stream
			stream.getTracks().forEach(track => track.stop())

			// Mark permission as granted (triggers useEffect to initialize scanner)
			setCameraPermissionGranted(true)

			toast.success('Camera permission granted', {
				description: 'Initializing scanner...',
			})
		} catch (error) {
			console.error('Camera permission error:', error)

			let errorMessage =
				'Please enable camera permissions in your browser settings'

			if (error instanceof Error) {
				if (error.message.includes('Camera API not available')) {
					errorMessage =
						'Camera requires HTTPS or Chrome flag enabled. See instructions below.'
				} else if (error.name === 'NotAllowedError') {
					errorMessage =
						'Camera permission denied. Please allow camera access.'
				} else if (error.name === 'NotFoundError') {
					errorMessage = 'No camera found on this device.'
				} else if (error.name === 'NotReadableError') {
					errorMessage =
						'Camera is already in use by another application.'
				}
			}

			toast.error('Camera access failed', {
				description: errorMessage,
				duration: 5000,
			})
		}
	}

	const stopCamera = async () => {
		// Stop QR scanner if active
		if (qrScannerRef.current && qrScannerRef.current.isScanning) {
			try {
				await qrScannerRef.current.stop()
				qrScannerRef.current.clear()
				qrScannerRef.current = null
			} catch (error) {
				console.error('Error stopping QR scanner:', error)
			}
		}

		// Stop video stream if active (for damage photos)
		if (videoRef.current?.srcObject) {
			const tracks = (
				videoRef.current.srcObject as MediaStream
			).getTracks()
			tracks.forEach(track => track.stop())
		}

		setCameraActive(false)
	}

	const handleCameraScan = async (qrCode: string) => {
		if (!progress.data) return

		// Find asset in progress data
		const asset = progress.data.assets.find(a => a.qrCode === qrCode)

		if (!asset) {
			toast.error('Asset not found in order', {
				description: `QR code: ${qrCode}`,
			})
			return
		}

		// Check if asset is already fully scanned
		if (asset.scannedQuantity >= asset.requiredQuantity) {
			toast.success('Asset already scanned', {
				description: `${asset.assetName} - ${asset.scannedQuantity}/${asset.requiredQuantity} complete`,
			})
			return
		}

		// Pause QR scanner when opening inspection dialog
		if (qrScannerRef.current && qrScannerRef.current.isScanning) {
			try {
				await qrScannerRef.current.pause(true)
				console.log('📸 QR scanner paused for inspection')
			} catch (error) {
				console.error('Error pausing QR scanner:', error)
			}
		}

		// Open inspection dialog
		setCurrentInspection({
			qrCode,
			assetId: asset.assetId,
			assetName: asset.assetName,
			trackingMethod: asset.trackingMethod,
			requiredQuantity: asset.requiredQuantity,
			scannedQuantity: asset.scannedQuantity,
			condition: null,
			notes: '',
			photos: [],
			refurbDaysEstimate: null, // Feedback #2
			discrepancyReason: null,
			quantity: asset.trackingMethod === 'BATCH' ? null : 1,
		})
		setInspectionDialogOpen(true)
	}

	const handleManualScanSubmit = () => {
		if (!manualQRInput.trim()) {
			toast.error('Please enter a QR code')
			return
		}

		handleCameraScan(manualQRInput.trim())
		setManualQRInput('')
	}

	const startDamagePhotoCamera = async () => {
		try {
			console.log('📸 Starting camera for damage photos...')

			if (
				!navigator.mediaDevices ||
				!navigator.mediaDevices.getUserMedia
			) {
				throw new Error('Camera API not available')
			}

			// Request back camera with specific constraints
			const photoStream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: { exact: 'environment' },
					width: { ideal: 1920 },
					height: { ideal: 1080 },
				},
			})

			if (videoRef.current) {
				videoRef.current.srcObject = photoStream

				// Wait for metadata to load before playing
				await new Promise<void>((resolve, reject) => {
					if (!videoRef.current) {
						reject(new Error('Video ref not available'))
						return
					}

					videoRef.current.onloadedmetadata = () => resolve()
					videoRef.current.onerror = () =>
						reject(new Error('Video load error'))

					// Timeout after 5 seconds
					setTimeout(
						() => reject(new Error('Video load timeout')),
						5000
					)
				})

				// Now play the video
				await videoRef.current.play()

				// Set state to trigger re-render and show controls
				setDamagePhotoCameraActive(true)

				console.log('📸 Damage photo camera started successfully')
				toast.success('Camera activated')
			}
		} catch (error) {
			console.error('Camera start error:', error)

			// If exact back camera fails, try without exact constraint
			if (
				error instanceof Error &&
				error.name === 'OverconstrainedError'
			) {
				try {
					console.log('📸 Retrying with relaxed constraints...')
					const photoStream =
						await navigator.mediaDevices.getUserMedia({
							video: {
								facingMode: 'environment',
								width: { ideal: 1920 },
								height: { ideal: 1080 },
							},
						})

					if (videoRef.current) {
						videoRef.current.srcObject = photoStream
						await videoRef.current.play()

						// Set state to trigger re-render and show controls
						setDamagePhotoCameraActive(true)

						toast.success('Camera activated')
						return
					}
				} catch (retryError) {
					console.error('Retry failed:', retryError)
				}
			}

			toast.error('Failed to start camera', {
				description:
					error instanceof Error ? error.message : 'Unknown error',
			})
		}
	}

	const stopDamagePhotoCamera = () => {
		if (videoRef.current?.srcObject) {
			const tracks = (
				videoRef.current.srcObject as MediaStream
			).getTracks()
			tracks.forEach(track => track.stop())
			videoRef.current.srcObject = null
		}
		setDamagePhotoCameraActive(false)
	}

	const captureDamagePhoto = () => {
		if (!canvasRef.current || !videoRef.current || !currentInspection)
			return

		const canvas = canvasRef.current
		const video = videoRef.current

		canvas.width = video.videoWidth
		canvas.height = video.videoHeight
		const ctx = canvas.getContext('2d')
		ctx?.drawImage(video, 0, 0)

		const photoBase64 = canvas.toDataURL('image/jpeg', 0.8)
		setCurrentInspection({
			...currentInspection,
			photos: [...currentInspection.photos, photoBase64],
		})
		toast.success('Photo captured')
	}

	const handleInspectionSubmit = () => {
		if (!currentInspection || !currentInspection.condition) {
			toast.error('Please select condition')
			return
		}

		// Validate notes for ORANGE/RED
		if (
			(currentInspection.condition === 'ORANGE' ||
				currentInspection.condition === 'RED') &&
			!currentInspection.notes.trim()
		) {
			toast.error('Notes required', {
				description:
					'Please describe the issue for ORANGE or RED items',
			})
			return
		}

		// Feedback #2: Validate refurb days for ORANGE/RED
		if (
			(currentInspection.condition === 'ORANGE' ||
				currentInspection.condition === 'RED') &&
			(!currentInspection.refurbDaysEstimate ||
				currentInspection.refurbDaysEstimate < 1)
		) {
			toast.error('Refurb days required', {
				description:
					'Please estimate refurbishment time for damaged items',
			})
			return
		}

		// Validate quantity for BATCH assets
		if (
			currentInspection.trackingMethod === 'BATCH' &&
			!currentInspection.quantity
		) {
			toast.error('Please enter quantity')
			return
		}

		const remainingQuantity =
			currentInspection.requiredQuantity -
			currentInspection.scannedQuantity

		if (
			currentInspection.quantity &&
			currentInspection.quantity > remainingQuantity
		) {
			toast.error('Quantity exceeds remaining amount', {
				description: `Maximum: ${remainingQuantity}`,
			})
			return
		}

		setIsScanning(true)

		scanItem.mutate(
			{
				orderId,
				qrCode: currentInspection.qrCode,
				condition: currentInspection.condition,
				notes: currentInspection.notes || undefined,
				photos:
					currentInspection.photos.length > 0
						? currentInspection.photos
						: undefined,
				refurbDaysEstimate:
					currentInspection.refurbDaysEstimate || undefined, // Feedback #2
				discrepancyReason:
					currentInspection.discrepancyReason || undefined,
				quantity: currentInspection.quantity || undefined,
			},
			{
				onSuccess: async data => {
					const scannedAssetName = currentInspection.assetName // Use from state before clearing
					setLastScannedQR(currentInspection.qrCode)
					setInspectionDialogOpen(false)
					setCurrentInspection(null)
					setIsScanning(false)

					// Stop damage photo camera if active
					stopDamagePhotoCamera()

					// Resume QR scanner
					if (
						qrScannerRef.current &&
						qrScannerRef.current.getState() === 2
					) {
						try {
							await qrScannerRef.current.resume()
							console.log('📸 QR scanner resumed')
						} catch (error) {
							console.error('Error resuming QR scanner:', error)
						}
					}

					toast.success(`Scanned: ${scannedAssetName}`, {
						description: `Condition: ${data.asset?.condition || 'Updated'} | Status: ${data.asset?.status || 'Updated'}`,
					})

					setTimeout(() => setLastScannedQR(null), 2000)

					// Complete scan if 100%
					if (data.progress.percentComplete === 100) {
						handleCompleteScan()
					}
				},
				onError: error => {
					setIsScanning(false)
					toast.error('Scan failed', {
						description: error.message,
					})
				},
			}
		)
	}

	const handleCompleteScan = () => {
		completeScan.mutate(
			{ orderId },
			{
				onSuccess: data => {
					setStep('complete')
					toast.success('Return scan complete', {
						description: `Order ${data.newStatus}`,
					})
					setTimeout(() => {
						router.push(`/admin/orders/${orderId}`)
					}, 2000)
				},
				onError: error => {
					toast.error('Failed to complete scan', {
						description: error.message,
					})
				},
			}
		)
	}

	// Render loading state
	if (progress.isLoading || !progress.data) {
		return (
			<div className='min-h-screen bg-background flex items-center justify-center p-4'>
				<Card className='p-8 text-center space-y-4'>
					<ScanLine className='w-12 h-12 mx-auto animate-pulse text-primary' />
					<h2 className='text-xl font-bold font-mono'>
						LOADING SCAN PROGRESS
					</h2>
					<p className='text-sm text-muted-foreground'>
						Fetching order details...
					</p>
				</Card>
			</div>
		)
	}

	const progressData = progress.data

	return (
		<div className='min-h-screen bg-black text-white relative overflow-hidden'>
			{/* Tactical grid background */}
			<div className='absolute inset-0 opacity-10'>
				<div
					className='absolute inset-0'
					style={{
						backgroundImage: `
              linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
            `,
						backgroundSize: '20px 20px',
					}}
				/>
			</div>

			{/* Header HUD */}
			<div className='relative z-10 p-4 bg-gradient-to-b from-black/80 to-transparent'>
				<div className='flex items-center justify-between mb-4'>
					<div>
						<div className='text-xs text-primary font-mono mb-1'>
							INBOUND SCAN + INSPECTION
						</div>
						<div className='text-lg font-bold font-mono'>
							ORDER #{progressData.orderId.slice(0, 8)}
						</div>
					</div>
					<Badge
						variant='outline'
						className='text-primary border-primary'
					>
						{step.toUpperCase()}
					</Badge>
				</div>

				{/* Progress bar */}
				<div className='space-y-2'>
					<div className='flex justify-between text-xs font-mono'>
						<span>PROGRESS</span>
						<span className='text-primary'>
							{progressData.itemsScanned}/
							{progressData.totalItems} UNITS
						</span>
					</div>
					<Progress
						value={progressData.percentComplete}
						className='h-2'
					/>
					<div className='text-right text-xs text-primary font-bold font-mono'>
						{progressData.percentComplete}%
					</div>
				</div>
			</div>

			{/* Scanning Step */}
			{step === 'scanning' && (
				<div className='relative z-10 p-4 space-y-4'>
					{/* Camera Permission / QR Scanner */}
					{!cameraPermissionGranted ? (
						<div className='space-y-4'>
							<Card className='p-6 text-center space-y-4'>
								<Camera className='w-16 h-16 mx-auto text-primary' />
								<div>
									<h3 className='text-lg font-bold font-mono mb-2'>
										CAMERA ACCESS REQUIRED
									</h3>
									<p className='text-sm text-muted-foreground'>
										Grant camera permission to scan QR codes
									</p>
								</div>
								<Button
									onClick={requestCameraPermission}
									className='w-full h-12 text-lg font-mono font-bold'
								>
									<Camera className='w-5 h-5 mr-2' />
									ENABLE CAMERA
								</Button>
							</Card>
						</div>
					) : (
						<div className='relative bg-black rounded-lg overflow-hidden border-2 border-primary/30'>
							{/* Html5Qrcode scanner container - always rendered */}
							<div
								id='qr-reader-inbound'
								ref={scannerDivRef}
								className='w-full h-full'
							/>

							{/* Last scanned confirmation overlay */}
							{lastScannedQR && (
								<div className='absolute top-4 left-4 right-4 z-10'>
									<div className='bg-primary text-black p-3 rounded-lg font-mono text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top'>
										<CheckCircle2 className='w-5 h-5' />
										INSPECTION COMPLETE
									</div>
								</div>
							)}

							{/* Loading overlay while initializing */}
							{!cameraActive && (
								<div className='absolute inset-0 flex items-center justify-center bg-black/50'>
									<div className='text-center space-y-2'>
										<ScanLine className='w-12 h-12 mx-auto animate-pulse text-primary' />
										<p className='text-sm font-mono'>
											Initializing scanner...
										</p>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Manual QR input */}
					<div className='space-y-2'>
						<label className='text-xs font-mono text-muted-foreground'>
							MANUAL QR CODE INPUT
						</label>
						<div className='flex gap-2'>
							<input
								type='text'
								placeholder='Enter QR code or scan...'
								value={manualQRInput}
								onChange={e => setManualQRInput(e.target.value)}
								className='flex-1 bg-muted text-foreground px-4 py-3 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary'
								onKeyDown={e => {
									if (e.key === 'Enter') {
										e.preventDefault()
										handleManualScanSubmit()
									}
								}}
							/>
							<Button
								variant='default'
								size='icon'
								className='shrink-0'
								onClick={handleManualScanSubmit}
							>
								<ScanLine className='w-5 h-5' />
							</Button>
						</div>
					</div>

					{/* Assets list */}
					<div className='space-y-2 max-h-64 overflow-y-auto'>
						<div className='text-xs font-mono text-muted-foreground mb-2'>
							ITEMS TO INSPECT
						</div>
						{progressData.assets.map(asset => (
							<div
								key={asset.assetId}
								className={`p-3 rounded-lg border ${
									asset.scannedQuantity ===
									asset.requiredQuantity
										? 'bg-primary/10 border-primary/30'
										: 'bg-muted/20 border-border'
								}`}
							>
								<div className='flex items-center justify-between'>
									<div className='flex-1'>
										<div className='font-mono text-sm font-bold'>
											{asset.assetName}
										</div>
										<div className='text-xs text-muted-foreground'>
											QR: {asset.qrCode} •{' '}
											{asset.trackingMethod}
										</div>
									</div>
									<div className='text-right'>
										<div className='text-sm font-mono font-bold'>
											{asset.scannedQuantity}/
											{asset.requiredQuantity}
										</div>
										{asset.scannedQuantity ===
										asset.requiredQuantity ? (
											<CheckCircle2 className='w-5 h-5 text-primary ml-auto' />
										) : (
											<Package className='w-5 h-5 text-muted-foreground ml-auto' />
										)}
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Complete scan button */}
					{progressData.percentComplete === 100 && (
						<Button
							onClick={handleCompleteScan}
							className='w-full h-14 text-lg font-mono font-bold bg-primary hover:bg-primary/90'
							disabled={completeScan.isPending}
						>
							{completeScan.isPending
								? 'CLOSING ORDER...'
								: 'COMPLETE RETURN SCAN'}
						</Button>
					)}
				</div>
			)}

			{/* Condition Inspection Dialog */}
			<Dialog
				open={inspectionDialogOpen}
				onOpenChange={setInspectionDialogOpen}
			>
				<DialogContent className='max-w-md max-h-[90vh] overflow-y-auto'>
					{currentInspection && (
						<>
							<DialogHeader>
								<DialogTitle className='font-mono'>
									CONDITION INSPECTION
								</DialogTitle>
								<p className='text-sm text-muted-foreground font-mono'>
									{currentInspection.assetName}
								</p>
								<p className='text-xs text-muted-foreground font-mono'>
									QR: {currentInspection.qrCode} •{' '}
									{currentInspection.trackingMethod}
								</p>
							</DialogHeader>

							<div className='space-y-4'>
								{/* Quantity input for BATCH assets */}
								{currentInspection.trackingMethod ===
									'BATCH' && (
									<div className='space-y-2'>
										<label className='text-xs font-mono font-bold'>
											QUANTITY RETURNING *
										</label>
										<input
											type='number'
											placeholder='Enter quantity...'
											value={
												currentInspection.quantity || ''
											}
											onChange={e =>
												setCurrentInspection({
													...currentInspection,
													quantity:
														parseInt(
															e.target.value
														) || null,
												})
											}
											className='w-full bg-muted text-foreground px-4 py-3 rounded-lg font-mono text-lg text-center focus:outline-none focus:ring-2 focus:ring-primary'
										/>
										<p className='text-xs text-muted-foreground font-mono text-center'>
											Remaining to scan:{' '}
											{currentInspection.requiredQuantity -
												currentInspection.scannedQuantity}
										</p>
									</div>
								)}

								{/* Condition selector */}
								<div className='space-y-2'>
									<label className='text-xs font-mono font-bold'>
										SELECT CONDITION *
									</label>
									<div className='grid grid-cols-3 gap-2'>
										<Button
											variant={
												currentInspection.condition ===
												'GREEN'
													? 'default'
													: 'outline'
											}
											className={`h-auto py-4 flex flex-col items-center gap-2 ${
												currentInspection.condition ===
												'GREEN'
													? 'bg-green-600 hover:bg-green-700 border-green-500'
													: 'border-green-500/30'
											}`}
											onClick={() =>
												setCurrentInspection({
													...currentInspection,
													condition: 'GREEN',
												})
											}
										>
											<ShieldCheck className='w-6 h-6' />
											<span className='text-xs font-mono font-bold'>
												GREEN
											</span>
										</Button>

										<Button
											variant={
												currentInspection.condition ===
												'ORANGE'
													? 'default'
													: 'outline'
											}
											className={`h-auto py-4 flex flex-col items-center gap-2 ${
												currentInspection.condition ===
												'ORANGE'
													? 'bg-amber-600 hover:bg-amber-700 border-amber-500'
													: 'border-amber-500/30'
											}`}
											onClick={() =>
												setCurrentInspection({
													...currentInspection,
													condition: 'ORANGE',
												})
											}
										>
											<ShieldQuestion className='w-6 h-6' />
											<span className='text-xs font-mono font-bold'>
												ORANGE
											</span>
										</Button>

										<Button
											variant={
												currentInspection.condition ===
												'RED'
													? 'default'
													: 'outline'
											}
											className={`h-auto py-4 flex flex-col items-center gap-2 ${
												currentInspection.condition ===
												'RED'
													? 'bg-red-600 hover:bg-red-700 border-red-500'
													: 'border-red-500/30'
											}`}
											onClick={() =>
												setCurrentInspection({
													...currentInspection,
													condition: 'RED',
												})
											}
										>
											<ShieldAlert className='w-6 h-6' />
											<span className='text-xs font-mono font-bold'>
												RED
											</span>
										</Button>
									</div>
								</div>

								{/* Refurb Days Estimate - Feedback #2 */}
								{(currentInspection.condition === 'ORANGE' ||
									currentInspection.condition === 'RED') && (
									<div className='space-y-2'>
										<label className='text-xs font-mono font-bold'>
											ESTIMATED REFURB DAYS * (Required
											for ORANGE/RED)
										</label>
										<input
											type='number'
											min='1'
											max='90'
											placeholder='e.g., 5'
											value={
												currentInspection.refurbDaysEstimate ||
												''
											}
											onChange={e =>
												setCurrentInspection({
													...currentInspection,
													refurbDaysEstimate:
														parseInt(
															e.target.value
														) || null,
												})
											}
											className='w-full bg-muted text-foreground px-4 py-3 rounded-lg font-mono text-lg text-center focus:outline-none focus:ring-2 focus:ring-primary'
										/>
										<p className='text-xs text-muted-foreground font-mono text-center'>
											How many days to refurbish this
											item?
										</p>
									</div>
								)}

								{/* Notes */}
								{(currentInspection.condition === 'ORANGE' ||
									currentInspection.condition === 'RED') && (
									<div className='space-y-2'>
										<label className='text-xs font-mono font-bold'>
											INSPECTION NOTES * (Required for
											ORANGE/RED)
										</label>
										<Textarea
											value={currentInspection.notes}
											onChange={e =>
												setCurrentInspection({
													...currentInspection,
													notes: e.target.value,
												})
											}
											placeholder='Describe damage, wear, or issues...'
											className='font-mono text-sm min-h-[100px]'
										/>
									</div>
								)}

								{/* Damage photos - Feedback #2: Show for both ORANGE and RED */}
								{(currentInspection.condition === 'ORANGE' ||
									currentInspection.condition === 'RED') && (
									<div className='space-y-2'>
										<label className='text-xs font-mono font-bold'>
											DAMAGE PHOTOS{' '}
											{currentInspection.condition ===
											'RED'
												? '(Recommended)'
												: '(Optional)'}
										</label>
										<div className='space-y-2'>
											{/* Camera view for damage photos */}
											<div className='relative aspect-video bg-black rounded-lg overflow-hidden border border-border'>
												<video
													ref={videoRef}
													autoPlay
													playsInline
													muted
													className='w-full h-full object-cover'
												/>

												{damagePhotoCameraActive ? (
													<div className='absolute bottom-2 left-0 right-0 flex justify-center gap-2'>
														<Button
															onClick={
																captureDamagePhoto
															}
															size='sm'
															className='rounded-full bg-primary hover:bg-primary/90'
														>
															<Camera className='w-4 h-4 mr-1' />
															CAPTURE
														</Button>
														<Button
															onClick={
																stopDamagePhotoCamera
															}
															size='sm'
															variant='outline'
															className='rounded-full'
														>
															<XCircle className='w-4 h-4 mr-1' />
															STOP
														</Button>
													</div>
												) : (
													<div className='absolute inset-0 flex items-center justify-center bg-black/90'>
														<Button
															onClick={
																startDamagePhotoCamera
															}
															variant='outline'
															className='border-dashed border-2'
														>
															<Camera className='w-5 h-5 mr-2' />
															START CAMERA
														</Button>
													</div>
												)}
											</div>

											{/* Captured photos grid */}
											{currentInspection.photos.length >
												0 && (
												<div>
													<p className='text-xs font-mono text-muted-foreground mb-2'>
														CAPTURED PHOTOS (
														{
															currentInspection
																.photos.length
														}
														)
													</p>
													<div className='grid grid-cols-3 gap-2'>
														{currentInspection.photos.map(
															(photo, idx) => (
																<div
																	key={idx}
																	className='aspect-square bg-muted rounded-lg overflow-hidden border border-border relative group'
																>
																	<img
																		src={
																			photo
																		}
																		alt={`Damage photo ${idx + 1}`}
																		className='w-full h-full object-cover'
																	/>
																	<button
																		onClick={() => {
																			setCurrentInspection(
																				{
																					...currentInspection,
																					photos: currentInspection.photos.filter(
																						(
																							_,
																							i
																						) =>
																							i !==
																							idx
																					),
																				}
																			)
																		}}
																		className='absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity'
																	>
																		<XCircle className='w-3 h-3' />
																	</button>
																</div>
															)
														)}
													</div>
												</div>
											)}
										</div>
									</div>
								)}

								{/* Discrepancy reason */}
								{currentInspection.condition && (
									<div className='space-y-2'>
										<label className='text-xs font-mono font-bold'>
											DISCREPANCY REASON (Optional)
										</label>
										<div className='grid grid-cols-3 gap-2'>
											<Button
												variant={
													currentInspection.discrepancyReason ===
													'BROKEN'
														? 'default'
														: 'outline'
												}
												size='sm'
												onClick={() =>
													setCurrentInspection({
														...currentInspection,
														discrepancyReason:
															currentInspection.discrepancyReason ===
															'BROKEN'
																? null
																: 'BROKEN',
													})
												}
											>
												BROKEN
											</Button>
											<Button
												variant={
													currentInspection.discrepancyReason ===
													'LOST'
														? 'default'
														: 'outline'
												}
												size='sm'
												onClick={() =>
													setCurrentInspection({
														...currentInspection,
														discrepancyReason:
															currentInspection.discrepancyReason ===
															'LOST'
																? null
																: 'LOST',
													})
												}
											>
												LOST
											</Button>
											<Button
												variant={
													currentInspection.discrepancyReason ===
													'OTHER'
														? 'default'
														: 'outline'
												}
												size='sm'
												onClick={() =>
													setCurrentInspection({
														...currentInspection,
														discrepancyReason:
															currentInspection.discrepancyReason ===
															'OTHER'
																? null
																: 'OTHER',
													})
												}
											>
												OTHER
											</Button>
										</div>
									</div>
								)}
							</div>

							<DialogFooter className='flex-col sm:flex-col gap-2'>
								<Button
									onClick={handleInspectionSubmit}
									className='w-full bg-primary hover:bg-primary/90 font-mono font-bold'
									disabled={
										!currentInspection.condition ||
										(currentInspection.trackingMethod ===
											'BATCH' &&
											!currentInspection.quantity) ||
										((currentInspection.condition ===
											'ORANGE' ||
											currentInspection.condition ===
												'RED') &&
											!currentInspection.notes.trim()) ||
										scanItem.isPending
									}
								>
									{scanItem.isPending
										? 'RECORDING...'
										: 'CONFIRM INSPECTION'}
								</Button>
								<Button
									onClick={async () => {
										setInspectionDialogOpen(false)
										setCurrentInspection(null)
										stopDamagePhotoCamera()

										// Resume QR scanner when dialog is closed
										if (
											qrScannerRef.current &&
											qrScannerRef.current.getState() ===
												2
										) {
											try {
												await qrScannerRef.current.resume()
												console.log(
													'📸 QR scanner resumed after cancel'
												)
											} catch (error) {
												console.error(
													'Error resuming QR scanner:',
													error
												)
											}
										}
									}}
									variant='outline'
									className='w-full'
									disabled={scanItem.isPending}
								>
									CANCEL
								</Button>
							</DialogFooter>
						</>
					)}
				</DialogContent>
			</Dialog>

			{/* Complete Step */}
			{step === 'complete' && (
				<div className='relative z-10 p-4 h-full flex items-center justify-center'>
					<Card className='p-8 text-center space-y-6 bg-card/95 backdrop-blur max-w-md'>
						<div className='w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center'>
							<CheckCircle2 className='w-12 h-12 text-primary' />
						</div>
						<div>
							<h2 className='text-2xl font-bold font-mono mb-2'>
								RETURN SCAN COMPLETE
							</h2>
							<p className='text-sm text-muted-foreground'>
								Order closed. Redirecting to order details...
							</p>
						</div>
						<div className='space-y-2 text-sm font-mono'>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>
									Items Inspected:
								</span>
								<span className='font-bold text-primary'>
									{progressData.totalItems}
								</span>
							</div>
						</div>
					</Card>
				</div>
			)}

			{/* Hidden canvas for photo capture */}
			<canvas ref={canvasRef} className='hidden' />
		</div>
	)
}
