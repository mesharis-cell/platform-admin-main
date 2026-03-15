import { test as base, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

export function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required env var: ${name}`);
    return value;
}

// ---------------------------------------------------------------------------
// Auth fixture — logs in once per worker, reuses auth state across tests
// ---------------------------------------------------------------------------

async function loginAdmin(page: Page) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /access control/i })).toBeVisible();
    await page.getByLabel(/email address/i).fill(requireEnv("ADMIN_EMAIL"));
    await page.getByLabel(/password/i).fill(requireEnv("ADMIN_PASSWORD"));
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/analytics$/, { timeout: 60_000 });
}

// Extend the base test with an authenticated page
export const test = base.extend<{ authedPage: Page }>({
    authedPage: async ({ page }, use) => {
        await loginAdmin(page);
        await use(page);
    },
});

export { expect };
