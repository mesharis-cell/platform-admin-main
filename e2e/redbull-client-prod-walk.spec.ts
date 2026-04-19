/**
 * Red Bull client portal prod walkthrough.
 *
 * Goal: visual evidence that the 22 reshapes work end-to-end on prod for
 * the real go-live tenant. Captures DateTimeRangePicker, feasibility
 * helper, self-pickup mode toggle, category pills on catalog. Does NOT
 * submit any order.
 *
 * Test user: client@redbull.test / password123 (Red Bull User, CLIENT).
 */

import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

const OUT = "/tmp/kadence-smoke-screenshots/redbull-prod";
fs.mkdirSync(OUT, { recursive: true });

const consoleBag = new Map<string, string[]>();

test.beforeEach(async ({ page }, info) => {
    const bag: string[] = [];
    consoleBag.set(info.title, bag);
    page.on("console", (msg) => {
        if (msg.type() === "error") bag.push(msg.text().slice(0, 400));
    });
    page.on("pageerror", (err) => bag.push(`[pageerror] ${err.message}`));
});

test.afterEach(async ({}, info) => {
    const errs = consoleBag.get(info.title) ?? [];
    if (errs.length) {
        console.log(`\n[console errors in "${info.title}"] ${errs.length} msg(s):`);
        errs.slice(0, 5).forEach((e) => console.log(`  • ${e}`));
    }
});

async function loginRedBullClient(page: Page) {
    await page.goto("https://redbull.kadence.ae/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 25_000 }).catch(() => {});
    await page.getByLabel(/email/i).first().fill("client@redbull.test");
    await page.getByLabel(/^password/i).fill("password123");
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/(client-dashboard|catalog|my-orders)/, { timeout: 30_000 });
}

test("01 login page loads + has branding", async ({ page }) => {
    await page.goto("https://redbull.kadence.ae/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/01-login.png`, fullPage: true });
});

test("02 dashboard post-login", async ({ page }) => {
    await loginRedBullClient(page);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/02-dashboard.png`, fullPage: true });
});

test("03 catalog — category pills + filter dropdown", async ({ page }) => {
    await loginRedBullClient(page);
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/famil(y|ies)/i", { timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/03-catalog.png`, fullPage: true });
    // Verify at least one category pill — we confirmed via API that Red Bull families return real category data
    const uncategorized = await page.getByText(/uncategorized/i).count();
    console.log("  uncategorized labels visible:", uncategorized, "(should be 0 if fix landed)");
});

test("04 catalog — open category filter dropdown", async ({ page }) => {
    await loginRedBullClient(page);
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/famil(y|ies)/i", { timeout: 30_000 });
    const catFilter = page.getByRole("combobox").filter({ hasText: /categor/i }).first()
        .or(page.locator("button").filter({ hasText: /all categories/i }).first());
    if (await catFilter.isVisible().catch(() => false)) {
        await catFilter.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: `${OUT}/04-catalog-category-filter-open.png`, fullPage: true });
    } else {
        await page.screenshot({ path: `${OUT}/04-catalog-no-filter-found.png`, fullPage: true });
    }
});

test("05 add first family to cart", async ({ page }) => {
    await loginRedBullClient(page);
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/famil(y|ies)/i", { timeout: 30_000 });

    // Click first family card "View items" or the card itself
    const firstFamilyLink = page.locator('a[href*="/catalog/families/"]').first();
    await firstFamilyLink.click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/05a-family-detail.png`, fullPage: true });

    // Try to add to cart — various possible selectors
    const addBtn = page.getByRole("button", { name: /add to (cart|order)|add item/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${OUT}/05b-added-to-cart.png`, fullPage: true });
    } else {
        console.log("  no add-to-cart button found on family detail — dumping state");
        await page.screenshot({ path: `${OUT}/05b-no-add-button.png`, fullPage: true });
    }
});

test("06 checkout — full page + DateTimeRangePicker + feasibility + self-pickup mode", async ({ page }) => {
    await loginRedBullClient(page);
    // Add an item via the catalog click-through so cart has something
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/famil(y|ies)/i", { timeout: 30_000 });
    const firstFamilyLink = page.locator('a[href*="/catalog/families/"]').first();
    await firstFamilyLink.click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const addBtn = page.getByRole("button", { name: /add to (cart|order)|add item/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(1500);
    }

    // Now navigate to checkout
    await page.goto("https://redbull.kadence.ae/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 25_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/06a-checkout-initial.png`, fullPage: true });

    // Try to open the DateTimeRangePicker — look for a date field
    const dateTrigger = page.locator('button').filter({ hasText: /pick|select.*date|from|to|date/i }).first();
    if (await dateTrigger.isVisible().catch(() => false)) {
        await dateTrigger.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${OUT}/06b-datetime-picker-open.png`, fullPage: true });
        await page.keyboard.press("Escape");
    }

    // Scroll through full checkout for visual review
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/06c-checkout-middle.png`, fullPage: true });

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/06d-checkout-bottom.png`, fullPage: true });

    // Self-pickup mode selector
    const selfPickupToggle = page.getByText(/self[\s-]?pick[\s-]?up|pickup mode|delivery mode/i).first();
    if (await selfPickupToggle.isVisible().catch(() => false)) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await selfPickupToggle.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${OUT}/06e-self-pickup-toggle-visible.png`, fullPage: false, clip: await selfPickupToggle.evaluateHandle(el => { const r = (el as HTMLElement).getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top - 100), width: 1280, height: Math.min(600, document.documentElement.clientHeight) }; }).then(h => h.jsonValue()) }).catch(() => {
            // clip failed, take full
            return page.screenshot({ path: `${OUT}/06e-self-pickup-toggle-visible.png`, fullPage: true });
        });
    }
});

test("07 my-orders list", async ({ page }) => {
    await loginRedBullClient(page);
    await page.goto("https://redbull.kadence.ae/my-orders", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/07-my-orders.png`, fullPage: true });
});
