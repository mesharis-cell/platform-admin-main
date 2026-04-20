/**
 * Full Red Bull client portal walkthrough on prod.
 * Runs once the Amplify deploy lands + the catalog crash is fixed.
 *
 * Covers the remaining user-visible unverified reshapes:
 *   - Catalog renders with category pills (no "Uncategorized" for real families)
 *   - Family detail page
 *   - Add to cart flow
 *   - Checkout standard-mode → DateTimeRangePicker + feasibility helper
 *   - Self-pickup mode toggle (enable_self_pickup is ON for Red Bull)
 *   - Self-pickup checkout renders
 *
 * Does NOT submit any order — all captures are read-only renders.
 */

import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

const OUT = "/tmp/kadence-smoke-screenshots/redbull-final";
fs.mkdirSync(OUT, { recursive: true });

async function loginRedBullClient(page: Page) {
    await page.goto("https://redbull.kadence.ae/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 25_000 }).catch(() => {});
    await page.getByLabel(/email/i).first().fill("client@redbull.test");
    await page.getByLabel(/^password/i).fill("password123");
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/(client-dashboard|catalog|my-orders)/, { timeout: 30_000 });
}

test("01 catalog — no crash, categories visible", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (e) => consoleErrors.push(e.message));

    await loginRedBullClient(page);
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/families/i", { timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/01-catalog.png`, fullPage: true });

    expect(consoleErrors.filter((e) => e.includes("React error #31"))).toHaveLength(0);
    const hasCategory = await page
        .getByText(/installation|furniture|decor|glassware/i)
        .first()
        .isVisible();
    expect(hasCategory).toBeTruthy();
});

test("02 family detail — category pill + stock info", async ({ page }) => {
    await loginRedBullClient(page);
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/families/i", { timeout: 20_000 });
    const firstFamilyLink = page.locator('a[href*="/catalog/families/"]').first();
    await firstFamilyLink.click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/02-family-detail.png`, fullPage: true });
});

test("03 add first available asset to cart", async ({ page }) => {
    await loginRedBullClient(page);
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/families/i", { timeout: 20_000 });
    await page.locator('a[href*="/catalog/families/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    // Click into first asset tile
    const firstAssetLink = page.locator('a[href*="/catalog/assets/"]').first();
    if (await firstAssetLink.isVisible().catch(() => false)) {
        await firstAssetLink.click();
        await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
        await page.screenshot({ path: `${OUT}/03a-asset-detail.png`, fullPage: true });

        const addBtn = page.getByRole("button", { name: /add to cart|add to order/i }).first();
        if (await addBtn.isVisible().catch(() => false)) {
            await addBtn.click();
            await page.waitForTimeout(1200);
            await page.screenshot({ path: `${OUT}/03b-after-add.png`, fullPage: true });
        }
    }
});

test("04 checkout — DateTimeRangePicker + feasibility helper", async ({ page }) => {
    await loginRedBullClient(page);
    // Add an item first
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/families/i", { timeout: 20_000 });
    await page.locator('a[href*="/catalog/families/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const firstAssetLink = page.locator('a[href*="/catalog/assets/"]').first();
    if (await firstAssetLink.isVisible().catch(() => false)) {
        await firstAssetLink.click();
        await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
        const addBtn = page.getByRole("button", { name: /add to cart/i }).first();
        if (await addBtn.isVisible().catch(() => false)) {
            await addBtn.click();
            await page.waitForTimeout(1500);
        }
    }

    await page.goto("https://redbull.kadence.ae/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 25_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/04a-checkout-top.png`, fullPage: true });

    // Scroll through checkout for full picture
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/04b-checkout-middle.png`, fullPage: true });

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/04c-checkout-bottom.png`, fullPage: true });

    // Try to open a date picker
    const dateTrigger = page
        .locator("button")
        .filter({ hasText: /pick|select.*date|start.*date|from/i })
        .first();
    if (await dateTrigger.isVisible().catch(() => false)) {
        await dateTrigger.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: `${OUT}/04d-date-picker-open.png`, fullPage: true });
    }
});

test("05 self-pickup mode — toggle + flow renders", async ({ page }) => {
    await loginRedBullClient(page);
    // Add an item so checkout has something
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/families/i", { timeout: 20_000 });
    await page.locator('a[href*="/catalog/families/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const firstAssetLink = page.locator('a[href*="/catalog/assets/"]').first();
    if (await firstAssetLink.isVisible().catch(() => false)) {
        await firstAssetLink.click();
        await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
        const addBtn = page.getByRole("button", { name: /add to cart/i }).first();
        if (await addBtn.isVisible().catch(() => false)) {
            await addBtn.click();
            await page.waitForTimeout(1500);
        }
    }

    await page.goto("https://redbull.kadence.ae/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

    // Toggle self-pickup
    const selfPickupToggle = page.getByText(/self[-\s]?pickup|pick.*up.*yourself/i).first();
    if (await selfPickupToggle.isVisible().catch(() => false)) {
        await selfPickupToggle.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${OUT}/05a-self-pickup-mode.png`, fullPage: true });

        // Scroll down for full view
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${OUT}/05b-self-pickup-bottom.png`, fullPage: true });
    } else {
        await page.screenshot({
            path: `${OUT}/05-no-self-pickup-toggle-found.png`,
            fullPage: true,
        });
    }
});

test("06 my-orders list renders", async ({ page }) => {
    await loginRedBullClient(page);
    await page.goto("https://redbull.kadence.ae/my-orders", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/06-my-orders.png`, fullPage: true });
});
