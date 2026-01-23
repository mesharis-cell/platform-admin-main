# Admin Errors To Fix

## Typecheck Errors (13)

- [x] `src/app/(admin)/assets/bulk-upload/page.tsx` L457/L460: unreachable `'uploading'` comparison
- [x] `src/lib/api/auth-middleware.ts` L24: `companies` not in `User`
- [x] `src/lib/api/auth-middleware.ts` L56: `isActive` not in `User`
- [x] `src/lib/auth/server.ts`: `@/db` not found
- [x] `src/lib/auth/server.ts`: `@/db/schema` not found
- [x] `src/lib/db/seed-demo.ts`: `@/db` not found (excluded from typecheck)
- [x] `src/lib/db/seed-demo.ts`: `@/db/schema` not found (excluded from typecheck)
- [x] `src/lib/db/seed.ts`: `@/db` not found (excluded from typecheck)
- [x] `src/lib/db/seed.ts`: `@/db/schema` not found (excluded from typecheck)
- [x] `src/lib/db/seed.ts`: `PERMISSION_TEMPLATES.PMG_ADMIN` missing
- [x] `src/lib/db/seed.ts`: `PERMISSION_TEMPLATES.PMG_ADMIN` missing (second use)
- [x] `tailwind.config.ts`: `darkMode` type mismatch

## Lint Errors (~35k)

- [x] Formatting rules: quotes/indent/semicolons across many files  
      (resolved via Prettier + eslint-config-prettier)

## Real Bugs (mark when verified)

- [ ] Missing full domain schema for seed/demo scripts
- [x] `PMG_ADMIN` template mismatch
- [x] `getAuthUser` field mapping mismatch (camelCase vs snake_case)
