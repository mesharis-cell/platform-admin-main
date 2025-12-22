import { runSeeds } from "../src/lib/db/seed";
import { config } from "dotenv";

// Load environment variables
config();

console.log("🎨 Running comprehensive demo data seed...\n");
console.log("This will create:");
console.log("  - 3 companies with brands");
console.log("  - 2 warehouses with zones");
console.log("  - 10+ pricing tiers");
console.log("  - 50+ assets across categories");
console.log("  - 10+ collections");
console.log("  - 30+ orders in all lifecycle states");
console.log("  - Multiple users (A2 Staff & Clients)");
console.log("  - Scan events, condition history, notifications\n");

// Run seeds with demo data
runSeeds(true)
	.then(() => {
		console.log("\n✅ Seeding completed successfully");
		console.log("\n📝 Test Credentials:");
		console.log("   PMG Admin: admin@pmg.com / Admin123!");
		console.log("   A2 Staff: ahmed@a2logistics.com / A2Staff123!");
		console.log("   Client (Pernod): john.smith@pernodricard.com / Client123!");
		console.log("   Client (Diageo): michael.brown@diageo.com / Client123!");
		console.log("   Client (Bacardi): lisa.rodriguez@bacardi.com / Client123!\n");
		process.exit(0);
	})
	.catch((error) => {
		console.error("\n❌ Seeding failed:", error);
		process.exit(1);
	});
