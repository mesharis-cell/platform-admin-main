// Barrel for the pricing-ledger surface. All four entity pages (order / SP /
// inbound / SR) now render the ledger; the old PricingBreakdownTabs +
// AdminBreakdownView were retired in Phase 3 (P3-5).
export { PricingLedger } from "./PricingLedger";
export type { PricingLedgerProps } from "./PricingLedger";
export { PricingLedgerRow } from "./PricingLedgerRow";
export { BulkMarginDialog } from "./BulkMarginDialog";
export { NoCostDialog } from "./NoCostDialog";

// Pre-existing breakdown views reused by the ledger's preview lenses.
export { ClientBreakdownView } from "./ClientBreakdownView";
export { LogisticsBreakdownView } from "./LogisticsBreakdownView";
