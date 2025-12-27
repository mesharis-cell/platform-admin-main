'use client'

/**
 * Mobile Outbound Scanning Interface
 * Phase 11: QR Code Tracking System
 *
 * Tactical HUD design for warehouse scanning operations:
 * - Full-screen QR camera view with tactical overlay
 * - Real-time progress tracking with military-grade indicators
 * - Instant scan confirmation with haptic-style feedback
 * - Truck photo capture workflow
 */

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
	useOutboundScanProgress,
	useScanOutboundItem,
	useUploadTruckPhotos,
	useCompleteOutboundScan,
} from '@/hooks/use-scanning'
import {
	Camera,
	CheckCircle2,
	XCircle,
	ScanLine,
	Package,
	Truck,
	AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Html5Qrcode } from 'html5-qrcode'

type ScanStep = 'scanning' | 'photos' | 'complete'

export default function OutboundScanningPage() {
	const params = useParams()
	const router = useRouter()
	const orderId = params.orderId as string

	const [step, setStep] = useState<ScanStep>('scanning')
	const [cameraActive, setCameraActive] = useState(false)
	const [cameraPermissionGranted, setCameraPermissionGranted] =
		useState(false)
	const [truckPhotos, setTruckPhotos] = useState<string[]>([])
	const [lastScannedQR, setLastScannedQR] = useState<string | null>(null)
	const [manualQRInput, setManualQRInput] = useState('')
	const [manualQuantityInput, setManualQuantityInput] = useState('')
	const [isScanning, setIsScanning] = useState(false)
	const [pendingBatchScan, setPendingBatchScan] = useState<{
		qrCode: string
		assetId: string
	} | null>(null)
	const [batchQuantityInput, setBatchQuantityInput] = useState('')
	const videoRef = useRef<HTMLVideoElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const qrScannerRef = useRef<Html5Qrcode | null>(null)
	const scannerDivRef = useRef<HTMLDivElement>(null)
	const lastScanTimeRef = useRef<number>(0)

	const scanItem = useScanOutboundItem()
	const uploadPhotos = useUploadTruckPhotos()
	const completeScan = useCompleteOutboundScan()
	const progress = useOutboundScanProgress(orderId)

	// Initialize scanner when permission is granted
	useEffect(() => {
		if (!cameraPermissionGranted || qrScannerRef.current) return

		const initializeScanner = async () => {
			try {
				const scannerId = 'qr-reader-outbound'
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

			// Step 1: Request camera permission
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' },
			})
			// Stop the test stream
			stream.getTracks().forEach(track => track.stop())

			// Step 2: Mark permission as granted (triggers useEffect to initialize scanner)
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

	const startCamera = async () => {
		// Only used for truck photos step
		try {
			console.log('🎥 Starting camera for truck photos...')

			// Check if mediaDevices API is available
			if (
				!navigator.mediaDevices ||
				!navigator.mediaDevices.getUserMedia
			) {
				throw new Error(
					'Camera API not available. Please use HTTPS or enable insecure origins in Chrome flags.'
				)
			}

			console.log('🎥 Requesting camera stream...')
			const photoStream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'environment',
					width: { ideal: 1920 },
					height: { ideal: 1080 },
				},
			})

			console.log('🎥 Camera stream obtained')

			if (videoRef.current) {
				console.log('🎥 Setting video source...')
				videoRef.current.srcObject = photoStream

				// Wait for video to load metadata before playing
				videoRef.current.onloadedmetadata = async () => {
					console.log(
						'🎥 Video metadata loaded, attempting to play...'
					)
					try {
						await videoRef.current?.play()
						console.log('🎥 Video playing successfully')
						setCameraActive(true)
						toast.success('Camera activated', {
							description: 'Ready to capture photos',
						})
					} catch (playError) {
						console.error('🎥 Video play error:', playError)
						toast.error('Failed to start video playback', {
							description:
								playError instanceof Error
									? playError.message
									: 'Unknown error',
						})
					}
				}
			} else {
				console.error('🎥 Video ref is null')
				throw new Error('Video element not found')
			}
		} catch (error) {
			console.error('🎥 Camera start error:', error)

			let errorMessage = 'Failed to start camera'

			if (error instanceof Error) {
				if (error.message.includes('Camera API not available')) {
					errorMessage =
						'Camera requires HTTPS or Chrome flag enabled'
				} else if (error.name === 'NotAllowedError') {
					errorMessage =
						'Camera permission denied. Please allow camera access.'
				} else if (error.name === 'NotFoundError') {
					errorMessage = 'No camera found on this device.'
				} else if (error.name === 'NotReadableError') {
					errorMessage =
						'Camera is already in use by another application.'
				} else {
					errorMessage = error.message
				}
			}

			toast.error('Camera activation failed', {
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

		// Stop video stream if active
		if (videoRef.current?.srcObject) {
			const tracks = (
				videoRef.current.srcObject as MediaStream
			).getTracks()
			tracks.forEach(track => track.stop())
		}

		setCameraActive(false)
	}

	const handleCameraScan = (qrCode: string) => {
		// Check if this is a BATCH asset that needs quantity
		const asset = progress.data?.assets.find(a => a.qrCode === qrCode)

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

		if (asset.trackingMethod === 'BATCH') {
			// Show quantity prompt dialog
			setPendingBatchScan({
				qrCode: qrCode,
				assetId: asset.assetId,
			})
			setBatchQuantityInput('')
		} else {
			// Individual tracking - scan directly
			handleManualQRInput(qrCode)
		}
	}

	const handleBatchQuantitySubmit = () => {
		if (!pendingBatchScan) return

		// Get latest asset data
		const asset = progress.data?.assets.find(
			a => a.assetId === pendingBatchScan.assetId
		)

		if (!asset) {
			toast.error('Asset not found')
			setPendingBatchScan(null)
			return
		}

		const remainingQuantity = asset.requiredQuantity - asset.scannedQuantity

		const qty = parseInt(batchQuantityInput)
		if (!qty || qty <= 0) {
			toast.error('Please enter a valid quantity')
			return
		}

		if (qty > remainingQuantity) {
			toast.error('Quantity exceeds required amount', {
				description: `Maximum: ${remainingQuantity}`,
			})
			return
		}

		// Submit scan with quantity
		handleManualQRInput(pendingBatchScan.qrCode, qty)

		// Close dialog
		setPendingBatchScan(null)
		setBatchQuantityInput('')
	}

	const handleManualQRInput = (qrCode: string, quantity?: number) => {
		// Prevent duplicate scans
		if (isScanning) {
			console.log('⏱️ Scan ignored - already processing')
			return
		}

		console.log(
			`📱 Scanning QR code: ${qrCode} for order: ${orderId}${quantity ? `, quantity: ${quantity}` : ''}`
		)

		setIsScanning(true)

		scanItem.mutate(
			{ orderId, qrCode, quantity },
			{
				onSuccess: data => {
					setLastScannedQR(qrCode)
					setManualQRInput('')
					setManualQuantityInput('')
					setIsScanning(false)

					toast.success(`Scanned: ${data.asset.assetName}`, {
						description: `${data.progress.itemsScanned}/${data.progress.totalItems} items`,
					})

					// Clear last scanned after 2 seconds
					setTimeout(() => setLastScannedQR(null), 2000)

					// Move to photos step if all items scanned
					if (data.progress.percentComplete === 100) {
						stopCamera()
						setStep('photos')
					}
				},
				onError: error => {
					console.error('Scan error:', error)
					setIsScanning(false)

					toast.error('Scan failed', {
						description: error.message,
					})
				},
			}
		)
	}

	const handleManualScanSubmit = () => {
		if (!manualQRInput.trim()) {
			toast.error('Please enter a QR code')
			return
		}

		// Check if this asset requires quantity (BATCH tracking)
		const asset = progress.data?.assets.find(
			a => a.qrCode === manualQRInput.trim()
		)

		if (!asset) {
			toast.error('Asset not found in order', {
				description: `QR code: ${manualQRInput.trim()}`,
			})
			return
		}

		// Check if asset is already fully scanned
		if (asset.scannedQuantity >= asset.requiredQuantity) {
			toast.success('Asset already scanned', {
				description: `${asset.assetName} - ${asset.scannedQuantity}/${asset.requiredQuantity} complete`,
			})
			setManualQRInput('')
			setManualQuantityInput('')
			return
		}

		if (asset.trackingMethod === 'BATCH') {
			// If quantity field has value, use it
			if (manualQuantityInput) {
				const qty = parseInt(manualQuantityInput)
				if (!qty || qty <= 0) {
					toast.error('Please enter a valid quantity')
					return
				}

				const remainingQuantity =
					asset.requiredQuantity - asset.scannedQuantity
				if (qty > remainingQuantity) {
					toast.error('Quantity exceeds required amount', {
						description: `Maximum: ${remainingQuantity}`,
					})
					return
				}

				handleManualQRInput(manualQRInput.trim(), qty)
			} else {
				// No quantity entered - show dialog prompt
				setPendingBatchScan({
					qrCode: manualQRInput.trim(),
					assetId: asset.assetId,
				})
				setBatchQuantityInput('')
				setManualQRInput('')
			}
		} else {
			// INDIVIDUAL tracking - scan directly
			handleManualQRInput(manualQRInput.trim())
		}
	}

	const captureTruckPhoto = () => {
		if (!canvasRef.current || !videoRef.current) return

		const canvas = canvasRef.current
		const video = videoRef.current

		canvas.width = video.videoWidth
		canvas.height = video.videoHeight
		const ctx = canvas.getContext('2d')
		ctx?.drawImage(video, 0, 0)

		const photoBase64 = canvas.toDataURL('image/jpeg', 0.8)
		setTruckPhotos([...truckPhotos, photoBase64])
		toast.success('Photo captured', {
			description: `${truckPhotos.length + 1} photo(s) captured`,
		})
	}

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (!files || files.length === 0) return

		Array.from(files).forEach(file => {
			if (!file.type.startsWith('image/')) {
				toast.error('Invalid file type', {
					description: 'Please select image files only',
				})
				return
			}

			const reader = new FileReader()
			reader.onload = event => {
				const photoBase64 = event.target?.result as string
				setTruckPhotos(prev => [...prev, photoBase64])
			}
			reader.readAsDataURL(file)
		})

		toast.success('Photos added', {
			description: `${files.length} photo(s) uploaded`,
		})

		// Reset file input
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}

	const handleCompleteScan = () => {
		// Upload truck photos first
		if (truckPhotos.length > 0) {
			uploadPhotos.mutate(
				{ orderId, photos: truckPhotos },
				{
					onSuccess: () => {
						// Complete scan
						completeScan.mutate(
							{ orderId },
							{
								onSuccess: data => {
									setStep('complete')
									toast.success('Scan complete', {
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
					},
					onError: error => {
						toast.error('Failed to upload photos', {
							description: error.message,
						})
					},
				}
			)
		} else {
			// Complete scan without photos
			completeScan.mutate(
				{ orderId },
				{
					onSuccess: data => {
						setStep('complete')
						toast.success('Scan complete', {
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
							OUTBOUND SCAN
						</div>
						<div className='text-lg font-bold font-mono'>
							ORDER #{progressData.orderIdDisplay}
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
								id='qr-reader-outbound'
								ref={scannerDivRef}
								className='w-full h-full'
							/>

							{/* Last scanned confirmation overlay */}
							{lastScannedQR && (
								<div className='absolute top-4 left-4 right-4 z-10'>
									<div className='bg-primary text-black p-3 rounded-lg font-mono text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top'>
										<CheckCircle2 className='w-5 h-5' />
										SCAN CONFIRMED
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

					{/* Batch Quantity Prompt Dialog */}
					{pendingBatchScan &&
						(() => {
							const asset = progress.data?.assets.find(
								a => a.assetId === pendingBatchScan.assetId
							)
							if (!asset) return null

							const remainingQuantity =
								asset.requiredQuantity - asset.scannedQuantity

							return (
								<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4'>
									<Card className='w-full max-w-md p-6 space-y-4'>
										<div className='text-center space-y-2'>
											<Package className='w-12 h-12 mx-auto text-primary' />
											<h3 className='text-lg font-bold font-mono'>
												BATCH QUANTITY
											</h3>
											<p className='text-sm text-muted-foreground'>
												{asset.assetName}
											</p>
											<p className='text-xs text-muted-foreground font-mono'>
												QR: {pendingBatchScan.qrCode}
											</p>
										</div>

										<div className='space-y-2'>
											<label className='text-xs font-mono text-muted-foreground'>
												QUANTITY TO SCAN OUT
											</label>
											<input
												type='number'
												placeholder='Enter quantity...'
												value={batchQuantityInput}
												onChange={e =>
													setBatchQuantityInput(
														e.target.value
													)
												}
												className='w-full bg-muted text-foreground px-4 py-3 rounded-lg font-mono text-lg text-center focus:outline-none focus:ring-2 focus:ring-primary'
												autoFocus
												onKeyDown={e => {
													if (e.key === 'Enter') {
														e.preventDefault()
														handleBatchQuantitySubmit()
													}
												}}
											/>
											<p className='text-xs text-muted-foreground font-mono text-center'>
												Remaining to scan:{' '}
												{remainingQuantity}
											</p>
										</div>

										<div className='flex gap-2'>
											<Button
												variant='outline'
												className='flex-1'
												onClick={() => {
													setPendingBatchScan(null)
													setBatchQuantityInput('')
												}}
											>
												CANCEL
											</Button>
											<Button
												className='flex-1 bg-primary hover:bg-primary/90 font-mono font-bold'
												onClick={
													handleBatchQuantitySubmit
												}
											>
												CONFIRM
											</Button>
										</div>
									</Card>
								</div>
							)
						})()}

					{/* Manual QR input */}
					<div className='space-y-2'>
						<label className='text-xs font-mono text-muted-foreground'>
							MANUAL QR CODE INPUT
						</label>
						<div className='flex items-center gap-2'>
							<input
								type='text'
								placeholder='Enter QR code...'
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
							<input
								type='number'
								placeholder='Qty'
								value={manualQuantityInput}
								onChange={e =>
									setManualQuantityInput(e.target.value)
								}
								className='w-20 bg-muted text-foreground px-4 py-3 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary'
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
						<p className='text-xs text-muted-foreground font-mono'>
							Quantity only required for BATCH-tracked assets
						</p>
					</div>

					{/* Assets list */}
					<div className='space-y-2 max-h-64 overflow-y-auto'>
						<div className='text-xs font-mono text-muted-foreground mb-2'>
							ITEMS TO SCAN
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

					{/* Continue to photos button */}
					{progressData.percentComplete === 100 && (
						<Button
							onClick={() => {
								stopCamera()
								setStep('photos')
							}}
							className='w-full h-14 text-lg font-mono font-bold bg-primary hover:bg-primary/90'
						>
							<Truck className='w-6 h-6 mr-2' />
							CAPTURE TRUCK PHOTOS
						</Button>
					)}
				</div>
			)}

			{/* Truck Photos Step */}
			{step === 'photos' && (
				<div className='relative z-10 p-4 space-y-4'>
					<Card className='p-6 bg-card/95 backdrop-blur'>
						<div className='space-y-4'>
							<div>
								<h2 className='text-xl font-bold font-mono mb-2'>
									TRUCK PHOTO DOCUMENTATION
								</h2>
								<p className='text-sm text-muted-foreground'>
									Capture photos of loaded truck for delivery
									verification
								</p>
							</div>

							{/* Camera view for photos - always rendered */}
							<div className='relative aspect-[4/3] bg-black rounded-lg overflow-hidden border-2 border-primary/30'>
								<video
									ref={videoRef}
									autoPlay
									playsInline
									muted
									className='w-full h-full object-cover'
								/>

								{/* Camera controls overlay (when active) */}
								{cameraActive && (
									<div className='absolute bottom-4 left-0 right-0 flex justify-center gap-4'>
										<Button
											onClick={captureTruckPhoto}
											size='lg'
											className='rounded-full w-16 h-16 bg-primary hover:bg-primary/90'
										>
											<Camera className='w-8 h-8' />
										</Button>
										<Button
											onClick={() => {
												stopCamera()
												setCameraActive(false)
											}}
											size='lg'
											variant='outline'
											className='rounded-full w-16 h-16'
										>
											<XCircle className='w-8 h-8' />
										</Button>
									</div>
								)}

								{/* Activation buttons overlay (when inactive) */}
								{!cameraActive && (
									<div className='absolute inset-0 flex items-center justify-center bg-black/90 p-4'>
										<div className='w-full space-y-3'>
											<Button
												onClick={startCamera}
												variant='outline'
												className='w-full h-24 border-dashed border-2'
											>
												<Camera className='w-8 h-8 mr-2' />
												ACTIVATE CAMERA
											</Button>

											<div className='relative'>
												<input
													ref={fileInputRef}
													type='file'
													accept='image/*'
													multiple
													onChange={handleFileUpload}
													className='hidden'
												/>
												<Button
													onClick={() =>
														fileInputRef.current?.click()
													}
													variant='outline'
													className='w-full h-24 border-dashed border-2'
												>
													<Package className='w-8 h-8 mr-2' />
													UPLOAD FROM GALLERY
												</Button>
											</div>
										</div>
									</div>
								)}
							</div>

							{/* Captured photos grid */}
							{truckPhotos.length > 0 && (
								<div>
									<div className='text-xs font-mono text-muted-foreground mb-2'>
										CAPTURED PHOTOS ({truckPhotos.length})
									</div>
									<div className='grid grid-cols-3 gap-2'>
										{truckPhotos.map((photo, idx) => (
											<div
												key={idx}
												className='aspect-square bg-muted rounded-lg overflow-hidden border border-border'
											>
												<img
													src={photo}
													alt={`Truck photo ${idx + 1}`}
													className='w-full h-full object-cover'
												/>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Action buttons */}
							<div className='flex gap-2'>
								<Button
									onClick={() => setStep('scanning')}
									variant='outline'
									className='flex-1'
								>
									BACK TO SCANNING
								</Button>
								<Button
									onClick={handleCompleteScan}
									className='flex-1 bg-primary hover:bg-primary/90 font-mono font-bold'
									disabled={
										uploadPhotos.isPending ||
										completeScan.isPending
									}
								>
									{uploadPhotos.isPending ||
									completeScan.isPending
										? 'PROCESSING...'
										: 'COMPLETE SCAN'}
								</Button>
							</div>

							{truckPhotos.length === 0 && (
								<div className='flex items-center gap-2 text-xs text-amber-500'>
									<AlertTriangle className='w-4 h-4' />
									<span className='font-mono'>
										No photos captured. Recommended to
										document truck loading.
									</span>
								</div>
							)}
						</div>
					</Card>
				</div>
			)}

			{/* Complete Step */}
			{step === 'complete' && (
				<div className='relative z-10 p-4 h-full flex items-center justify-center'>
					<Card className='p-8 text-center space-y-6 bg-card/95 backdrop-blur max-w-md'>
						<div className='w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center'>
							<CheckCircle2 className='w-12 h-12 text-primary' />
						</div>
						<div>
							<h2 className='text-2xl font-bold font-mono mb-2'>
								SCAN COMPLETE
							</h2>
							<p className='text-sm text-muted-foreground'>
								Order ready for delivery. Redirecting to order
								details...
							</p>
						</div>
						<div className='space-y-2 text-sm font-mono'>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>
									Items Scanned:
								</span>
								<span className='font-bold text-primary'>
									{progressData.totalItems}
								</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>
									Truck Photos:
								</span>
								<span className='font-bold text-primary'>
									{truckPhotos.length}
								</span>
							</div>
						</div>
					</Card>
				</div>
			)}

			{/* Hidden elements */}
			<canvas ref={canvasRef} className='hidden' />
		</div>
	)
}
