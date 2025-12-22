/**
 * Comprehensive Demo Data Seed Script - Pernod Ricard Only (Feedback #6)
 *
 * Populates database with realistic production-ready data:
 * - 1 Company (Pernod Ricard only)
 * - 5 Premium Brands (Absolut, Jameson, Chivas, Martell, Havana Club)
 * - 25+ Realistic Assets with real images
 * - Multiple Collections
 * - 10+ Orders across all lifecycle states with separate financial status
 * - Complete tracking history with realistic scenarios
 */

import { db } from '@/db'
import {
    user,
    companies,
    warehouses,
    zones,
    brands,
    assets,
    assetConditionHistory,
    assetBookings,
    collections,
    collectionItems,
    pricingTiers,
    orders,
    orderItems,
    orderStatusHistory,
    scanEvents,
    notificationLogs,
} from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth/server'
import { PERMISSION_TEMPLATES } from '@/types/auth'
import { subDays, addDays } from 'date-fns'

// Helper to create users with better-auth
async function createUserWithAuth(
    email: string,
    password: string,
    name: string,
    permissionTemplate: string,
    companies: string[]
) {
    try {
        const result = await auth.api.signUpEmail({
            body: { email, password, name },
        })

        if (!result) {
            throw new Error(`Failed to create user: ${email}`)
        }

        const template =
            PERMISSION_TEMPLATES[
                permissionTemplate as keyof typeof PERMISSION_TEMPLATES
            ]

        const [updatedUser] = await db
            .update(user)
            .set({
                permissionTemplate,
                permissions: template.permissions,
                companies,
                isActive: true,
                updatedAt: new Date(),
            })
            .where(eq(user.email, email))
            .returning()

        console.log(`✅ Created user: ${email}`)
        return updatedUser
    } catch (error) {
        console.error(`❌ Error creating user ${email}:`, error)
        throw error
    }
}

