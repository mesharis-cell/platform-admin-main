// Load environment variables FIRST before any imports
import { config } from 'dotenv'
config()

// Check if demo data flag is passed
const includeDemoData = process.argv.includes('--demo')

// Use dynamic import to ensure env vars are loaded first
async function main() {
	if (includeDemoData) {
		console.log('🎨 Running seed with comprehensive demo data...\n')
	} else {
		console.log('🌱 Running basic seed (admin + system user only)')
		console.log(
			"💡 Tip: Run 'bun run db:seed --demo' to include demo data\n"
		)
	}

	const { runSeeds } = await import('../src/lib/db/seed')
	await runSeeds(includeDemoData)
}

// Run seeds
main()
	.then(() => {
		console.log('\n✅ Seeding completed successfully')
		if (includeDemoData) {
			console.log('\n📝 Test Credentials:')
			console.log('   PMG Admin: admin@pmg.com / Admin123!')
			console.log(
				'   A2 Staff: ahmed.almaktoum@a2logistics.ae / A2Staff123!'
			)
			console.log(
				'   A2 Staff: fatima.hassan@a2logistics.ae / A2Staff123!'
			)
			console.log(
				'   Client (Pernod Ricard): john.smith@pernod-ricard.com / Client123!'
			)
			console.log(
				'   Client (Pernod Ricard): sarah.jones@pernod-ricard.com / Client123!\n'
			)
		}
		process.exit(0)
	})
	.catch(error => {
		console.error('\n❌ Seeding failed:', error)
		process.exit(1)
	})
