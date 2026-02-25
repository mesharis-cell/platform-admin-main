## Admin Error Analysis

**Date**: 2026-01-23

### Summary

- **Typecheck**: 0 errors (seed scripts excluded)
- **Lint**: 0 errors (format/lint aligned)

### Real Bugs (need logic awareness)

1. Missing full domain schema for seed/demo scripts
    - `src/db/schema/index.ts` is auth-only with placeholders
    - Seed scripts are excluded from typecheck until schema is added

### Type Errors (non‑bug)

- `bulk-upload/page.tsx`: comparison against `'uploading'` inside a branch that excludes it
- `tailwind.config.ts`: `darkMode` type mismatch

### Lint Errors (resolved)

Formatting rules aligned to Prettier; lint now shows only real issues.