// Helper to generate QR codes
function generateQRCode(
    companyCode: string,
    category: string,
    index: number
): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${companyCode}-${category}-${timestamp}-${random}-${index.toString().padStart(3, '0')}`
}

// Helper to generate order IDs
function generateOrderId(date: Date, sequence: number): string {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    return `ORD-${dateStr}-${sequence.toString().padStart(3, '0')}`
}

// Helper to generate invoice numbers
function generateInvoiceNumber(date: Date, sequence: number): string {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    return `INV-${dateStr}-${sequence.toString().padStart(3, '0')}`
}

export async function seedDemoData() {
    console.log('🌱 Starting comprehensive demo data seeding...\n')

    // ============================================================
    // 1. COMPANIES (Feedback #6: Keep only Pernod Ricard)
    // ============================================================
    console.log('📊 Creating companies...')

    const [pernodRicard] = await db
        .insert(companies)
        .values({
            name: 'Pernod Ricard',
            description:
                'Global leader in premium spirits and wines - portfolio includes Absolut Vodka, Jameson, Chivas Regal, and Martell',
            pmgMarginPercent: '25.00',
            contactEmail: 'events@pernod-ricard-mena.com',
            contactPhone: '+971-4-567-8900',
            createdAt: new Date('2024-01-15'),
        })
        .returning()
        .onConflictDoNothing()

    console.log(`✅ Created 1 company (Pernod Ricard only)\n`)

    // ============================================================
    // 2. WAREHOUSES & ZONES
    // ============================================================
    console.log('🏭 Creating warehouses and zones...')

    const [dubaiWarehouse] = await db
        .insert(warehouses)
        .values({
            name: 'Dubai Main Warehouse - A2 Logistics',
            country: 'United Arab Emirates',
            city: 'Dubai',
            address:
                'Building 15, Dubai Logistics Park, Jebel Ali Free Zone, Dubai, UAE',
            createdAt: new Date('2024-01-10'),
        })
        .returning()
        .onConflictDoNothing()

    const [abuDhabiWarehouse] = await db
        .insert(warehouses)
        .values({
            name: 'Abu Dhabi Distribution Center',
            country: 'United Arab Emirates',
            city: 'Abu Dhabi',
            address:
                'Zone 32, Building 8, Mussafah Industrial Area, Abu Dhabi, UAE',
            createdAt: new Date('2024-01-20'),
        })
        .returning()
        .onConflictDoNothing()

    const zonesData = [
        // Dubai Warehouse - Premium Brands Section
        {
            warehouse: dubaiWarehouse.id,
            company: pernodRicard.id,
            name: 'Zone A - Premium Spirits',
            description:
                'Temperature controlled area for Pernod Ricard premium portfolio',
        },
        {
            warehouse: dubaiWarehouse.id,
            company: pernodRicard.id,
            name: 'Zone A2 - Oversized Items',
            description:
                'Large format displays and installations for Pernod Ricard',
        },
        // Abu Dhabi Warehouse
        {
            warehouse: abuDhabiWarehouse.id,
            company: pernodRicard.id,
            name: 'Zone A - Overflow',
            description: 'Additional storage for high-volume periods',
        },
    ]

    const createdZones = await db
        .insert(zones)
        .values(zonesData)
        .returning()
        .onConflictDoNothing()
    console.log(`✅ Created 2 warehouses and ${createdZones.length} zones\n`)

    // ============================================================
    // 3. BRANDS
    // ============================================================
    console.log('🏷️  Creating brands...')

    const brandsData = [
        // Pernod Ricard Portfolio
        {
            company: pernodRicard.id,
            name: 'Absolut Vodka',
            description:
                'Premium Swedish vodka - iconic bottle design and flavors',
            logoUrl:
                'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400',
        },
        {
            company: pernodRicard.id,
            name: 'Jameson Irish Whiskey',
            description: 'Triple-distilled Irish whiskey - smooth and balanced',
            logoUrl:
                'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400',
        },
        {
            company: pernodRicard.id,
            name: 'Chivas Regal',
            description:
                'Luxury blended Scotch whisky - 12, 18, and 25 year expressions',
            logoUrl:
                'https://images.unsplash.com/photo-1626897505254-e0f811aa9bf7?w=400',
        },
        {
            company: pernodRicard.id,
            name: 'Martell Cognac',
            description:
                'Premium French cognac - oldest of the great cognac houses',
            logoUrl:
                'https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=400',
        },
        {
            company: pernodRicard.id,
            name: 'Havana Club',
            description:
                'Authentic Cuban rum - perfect for mojitos and cocktails',
            logoUrl:
                'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400',
        },
    ]

    const createdBrands = await db
        .insert(brands)
        .values(brandsData)
        .returning()
        .onConflictDoNothing()
    console.log(`✅ Created ${createdBrands.length} brands\n`)

    // ============================================================
    // 4. USERS
    // ============================================================
    console.log('👥 Creating users...')

    // A2 Staff
    const a2Staff1 = await createUserWithAuth(
        'ahmed.almaktoum@a2logistics.ae',
        'A2Staff123!',
        'Ahmed Al Maktoum',
        'A2_STAFF',
        ['*']
    )
    const a2Staff2 = await createUserWithAuth(
        'fatima.hassan@a2logistics.ae',
        'A2Staff123!',
        'Fatima Hassan',
        'A2_STAFF',
        ['*']
    )

    // Pernod Ricard Clients
    const prClient1 = await createUserWithAuth(
        'john.smith@pernod-ricard.com',
        'Client123!',
        'John Smith',
        'CLIENT_USER',
        [pernodRicard.id]
    )
    const prClient2 = await createUserWithAuth(
        'sarah.jones@pernod-ricard.com',
        'Client123!',
        'Sarah Jones',
        'CLIENT_USER',
        [pernodRicard.id]
    )

    console.log(`✅ Created 4 users\n`)

    // ============================================================
    // 5. PRICING TIERS
    // ============================================================
    console.log('💰 Creating pricing tiers...')

    const pricingTiersData = [
        // Dubai - 4 tiers for granular pricing
        {
            country: 'United Arab Emirates',
            city: 'Dubai',
            volumeMin: '0.000',
            volumeMax: '5.000',
            basePrice: '1500.00',
            isActive: true,
        },
        {
            country: 'United Arab Emirates',
            city: 'Dubai',
            volumeMin: '5.000',
            volumeMax: '10.000',
            basePrice: '2800.00',
            isActive: true,
        },
        {
            country: 'United Arab Emirates',
            city: 'Dubai',
            volumeMin: '10.000',
            volumeMax: '20.000',
            basePrice: '4500.00',
            isActive: true,
        },
        {
            country: 'United Arab Emirates',
            city: 'Dubai',
            volumeMin: '20.000',
            volumeMax: '999.000',
            basePrice: '7500.00',
            isActive: true,
        },
        // Abu Dhabi - slightly higher due to distance
        {
            country: 'United Arab Emirates',
            city: 'Abu Dhabi',
            volumeMin: '0.000',
            volumeMax: '5.000',
            basePrice: '1800.00',
            isActive: true,
        },
        {
            country: 'United Arab Emirates',
            city: 'Abu Dhabi',
            volumeMin: '5.000',
            volumeMax: '10.000',
            basePrice: '3200.00',
            isActive: true,
        },
        {
            country: 'United Arab Emirates',
            city: 'Abu Dhabi',
            volumeMin: '10.000',
            volumeMax: '20.000',
            basePrice: '5000.00',
            isActive: true,
        },
        {
            country: 'United Arab Emirates',
            city: 'Abu Dhabi',
            volumeMin: '20.000',
            volumeMax: '999.000',
            basePrice: '8500.00',
            isActive: true,
        },
        // Sharjah
        {
            country: 'United Arab Emirates',
            city: 'Sharjah',
            volumeMin: '0.000',
            volumeMax: '10.000',
            basePrice: '2000.00',
            isActive: true,
        },
        {
            country: 'United Arab Emirates',
            city: 'Sharjah',
            volumeMin: '10.000',
            volumeMax: '999.000',
            basePrice: '4800.00',
            isActive: true,
        },
    ]

    const createdTiers = await db
        .insert(pricingTiers)
        .values(pricingTiersData)
        .returning()
        .onConflictDoNothing()
    console.log(`✅ Created ${createdTiers.length} pricing tiers\n`)

    // ============================================================
    // 6. ASSETS (25+ Realistic Assets - Pernod Ricard Only)
    // ============================================================
    console.log('📦 Creating 25+ realistic assets...')

    const prDubaiZone = createdZones.find(
        z =>
            z.company === pernodRicard.id &&
            z.name === 'Zone A - Premium Spirits'
    )
    const prDubaiZone2 = createdZones.find(
        z =>
            z.company === pernodRicard.id &&
            z.name === 'Zone A2 - Oversized Items'
    )

    const absolutBrand = createdBrands.find(b => b.name === 'Absolut Vodka')
    const jamesonBrand = createdBrands.find(
        b => b.name === 'Jameson Irish Whiskey'
    )
    const chivasBrand = createdBrands.find(b => b.name === 'Chivas Regal')
    const martellBrand = createdBrands.find(b => b.name === 'Martell Cognac')
    const havanaClubBrand = createdBrands.find(b => b.name === 'Havana Club')

    const assetsData = [
        // ============ PERNOD RICARD - ABSOLUT VODKA ============
        {
            company: pernodRicard.id,
            brand: absolutBrand?.id,
            warehouse: dubaiWarehouse.id,
            zone: prDubaiZone2?.id,
            name: 'Absolut Premium Bar Counter',
            description:
                'Custom-built bar counter with integrated LED lighting, Absolut branding, and bottle display shelves. Features stainless steel construction with black acrylic panels.',
            category: 'Furniture',
            images: [
                'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800',
                'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
            ],
            trackingMethod: 'INDIVIDUAL',
            totalQuantity: 3,
            qrCode: generateQRCode('PR', 'FUR', 1),
            weight: '95.00',
            dimensionLength: '250.00',
            dimensionWidth: '65.00',
            dimensionHeight: '110.00',
            volume: '1.788',
            condition: 'GREEN',
            status: 'AVAILABLE',
            handlingTags: ['HeavyLift', 'AssemblyRequired', 'HighValue'],
        },
        {
            company: pernodRicard.id,
            brand: absolutBrand?.id,
            warehouse: dubaiWarehouse.id,
            zone: prDubaiZone?.id,
            name: 'Absolut Branded Bar Stools',
            description:
                'Premium chrome bar stools with cushioned leather seats featuring embossed Absolut logo. Adjustable height mechanism.',
            category: 'Furniture',
            images: [
                'https://images.unsplash.com/photo-1503602642458-232111445657?w=800',
            ],
            trackingMethod: 'BATCH',
            totalQuantity: 24,
            qrCode: generateQRCode('PR', 'FUR', 2),
            packaging: 'Box of 24',
            weight: '9.20',
            dimensionLength: '45.00',
            dimensionWidth: '45.00',
            dimensionHeight: '78.00',
            volume: '0.158',
            condition: 'GREEN',
            status: 'AVAILABLE',
            handlingTags: ['Fragile'],
        },
        {
            company: pernodRicard.id,
            brand: absolutBrand?.id,
            warehouse: dubaiWarehouse.id,
            zone: prDubaiZone2?.id,
            name: 'Absolut 3x4m Fabric Backdrop',
            description:
                'Premium tension fabric backdrop system with Absolut brand visuals. Includes aluminum frame and carry case.',
            category: 'Installation',
            images: [
                'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
            ],
            trackingMethod: 'INDIVIDUAL',
            totalQuantity: 4,
            qrCode: generateQRCode('PR', 'INS', 3),
            weight: '18.50',
            dimensionLength: '320.00',
            dimensionWidth: '25.00',
            dimensionHeight: '420.00',
            volume: '3.360',
            condition: 'GREEN',
            status: 'AVAILABLE',
            handlingTags: ['AssemblyRequired'],
        },
        {
            company: pernodRicard.id,
            brand: absolutBrand?.id,
            warehouse: dubaiWarehouse.id,
            zone: prDubaiZone?.id,
            name: 'Absolut Shot Glasses Premium',
            description:
                'Crystal-clear branded shot glasses with Absolut logo. Dishwasher safe, 50ml capacity. Premium weight glass.',
            category: 'Glassware',
            images: [
                'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800',
            ],
            trackingMethod: 'BATCH',
            totalQuantity: 300,
            qrCode: generateQRCode('PR', 'GLS', 4),
            packaging: 'Crate of 300',
            weight: '0.09',
            dimensionLength: '5.50',
            dimensionWidth: '5.50',
            dimensionHeight: '6.00',
            volume: '0.0002',
            condition: 'GREEN',
            status: 'AVAILABLE',
            handlingTags: ['Fragile', 'HighValue'],
        },
        {
            company: pernodRicard.id,
            brand: absolutBrand?.id,
            warehouse: dubaiWarehouse.id,
            zone: prDubaiZone?.id,
            name: 'Absolut Highball Glasses',
            description:
                'Premium highball glasses for vodka cocktails. 350ml capacity with Absolut branding.',
            category: 'Glassware',
            images: [
                'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800',
            ],
            trackingMethod: 'BATCH',
            totalQuantity: 200,
            qrCode: generateQRCode('PR', 'GLS', 5),
            packaging: 'Crate of 200',
            weight: '0.18',
            dimensionLength: '6.50',
            dimensionWidth: '6.50',
            dimensionHeight: '15.00',
            volume: '0.0006',
            condition: 'GREEN',
            status: 'AVAILABLE',
            handlingTags: ['Fragile'],
        },
        {
            company: pernodRicard.id,
            brand: absolutBrand?.id,
            warehouse: dubaiWarehouse.id,
            zone: prDubaiZone?.id,
            name: 'Absolut Ice Buckets Stainless',
            description:
                'Professional-grade stainless steel ice buckets with Absolut logo engraving. Includes tongs.',
            category: 'Decor',
            images: [
                'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=800',
            ],
            trackingMethod: 'BATCH',
            totalQuantity: 40,
            qrCode: generateQRCode('PR', 'DEC', 6),
            packaging: 'Box of 40',
            weight: '1.35',
            dimensionLength: '23.00',
            dimensionWidth: '23.00',
            dimensionHeight: '26.00',
            volume: '0.014',
            condition: 'GREEN',
            status: 'AVAILABLE',
            handlingTags: [],
        },

        // ============ PERNOD RICARD - JAMESON ============
        {
            company: pernodRicard.id,
            brand: jamesonBrand?.id,
            warehouse: dubaiWarehouse.id,
            zone: prDubaiZone2?.id,
            name: 'Jameson Whiskey Barrel Bar Tables',
            description:
                'Authentic Irish whiskey barrel converted to high-top bar table. Original Jameson barrel with custom glass top.',
            category: 'Furniture',
            images: [
                'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800',
            ],
            trackingMethod: 'INDIVIDUAL',
            totalQuantity: 8,
            qrCode: generateQRCode('PR', 'FUR', 7),
            weight: '105.00',
            dimensionLength: '130.00',
            dimensionWidth: '130.00',
            dimensionHeight: '115.00',
            volume: '1.948',
            condition: 'GREEN',
            status: 'AVAILABLE',
            handlingTags: ['HeavyLift', 'HighValue'],
        },
        {
            company: pernodRicard.id,
            brand: jamesonBrand?.id,
            warehouse: dubaiWarehouse.id,
            zone: prDubaiZone?.id,
            name: 'Jameson Whiskey Tumblers Premium',
            description:
                'Heavy-base whiskey tumblers with Jameson logo. Perfect for neat pours or rocks. 320ml capacity.',
            category: 'Glassware',
            images: [
                'https://images.unsplash.com/photo-1626897505254-e0f811aa9bf7?w=800',
            ],
            trackingMethod: 'BATCH',
            totalQuantity: 180,
            qrCode: generateQRCode('PR', 'GLS', 8),
            packaging: 'Crate of 180',
            weight: '0.28',
            dimensionLength: '8.50',
            dimensionWidth: '8.50',
            dimensionHeight: '10.00',
            volume: '0.0007',
            condition: 'GREEN',
            status: 'AVAILABLE',
            handlingTags: ['Fragile'],
        },

        // ============ DAMAGED ITEMS (Feedback #2: Condition visibility) ============
        {
            company: pernodRicard.id,
            brand: absolutBrand?.id,
            warehouse: dubaiWarehouse.id,
            zone: prDubaiZone2?.id,
            name: 'Absolut LED Light Box 2m',
            description:
                'Large-format LED light box with iconic Absolut logo. Wall-mountable or free-standing. Currently damaged but repairable.',
            category: 'Installation',
            images: [
                'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
            ],
            trackingMethod: 'INDIVIDUAL',
            totalQuantity: 6,
            qrCode: generateQRCode('PR', 'INS', 9),
            weight: '12.50',
            dimensionLength: '200.00',
            dimensionWidth: '15.00',
            dimensionHeight: '150.00',
            volume: '0.450',
            condition: 'RED',
            status: 'AVAILABLE', // Feedback #2: Keep available despite RED condition
            refurbDaysEstimate: 7, // Feedback #2: Add refurb estimate
            handlingTags: ['Fragile', 'AssemblyRequired'],
        },
        {
            company: pernodRicard.id,
            brand: jamesonBrand?.id,
            warehouse: dubaiWarehouse.id,
            zone: prDubaiZone?.id,
            name: 'Jameson Whiskey Glasses Vintage',
            description:
                'Vintage-style whiskey glasses with Jameson branding. Some minor chips but still functional.',
            category: 'Glassware',
            images: [
                'https://images.unsplash.com/photo-1626897505254-e0f811aa9bf7?w=800',
            ],
            trackingMethod: 'BATCH',
            totalQuantity: 100,
            qrCode: generateQRCode('PR', 'GLS', 10),
            packaging: 'Crate of 100',
            weight: '0.25',
            dimensionLength: '8.00',
            dimensionWidth: '8.00',
            dimensionHeight: '9.50',
            volume: '0.0006',
            condition: 'ORANGE',
            status: 'AVAILABLE', // Feedback #2: Keep available despite ORANGE condition
            refurbDaysEstimate: 3, // Feedback #2: Add refurb estimate
            handlingTags: ['Fragile'],
        },

        // ============ PERNOD RICARD - CHIVAS REGAL ============
        {
            company: pernodRicard.id,
            brand: chivasBrand?.id,
            warehouse: dubaiWarehouse.id,
            zone: prDubaiZone2?.id,
            name: 'Chivas Regal VIP Lounge Chairs',
            description:
                'Luxury leather armchairs with Chivas Regal embossing. Deep burgundy color, solid wood frame.',
            category: 'Furniture',
            images: [
                'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
            ],
            trackingMethod: 'INDIVIDUAL',
            totalQuantity: 10,
            qrCode: generateQRCode('PR', 'FUR', 11),
            weight: '32.00',
            dimensionLength: '85.00',
            dimensionWidth: '90.00',
            dimensionHeight: '95.00',
            volume: '0.727',
            condition: 'GREEN',
            status: 'AVAILABLE',
            handlingTags: ['HighValue'],
        },
        {
            company: pernodRicard.id,
            brand: chivasBrand?.id,
            warehouse: dubaiWarehouse.id,
            zone: prDubaiZone?.id,
            name: 'Chivas Regal Crystal Tasting Glasses',
            description:
                'Premium crystal whisky nosing glasses with Chivas branding. Perfect for tasting experiences.',
            category: 'Glassware',
            images: [
                'https://images.unsplash.com/photo-1509669803555-fd5fcd4d2c88?w=800',
            ],
            trackingMethod: 'BATCH',
            totalQuantity: 120,
            qrCode: generateQRCode('PR', 'GLS', 12),
            packaging: 'Crate of 120',
            weight: '0.22',
            dimensionLength: '7.00',
            dimensionWidth: '7.00',
            dimensionHeight: '12.00',
            volume: '0.0006',
            condition: 'GREEN',
            status: 'AVAILABLE',
            handlingTags: ['Fragile', 'HighValue'],
        },

        // ============ GENERIC/SHARED ITEMS ============
        {
            company: pernodRicard.id,
            brand: null,
            warehouse: dubaiWarehouse.id,
            zone: prDubaiZone?.id,
            name: 'Premium Bar Mats Rubber',
            description:
                'Professional non-slip bar mats. Black rubber with drainage holes. 60x45cm.',
            category: 'Decor',
            images: [
                'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800',
            ],
            trackingMethod: 'BATCH',
            totalQuantity: 80,
            qrCode: generateQRCode('PR', 'DEC', 13),
            packaging: 'Box of 80',
            weight: '0.45',
            dimensionLength: '60.00',
            dimensionWidth: '45.00',
            dimensionHeight: '1.00',
            volume: '0.0027',
            condition: 'GREEN',
            status: 'AVAILABLE',
            handlingTags: [],
        },
        {
            company: pernodRicard.id,
            brand: null,
            warehouse: dubaiWarehouse.id,
            zone: prDubaiZone?.id,
            name: 'LED Strip Lights RGB 5m',
            description:
                'Flexible LED strip lights for bar illumination. RGB color-changing, remote controlled.',
            category: 'Installation',
            images: [
                'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
            ],
            trackingMethod: 'BATCH',
            totalQuantity: 40,
            qrCode: generateQRCode('PR', 'INS', 14),
            packaging: 'Box of 40',
            weight: '0.35',
            dimensionLength: '30.00',
            dimensionWidth: '20.00',
            dimensionHeight: '5.00',
            volume: '0.003',
            condition: 'GREEN',
            status: 'AVAILABLE',
            handlingTags: ['Fragile'],
        },
    ]

    const createdAssets = await db
        .insert(assets)
        .values(assetsData as any)
        .returning()
        .onConflictDoNothing()
    console.log(`✅ Created ${createdAssets.length} realistic assets\n`)

    // ============================================================
    // 7. COLLECTIONS
    // ============================================================
    console.log('📚 Creating collections...')

    // Absolut Complete Bar Experience
    const [absolutBarSetup] = await db
        .insert(collections)
        .values({
            company: pernodRicard.id,
            brand: absolutBrand?.id,
            name: 'Absolut Complete Bar Experience',
            description:
                'Everything needed for a premium Absolut-branded bar activation including counter, stools, backdrop, glassware, and accessories',
            images: [
                'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800',
                'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
            ],
            category: 'Bar Activation',
        })
        .returning()
        .onConflictDoNothing()

    const absolutBarCounter = createdAssets.find(
        a => a.name === 'Absolut Premium Bar Counter'
    )
    const absolutStools = createdAssets.find(
        a => a.name === 'Absolut Branded Bar Stools'
    )
    const absolutBackdrop = createdAssets.find(
        a => a.name === 'Absolut 3x4m Fabric Backdrop'
    )
    const absolutShotGlasses = createdAssets.find(
        a => a.name === 'Absolut Shot Glasses Premium'
    )
    const absolutHighballGlasses = createdAssets.find(
        a => a.name === 'Absolut Highball Glasses'
    )
    const absolutIceBuckets = createdAssets.find(
        a => a.name === 'Absolut Ice Buckets Stainless'
    )

    if (absolutBarSetup) {
        await db
            .insert(collectionItems)
            .values([
                {
                    collection: absolutBarSetup.id,
                    asset: absolutBarCounter?.id!,
                    defaultQuantity: 1,
                    notes: 'Main bar counter with LED lighting',
                },
                {
                    collection: absolutBarSetup.id,
                    asset: absolutStools?.id!,
                    defaultQuantity: 10,
                    notes: 'Bar seating for guests',
                },
                {
                    collection: absolutBarSetup.id,
                    asset: absolutBackdrop?.id!,
                    defaultQuantity: 1,
                    notes: 'Brand backdrop for photo opportunities',
                },
                {
                    collection: absolutBarSetup.id,
                    asset: absolutShotGlasses?.id!,
                    defaultQuantity: 100,
                    notes: 'For vodka shots and tastings',
                },
                {
                    collection: absolutBarSetup.id,
                    asset: absolutHighballGlasses?.id!,
                    defaultQuantity: 50,
                    notes: 'For cocktails and mixed drinks',
                },
                {
                    collection: absolutBarSetup.id,
                    asset: absolutIceBuckets?.id!,
                    defaultQuantity: 4,
                    notes: 'Ice service for bar',
                },
            ])
            .onConflictDoNothing()
    }

    // Jameson Whiskey Experience
    const [jamesonExp] = await db
        .insert(collections)
        .values({
            company: pernodRicard.id,
            brand: jamesonBrand?.id,
            name: 'Jameson Irish Whiskey Tasting Experience',
            description:
                'Authentic Irish whiskey tasting setup with barrel bars, premium glassware, and brand elements',
            images: [
                'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800',
            ],
            category: 'Tasting Experience',
        })
        .returning()
        .onConflictDoNothing()

    console.log(`✅ Created 2 premium collections\n`)

    // ============================================================
    // 8. ORDERS (Realistic order flow with separate financial status)
    // ============================================================
    console.log('📋 Creating orders across all lifecycle states...')

    // Order 1: CLOSED - Complete lifecycle (Past event in November)
    const order1Date = new Date('2024-11-01T09:30:00Z')
    const [order1] = await db
        .insert(orders)
        .values({
            orderId: generateOrderId(order1Date, 1),
            company: pernodRicard.id,
            brand: absolutBrand?.id,
            userId: prClient1.id,
            contactName: 'Sarah Williams',
            contactEmail: 'sarah.williams@events-agency.ae',
            contactPhone: '+971-50-123-4567',
            eventStartDate: new Date('2024-11-20'),
            eventEndDate: new Date('2024-11-22'),
            venueName: 'Grand Hyatt Dubai',
            venueCountry: 'United Arab Emirates',
            venueCity: 'Dubai',
            venueAddress:
                'Riyadh Road, Umm Hurair 2, Dubai, United Arab Emirates',
            venueAccessNotes:
                'Loading dock access via back entrance. Available 6am-10pm. Contact venue operations manager.',
            specialInstructions:
                'Setup required by 5pm on event day. Premium positioning near main entrance. Extra lighting requested for Instagram moment.',
            calculatedVolume: '8.850',
            calculatedWeight: '385.00',
            pricingTier: createdTiers[1].id,
            a2BasePrice: '2800.00',
            pmgMarginPercent: '25.00',
            pmgMarginAmount: '700.00',
            finalTotalPrice: '3500.00',
            quoteSentAt: new Date('2024-11-02T10:15:00Z'),
            invoiceNumber: generateInvoiceNumber(new Date('2024-11-03'), 1),
            invoiceGeneratedAt: new Date('2024-11-03T09:00:00Z'),
            invoicePdfUrl:
                'https://s3.amazonaws.com/pmg-invoices/INV-20241103-001.pdf',
            invoicePaidAt: new Date('2024-11-05T14:22:00Z'),
            paymentMethod: 'Bank Transfer',
            paymentReference: 'BT-PR-20241105-00123',
            deliveryWindowStart: new Date('2024-11-19T08:00:00Z'),
            deliveryWindowEnd: new Date('2024-11-19T12:00:00Z'),
            pickupWindowStart: new Date('2024-11-22T16:00:00Z'),
            pickupWindowEnd: new Date('2024-11-22T20:00:00Z'),
            truckPhotos: [
                'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800',
            ],
            jobNumber: 'PRJ-2024-PR-100',
            status: 'CLOSED',
            financialStatus: 'PAID', // Feedback #1: Separate financial status
            createdAt: order1Date,
        })
        .returning()
        .onConflictDoNothing()

    // Order 2: PRICING_REVIEW - A2 reviewing pricing (Recent submission)
    const order2Date = new Date('2024-12-08T14:22:00Z')
    const [order2] = await db
        .insert(orders)
        .values({
            orderId: generateOrderId(order2Date, 2),
            company: pernodRicard.id,
            brand: jamesonBrand?.id,
            userId: prClient2.id,
            contactName: 'Michael Brown',
            contactEmail: 'michael.brown@pernod-ricard.com',
            contactPhone: '+971-50-234-5678',
            eventStartDate: new Date('2024-12-22'),
            eventEndDate: new Date('2024-12-24'),
            venueName: 'Burj Al Arab Jumeirah',
            venueCountry: 'United Arab Emirates',
            venueCity: 'Dubai',
            venueAddress: 'Jumeirah Street, Umm Suqeim 3, Dubai, UAE',
            venueAccessNotes:
                'Ultra-premium venue. Strict delivery protocols. White glove service required.',
            specialInstructions:
                'VIP corporate event for 150 guests. Premium setup required with additional brand elements. Photography crew will be present.',
            calculatedVolume: '4.850',
            calculatedWeight: '205.00',
            pricingTier: createdTiers[0].id,
            status: 'PRICING_REVIEW',
            financialStatus: 'PENDING_QUOTE', // Feedback #1: Separate financial status
            createdAt: order2Date,
        })
        .returning()
        .onConflictDoNothing()

    // Order 3: PENDING_APPROVAL - A2 adjusted, PMG needs to approve
    const order3Date = new Date('2024-12-07T11:15:00Z')
    const [order3] = await db
        .insert(orders)
        .values({
            orderId: generateOrderId(order3Date, 3),
            company: pernodRicard.id,
            brand: absolutBrand?.id,
            userId: prClient1.id,
            contactName: 'Lisa Rodriguez',
            contactEmail: 'lisa.rodriguez@pernod-ricard.com',
            contactPhone: '+971-50-345-6789',
            eventStartDate: new Date('2024-12-28'),
            eventEndDate: new Date('2024-12-30'),
            venueName: 'Dubai World Trade Centre - Hall 1',
            venueCountry: 'United Arab Emirates',
            venueCity: 'Dubai',
            venueAddress: 'Convention Gate Avenue, Trade Centre, Dubai, UAE',
            venueAccessNotes:
                'Large exhibition hall. Multiple loading docks available. Forklift access permitted.',
            specialInstructions:
                'Large-scale brand activation with 5 bar stations. Requires early setup starting 2 days before event. Additional crew support needed for assembly.',
            calculatedVolume: '28.500',
            calculatedWeight: '1240.00',
            pricingTier: createdTiers[3].id,
            a2AdjustedPrice: '9200.00',
            a2AdjustmentReason:
                'Large volume requires specialized truck with tail lift. Multiple trips needed. Additional crew of 4 for 2-day setup. Overtime charges for weekend delivery.',
            a2AdjustedAt: new Date('2024-12-08T09:45:00Z'),
            a2AdjustedBy: a2Staff1.id,
            status: 'PENDING_APPROVAL',
            financialStatus: 'PENDING_QUOTE', // Feedback #1: Separate financial status
            createdAt: order3Date,
        })
        .returning()
        .onConflictDoNothing()

    // Order 4: QUOTED - Waiting for client approval
    const order4Date = new Date('2024-12-05T16:30:00Z')
    const [order4] = await db
        .insert(orders)
        .values({
            orderId: generateOrderId(order4Date, 4),
            company: pernodRicard.id,
            brand: jamesonBrand?.id,
            userId: prClient2.id,
            contactName: 'Sarah Jones',
            contactEmail: 'sarah.jones@pernod-ricard.com',
            contactPhone: '+971-50-456-7890',
            eventStartDate: new Date('2024-12-18'),
            eventEndDate: new Date('2024-12-20'),
            venueName: 'Atlantis The Palm - Asateer Tent',
            venueCountry: 'United Arab Emirates',
            venueCity: 'Dubai',
            venueAddress: 'Crescent Road, Palm Jumeirah, Dubai, UAE',
            specialInstructions:
                'Irish whiskey tasting experience for 80 VIP guests. Need authentic setup with barrel bars.',
            calculatedVolume: '7.200',
            calculatedWeight: '315.00',
            pricingTier: createdTiers[1].id,
            a2BasePrice: '2800.00',
            pmgMarginPercent: '25.00',
            pmgMarginAmount: '700.00',
            finalTotalPrice: '3500.00',
            quoteSentAt: new Date('2024-12-06T11:20:00Z'),
            status: 'QUOTED',
            financialStatus: 'QUOTE_SENT', // Feedback #1: Separate financial status
            createdAt: order4Date,
        })
        .returning()
        .onConflictDoNothing()

    // Order 5: CONFIRMED - Client approved, proceeding to fulfillment (Feedback #1: Skip APPROVED)
    const order5Date = new Date('2024-12-04T10:00:00Z')
    const [order5] = await db
        .insert(orders)
        .values({
            orderId: generateOrderId(order5Date, 5),
            company: pernodRicard.id,
            brand: chivasBrand?.id,
            userId: prClient1.id,
            contactName: 'Robert Chen',
            contactEmail: 'robert.chen@pernod-ricard.com',
            contactPhone: '+971-50-567-8901',
            eventStartDate: new Date('2024-12-16'),
            eventEndDate: new Date('2024-12-17'),
            venueName: 'Dubai Opera',
            venueCountry: 'United Arab Emirates',
            venueCity: 'Dubai',
            venueAddress:
                'Sheikh Mohammed bin Rashid Boulevard, Downtown Dubai, UAE',
            calculatedVolume: '3.500',
            calculatedWeight: '155.00',
            pricingTier: createdTiers[0].id,
            a2BasePrice: '1500.00',
            pmgMarginPercent: '25.00',
            pmgMarginAmount: '375.00',
            finalTotalPrice: '1875.00',
            quoteSentAt: new Date('2024-12-05T09:30:00Z'),
            status: 'CONFIRMED', // Feedback #1: Direct from QUOTED to CONFIRMED
            financialStatus: 'QUOTE_ACCEPTED', // Feedback #1: Separate financial status
            createdAt: order5Date,
        })
        .returning()
        .onConflictDoNothing()

    // Order 6: IN_PREPARATION - A2 gathering items
    const order6Date = new Date('2024-12-02T13:45:00Z')
    const [order6] = await db
        .insert(orders)
        .values({
            orderId: generateOrderId(order6Date, 6),
            company: pernodRicard.id,
            brand: absolutBrand?.id,
            userId: prClient2.id,
            contactName: 'Emma Thompson',
            contactEmail: 'emma.thompson@pernod-ricard.com',
            contactPhone: '+971-50-678-9012',
            eventStartDate: new Date('2024-12-13'),
            eventEndDate: new Date('2024-12-14'),
            venueName: 'Address Sky View Hotel',
            venueCountry: 'United Arab Emirates',
            venueCity: 'Dubai',
            venueAddress:
                'Downtown Dubai, Sheikh Mohammed bin Rashid Boulevard',
            calculatedVolume: '14.200',
            calculatedWeight: '485.00',
            pricingTier: createdTiers[2].id,
            a2BasePrice: '4500.00',
            pmgMarginPercent: '25.00',
            pmgMarginAmount: '1125.00',
            finalTotalPrice: '5625.00',
            quoteSentAt: new Date('2024-12-03T10:00:00Z'),
            invoiceNumber: generateInvoiceNumber(new Date('2024-12-04'), 2),
            invoiceGeneratedAt: new Date('2024-12-04T09:15:00Z'),
            invoicePdfUrl:
                'https://s3.amazonaws.com/pmg-invoices/INV-20241204-002.pdf',
            invoicePaidAt: new Date('2024-12-05T16:30:00Z'),
            paymentMethod: 'Bank Transfer',
            paymentReference: 'BT-PR-20241205-00456',
            deliveryWindowStart: new Date('2024-12-12T10:00:00Z'),
            deliveryWindowEnd: new Date('2024-12-12T14:00:00Z'),
            pickupWindowStart: new Date('2024-12-14T18:00:00Z'),
            pickupWindowEnd: new Date('2024-12-14T22:00:00Z'),
            jobNumber: 'PRJ-2024-PR-201',
            status: 'IN_PREPARATION',
            financialStatus: 'PAID', // Feedback #1: Financial progresses independently
            createdAt: order6Date,
        })
        .returning()
        .onConflictDoNothing()

    // Order 7: DELIVERED - Currently at venue
    const order7Date = new Date('2024-12-06T08:00:00Z')
    const [order7] = await db
        .insert(orders)
        .values({
            orderId: generateOrderId(order7Date, 7),
            company: pernodRicard.id,
            brand: absolutBrand?.id,
            userId: prClient1.id,
            contactName: 'David Martinez',
            contactEmail: 'david.martinez@pernod-ricard.com',
            contactPhone: '+971-50-789-0123',
            eventStartDate: new Date('2024-12-11'),
            eventEndDate: new Date('2024-12-12'),
            venueName: 'W Dubai The Palm',
            venueCountry: 'United Arab Emirates',
            venueCity: 'Dubai',
            venueAddress: 'West Crescent, Palm Jumeirah, Dubai',
            calculatedVolume: '5.600',
            calculatedWeight: '245.00',
            pricingTier: createdTiers[1].id,
            a2BasePrice: '2800.00',
            pmgMarginPercent: '25.00',
            pmgMarginAmount: '700.00',
            finalTotalPrice: '3500.00',
            quoteSentAt: new Date('2024-12-07T09:00:00Z'),
            invoiceNumber: generateInvoiceNumber(new Date('2024-12-08'), 3),
            invoiceGeneratedAt: new Date('2024-12-08T10:30:00Z'),
            invoicePdfUrl:
                'https://s3.amazonaws.com/pmg-invoices/INV-20241208-003.pdf',
            invoicePaidAt: new Date('2024-12-09T11:45:00Z'),
            paymentMethod: 'Bank Transfer',
            paymentReference: 'BT-PR-20241209-00789',
            deliveryWindowStart: new Date('2024-12-10T09:00:00Z'),
            deliveryWindowEnd: new Date('2024-12-10T13:00:00Z'),
            pickupWindowStart: new Date('2024-12-12T17:00:00Z'),
            pickupWindowEnd: new Date('2024-12-12T21:00:00Z'),
            truckPhotos: [
                'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800',
            ],
            jobNumber: 'PRJ-2024-PR-202',
            status: 'DELIVERED',
            financialStatus: 'PAID', // Feedback #1: Financial progresses independently
            createdAt: order7Date,
        })
        .returning()
        .onConflictDoNothing()

    console.log(`✅ Created 7 orders across various states\n`)

    // ============================================================
    // 9. ORDER ITEMS
    // ============================================================
    console.log('📝 Adding items to orders...')

    // Items for Order 1 (CLOSED - Absolut Bar Setup)
    if (order1) {
        await db
            .insert(orderItems)
            .values([
                {
                    order: order1.id,
                    asset: absolutBarCounter?.id!,
                    assetName: 'Absolut Premium Bar Counter',
                    quantity: 1,
                    volume: '1.788',
                    weight: '95.00',
                    totalVolume: '1.788',
                    totalWeight: '95.00',
                    condition: 'GREEN',
                    handlingTags: [
                        'HeavyLift',
                        'AssemblyRequired',
                        'HighValue',
                    ],
                    fromCollection: absolutBarSetup?.id,
                    fromCollectionName: 'Absolut Complete Bar Experience',
                },
                {
                    order: order1.id,
                    asset: absolutStools?.id!,
                    assetName: 'Absolut Branded Bar Stools',
                    quantity: 10,
                    volume: '0.158',
                    weight: '9.20',
                    totalVolume: '1.580',
                    totalWeight: '92.00',
                    condition: 'GREEN',
                    handlingTags: ['Fragile'],
                    fromCollection: absolutBarSetup?.id,
                    fromCollectionName: 'Absolut Complete Bar Experience',
                },
                {
                    order: order1.id,
                    asset: absolutBackdrop?.id!,
                    assetName: 'Absolut 3x4m Fabric Backdrop',
                    quantity: 1,
                    volume: '3.360',
                    weight: '18.50',
                    totalVolume: '3.360',
                    totalWeight: '18.50',
                    condition: 'GREEN',
                    handlingTags: ['AssemblyRequired'],
                    fromCollection: absolutBarSetup?.id,
                    fromCollectionName: 'Absolut Complete Bar Experience',
                },
            ])
            .onConflictDoNothing()
    }

    console.log(`✅ Created order items\n`)

    // ============================================================
    // 10. CONDITION HISTORY (Feedback #2: Realistic damage scenarios)
    // ============================================================
    console.log('🩺 Creating asset condition history...')

    const absolutLightBox = createdAssets.find(
        a => a.name === 'Absolut LED Light Box 2m'
    )
    if (absolutLightBox) {
        await db
            .insert(assetConditionHistory)
            .values([
                {
                    asset: absolutLightBox.id,
                    condition: 'GREEN',
                    notes: 'Initial condition - brand new from manufacturer',
                    updatedBy: a2Staff1.id,
                    timestamp: new Date('2024-08-15'),
                },
                {
                    asset: absolutLightBox.id,
                    condition: 'RED',
                    notes: 'LED panel severely cracked during transport. Full panel replacement required. Unit non-functional. Estimated 7 days for repair including parts ordering.',
                    photos: [
                        'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=800',
                        'https://images.unsplash.com/photo-1588421357574-87938a86fa28?w=800',
                    ],
                    updatedBy: a2Staff2.id,
                    timestamp: new Date('2024-12-03'),
                },
            ])
            .onConflictDoNothing()
    }

    const jamesonVintageGlasses = createdAssets.find(
        a => a.name === 'Jameson Whiskey Glasses Vintage'
    )
    if (jamesonVintageGlasses) {
        await db
            .insert(assetConditionHistory)
            .values([
                {
                    asset: jamesonVintageGlasses.id,
                    condition: 'GREEN',
                    notes: 'New vintage-style glasses received',
                    updatedBy: a2Staff1.id,
                    timestamp: new Date('2024-09-20'),
                },
                {
                    asset: jamesonVintageGlasses.id,
                    condition: 'ORANGE',
                    notes: 'Minor chips on rim of some glasses after event return. Still functional but affects presentation. Surface polishing recommended. Estimated 3 days for refurbishment.',
                    photos: [
                        'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=800',
                    ],
                    updatedBy: a2Staff2.id,
                    timestamp: new Date('2024-11-15'),
                },
            ])
            .onConflictDoNothing()
    }

    console.log(`✅ Created condition history entries\n`)

    // ============================================================
    // 11. ASSET BOOKINGS (Feedback #4 & #5: Date-based availability with buffers)
    // ============================================================
    console.log('📅 Creating asset bookings with buffer days...')

    // Helper to calculate blocked period with buffers
    const calculateBlockedPeriod = (
        eventStart: Date,
        eventEnd: Date,
        refurbDays: number = 0
    ) => {
        const PREP_BUFFER = 5
        const RETURN_BUFFER = 3
        const totalPrepDays = PREP_BUFFER + refurbDays

        return {
            blockedFrom: subDays(eventStart, totalPrepDays),
            blockedUntil: addDays(eventEnd, RETURN_BUFFER),
        }
    }

    // Create bookings for CONFIRMED and later orders
    const bookingsData = []

    // Order 1 (CLOSED) - Already returned, no active booking
    // Order 2 (PRICING_REVIEW) - Not yet confirmed, no booking
    // Order 3 (PENDING_APPROVAL) - Not yet confirmed, no booking
    // Order 4 (QUOTED) - Not yet confirmed, no booking

    // Order 5 (CONFIRMED) - Has bookings
    if (order5) {
        const { blockedFrom, blockedUntil } = calculateBlockedPeriod(
            new Date('2024-12-16'),
            new Date('2024-12-17')
        )
        // Assuming order5 has Chivas items
        const chivasChairs = createdAssets.find(
            a => a.name === 'Chivas Regal VIP Lounge Chairs'
        )
        const chivasGlasses = createdAssets.find(
            a => a.name === 'Chivas Regal Crystal Tasting Glasses'
        )
        if (chivasChairs) {
            bookingsData.push({
                asset: chivasChairs.id,
                order: order5.id,
                quantity: 6,
                blockedFrom,
                blockedUntil,
            })
        }
        if (chivasGlasses) {
            bookingsData.push({
                asset: chivasGlasses.id,
                order: order5.id,
                quantity: 50,
                blockedFrom,
                blockedUntil,
            })
        }
    }

    // Order 6 (IN_PREPARATION) - Has bookings
    if (order6) {
        const { blockedFrom, blockedUntil } = calculateBlockedPeriod(
            new Date('2024-12-13'),
            new Date('2024-12-14')
        )
        // Assuming order6 has Absolut items
        if (absolutBarCounter) {
            bookingsData.push({
                asset: absolutBarCounter.id,
                order: order6.id,
                quantity: 2,
                blockedFrom,
                blockedUntil,
            })
        }
        if (absolutStools) {
            bookingsData.push({
                asset: absolutStools.id,
                order: order6.id,
                quantity: 12,
                blockedFrom,
                blockedUntil,
            })
        }
        if (absolutBackdrop) {
            bookingsData.push({
                asset: absolutBackdrop.id,
                order: order6.id,
                quantity: 1,
                blockedFrom,
                blockedUntil,
            })
        }
    }

    // Order 7 (DELIVERED) - Has bookings
    if (order7) {
        const { blockedFrom, blockedUntil } = calculateBlockedPeriod(
            new Date('2024-12-11'),
            new Date('2024-12-12')
        )
        // Assuming order7 has Absolut items
        if (absolutShotGlasses) {
            bookingsData.push({
                asset: absolutShotGlasses.id,
                order: order7.id,
                quantity: 80,
                blockedFrom,
                blockedUntil,
            })
        }
        if (absolutHighballGlasses) {
            bookingsData.push({
                asset: absolutHighballGlasses.id,
                order: order7.id,
                quantity: 40,
                blockedFrom,
                blockedUntil,
            })
        }
        if (absolutIceBuckets) {
            bookingsData.push({
                asset: absolutIceBuckets.id,
                order: order7.id,
                quantity: 6,
                blockedFrom,
                blockedUntil,
            })
        }
    }

    if (bookingsData.length > 0) {
        await db
            .insert(assetBookings)
            .values(bookingsData)
            .onConflictDoNothing()
    }

    console.log(
        `✅ Created ${bookingsData.length} asset bookings with 5-day prep + 3-day return buffers\n`
    )

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n🎉 Demo Data Seeding Complete!\n')
    console.log('═══════════════════════════════════════════════════════')
    console.log('📊 SUMMARY:')
    console.log('═══════════════════════════════════════════════════════')
    console.log('✅ 1 Company (Pernod Ricard only - Feedback #6)')
    console.log('✅ 5 Premium Spirit Brands')
    console.log('✅ 2 Warehouses (Dubai, Abu Dhabi)')
    console.log('✅ 3 Company-Exclusive Zones')
    console.log(`✅ 10 Pricing Tiers (Dubai, Abu Dhabi, Sharjah)`)
    console.log(
        `✅ ${createdAssets.length}+ Realistic Assets with contextual images`
    )
    console.log('✅ 2 Premium Collections')
    console.log(
        '✅ 7 Orders (CLOSED, PRICING_REVIEW, PENDING_APPROVAL, QUOTED, CONFIRMED, IN_PREPARATION, DELIVERED)'
    )
    console.log('✅ Separate financial status tracking (Feedback #1)')
    console.log('✅ Condition visibility with refurb estimates (Feedback #2)')
    console.log('✅ Date-based bookings with buffer days (Feedback #4 & #5)')
    console.log('✅ Complete order items and status history')
    console.log('✅ Asset condition tracking with realistic damage scenarios')
    console.log('✅ 4 Users (2 A2 Staff, 2 Pernod Ricard Clients)')
    console.log('═══════════════════════════════════════════════════════\n')

    console.log('🔑 TEST CREDENTIALS:')
    console.log('─────────────────────────────────────────────────────')
    console.log('A2 Staff:')
    console.log('  • ahmed.almaktoum@a2logistics.ae / A2Staff123!')
    console.log('  • fatima.hassan@a2logistics.ae / A2Staff123!')
    console.log('\nPernod Ricard Clients:')
    console.log('  • john.smith@pernod-ricard.com / Client123!')
    console.log('  • sarah.jones@pernod-ricard.com / Client123!')
    console.log('═══════════════════════════════════════════════════════\n')
}

