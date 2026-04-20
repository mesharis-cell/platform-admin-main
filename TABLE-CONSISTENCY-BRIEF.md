# Admin Table Page Consistency Brief

## Two tiers of list pages

**Tier 1 — Product pages** (client-facing SaaS flows): Orders, Self-Pickups, Service Requests, Self-Bookings, New Stock Requests, Line Item Requests, Workflow Inbox. Rich filters (status, company, brand, dates), dense rows with badges/actions. These align with the Orders page layout — don't touch in this pass.

**Tier 2 — Settings/registry pages** (internal CRUD): Users, Companies, Brands, Teams, Warehouses, Zones, Cities, Countries, Access Policies, Attachment Types, Workflow Definitions, Service Types, Warehouse Ops Rates, Categories, Notifications. Simpler tables. These align with the cities/countries pattern.

## The canonical Tier 2 pattern (cities/countries)

Reference files:

- `src/app/settings/locations/countries/page.tsx`
- `src/app/settings/locations/cities/page.tsx`
- `src/app/settings/categories/page.tsx`

Structure:

1. `AdminHeader` — icon, UPPERCASE title, description, stats, create action (Dialog embedded in actions prop)
2. Search/filter strip — `<div className="border-b border-border bg-card px-8 py-4">`
3. Content area — `<div className="px-8 py-6">`
4. Table wrapper — `<div className="border border-border rounded-lg overflow-hidden bg-card">`
5. TableHeader row — `<TableRow className="bg-muted/50 border-border/50">`
6. TableHead cells — `className="font-mono text-xs font-bold"` with UPPERCASE text
7. Empty state — centered icon + `font-mono text-sm text-muted-foreground` uppercase
8. Loading state — centered `font-mono animate-pulse` uppercase
9. **No** Card/CardHeader/CardContent wrapping the table

## Pages that need alignment

| Page                                                    | Current issue                                              |
| ------------------------------------------------------- | ---------------------------------------------------------- |
| `src/app/users/page.tsx`                                | Uses DataTable component instead of raw Table              |
| `src/app/brands/page.tsx`                               | Uses DataTable component                                   |
| `src/app/self-pickups/page.tsx`                         | Card > CardContent wrapping table, no AdminHeader          |
| `src/app/settings/access-policies/page.tsx`             | Card > CardHeader > CardContent > Table, container mx-auto |
| `src/app/settings/attachment-types/page.tsx`            | Custom header (not AdminHeader), Card wrapping             |
| `src/app/settings/pricing/service-types/page.tsx`       | Card wrapping table                                        |
| `src/app/settings/pricing/warehouse-opt-rates/page.tsx` | Card wrapping table                                        |

## Pages already correct ✓

Cities, Countries, Warehouses, Zones, Categories.

## Rules

- Detail pages can be unique — only the list page shell matters
- DataTable component should be replaced with raw Table + the standard layout
- Every Tier 2 list page gets AdminHeader, search strip, bare table in rounded border wrapper
- Don't touch Tier 1 pages in this pass
