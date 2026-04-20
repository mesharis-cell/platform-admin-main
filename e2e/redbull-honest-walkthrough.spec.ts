/**
 * HONEST Red Bull client portal walkthrough.
 * Clicks through every interactive element, captures each step + picker state.
 * Screenshots live under /tmp/kadence-smoke-screenshots/redbull-honest/.
 */

import { test, type Page, type BrowserContext } from "@playwright/test";
import fs from "node:fs";

const OUT = "/tmp/kadence-smoke-screenshots/redbull-honest";
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const allConsoleErrors: { test: string; msg: string }[] = [];

test.beforeEach(async ({ page }, info) => {
    page.on("console", (msg) => {
        if (msg.type() === "error") {
            allConsoleErrors.push({ test: info.title, msg: msg.text().slice(0, 500) });
        }
    });
    page.on("pageerror", (err) => {
        allConsoleErrors.push({ test: info.title, msg: `[pageerror] ${err.message}` });
    });
});

test.afterAll(async () => {
    fs.writeFileSync(
        `${OUT}/console-errors.log`,
        allConsoleErrors.map((e) => `[${e.test}]\n${e.msg}`).join("\n---\n")
    );
});

async function login(page: Page) {
    await page.goto("https://redbull.kadence.ae/", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email/i).first().fill("client@redbull.test");
    await page.getByLabel(/^password/i).fill("password123");
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/(client-dashboard|catalog|my-orders)/, { timeout: 30_000 });
}

async function shot(page: Page, name: string) {
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

// Share cart state across tests by using a single worker + persisted storage
test.describe.configure({ mode: "serial" });

test("A01 login + dashboard", async ({ page }) => {
    await page.goto("https://redbull.kadence.ae/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await shot(page, "A01-login");
    await login(page);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await shot(page, "A02-dashboard");
});

test("B01 catalog list", async ({ page }) => {
    await login(page);
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/families/i", { timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await shot(page, "B01-catalog-top");
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(400);
    await shot(page, "B02-catalog-scrolled");
});

test("B02 catalog — open category filter", async ({ page }) => {
    await login(page);
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/families/i", { timeout: 30_000 });
    // Click the "All categories" Select trigger
    const catTrigger = page.getByText(/all categories/i).first();
    if (await catTrigger.isVisible().catch(() => false)) {
        await catTrigger.click();
        await page.waitForTimeout(700);
        await shot(page, "B03-category-filter-open");
        await page.keyboard.press("Escape");
    }
    // Also open All brands
    const brandTrigger = page.getByText(/all brands/i).first();
    if (await brandTrigger.isVisible().catch(() => false)) {
        await brandTrigger.click();
        await page.waitForTimeout(700);
        await shot(page, "B04-brand-filter-open");
        await page.keyboard.press("Escape");
    }
});

test("C01 family detail", async ({ page }) => {
    await login(page);
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/families/i", { timeout: 30_000 });
    await page.locator('a[href*="/catalog/families/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await shot(page, "C01-family-detail-top");
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(400);
    await shot(page, "C02-family-detail-scrolled");
});

test("D01 asset detail + add to cart", async ({ page }) => {
    await login(page);
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/families/i", { timeout: 30_000 });
    await page.locator('a[href*="/catalog/families/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.locator('a[href*="/catalog/assets/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await shot(page, "D01-asset-detail-top");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(400);
    await shot(page, "D02-asset-detail-middle");

    const addBtn = page.getByRole("button", { name: /add to cart/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await addBtn.scrollIntoViewIfNeeded();
        await shot(page, "D03-before-add");
        await addBtn.click();
        await page.waitForTimeout(1500);
        await shot(page, "D04-after-add");
    }
});

// ─── Checkout: standard delivery flow — all 5 steps + open window pickers
test("E01 checkout step 1 — mode selector", async ({ page }) => {
    await login(page);
    // Ensure cart has an item
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/families/i", { timeout: 30_000 });
    await page.locator('a[href*="/catalog/families/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.locator('a[href*="/catalog/assets/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const addBtn = page.getByRole("button", { name: /add to cart/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(1500);
    }

    await page.goto("https://redbull.kadence.ae/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await shot(page, "E01-checkout-step1");
});

test("E02 checkout step 2 — installation details with dates + window pickers", async ({ page }) => {
    await login(page);
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/families/i", { timeout: 30_000 });
    await page.locator('a[href*="/catalog/families/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.locator('a[href*="/catalog/assets/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const addBtn = page.getByRole("button", { name: /add to cart/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(1500);
    }

    await page.goto("https://redbull.kadence.ae/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    // Step 1 → Continue
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.waitForTimeout(1500);
    await shot(page, "E02a-step2-blank");

    // Fill event start + end
    const startDate = page.locator('input[type="date"]').first();
    await startDate.fill("2026-05-15");
    const endDate = page.locator('input[type="date"]').nth(1);
    await endDate.fill("2026-05-17");
    await page.waitForTimeout(400);
    await shot(page, "E02b-step2-dates-entered");

    // Open Delivery window picker
    const deliveryWindowBtn = page.getByRole("button", { name: /choose delivery window/i }).first();
    if (await deliveryWindowBtn.isVisible().catch(() => false)) {
        await deliveryWindowBtn.click();
        await page.waitForTimeout(800);
        await shot(page, "E02c-delivery-window-picker-open");
        // Try to pick a date and time
        const anyDay = page.getByRole("gridcell").filter({ hasText: /^15$/ }).first();
        if (await anyDay.isVisible().catch(() => false)) {
            await anyDay.click();
            await page.waitForTimeout(500);
            await shot(page, "E02d-delivery-picker-day-selected");
        }
        // Look for an hour column
        const hourButton = page
            .locator("button")
            .filter({ hasText: /^(1[0-2]|[1-9])$/ })
            .first();
        if (await hourButton.isVisible().catch(() => false)) {
            await hourButton.click();
            await page.waitForTimeout(500);
            await shot(page, "E02e-delivery-picker-hour-selected");
        }
        // Close picker
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
        await shot(page, "E02f-delivery-window-after-pick");
    }

    // Open Pickup window picker
    const pickupWindowBtn = page.getByRole("button", { name: /choose pickup window/i }).first();
    if (await pickupWindowBtn.isVisible().catch(() => false)) {
        await pickupWindowBtn.click();
        await page.waitForTimeout(800);
        await shot(page, "E02g-pickup-window-picker-open");
        await page.keyboard.press("Escape");
    }

    // Try to continue to step 3
    const cont = page.getByRole("button", { name: /^continue$/i }).first();
    if (await cont.isEnabled().catch(() => false)) {
        await cont.click();
        await page.waitForTimeout(1500);
        await shot(page, "E03-step3-installation-location");
    } else {
        await shot(page, "E02z-continue-disabled");
    }
});

test("E03 feasibility helper — use an impossibly-close event date", async ({ page }) => {
    await login(page);
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/families/i", { timeout: 30_000 });
    await page.locator('a[href*="/catalog/families/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.locator('a[href*="/catalog/assets/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const addBtn = page.getByRole("button", { name: /add to cart/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(1500);
    }

    await page.goto("https://redbull.kadence.ae/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.waitForTimeout(1500);

    // Fill with TOMORROW — feasibility should flag
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const in3 = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const startDate = page.locator('input[type="date"]').first();
    await startDate.fill(fmt(tomorrow));
    const endDate = page.locator('input[type="date"]').nth(1);
    await endDate.fill(fmt(in3));
    await page.waitForTimeout(2000);
    await shot(page, "E03a-feasibility-tomorrow-dates");
    // scroll to pick up feasibility UI anywhere
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await shot(page, "E03b-feasibility-bottom");
});

// ─── Self-pickup flow
test("F01 self-pickup mode — step 1", async ({ page }) => {
    await login(page);
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/families/i", { timeout: 30_000 });
    await page.locator('a[href*="/catalog/families/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.locator('a[href*="/catalog/assets/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const addBtn = page.getByRole("button", { name: /add to cart/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(1500);
    }

    await page.goto("https://redbull.kadence.ae/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    // Click the "I'll collect them myself" card
    const card = page.getByText(/I'll collect them myself/i).first();
    await card.click();
    await page.waitForTimeout(1500);
    await shot(page, "F01-self-pickup-step1");
});

test("F02 self-pickup step 2 — collection details (should have pickup window picker)", async ({
    page,
}) => {
    await login(page);
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/families/i", { timeout: 30_000 });
    await page.locator('a[href*="/catalog/families/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.locator('a[href*="/catalog/assets/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const addBtn = page.getByRole("button", { name: /add to cart/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(1500);
    }

    await page.goto("https://redbull.kadence.ae/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page
        .getByText(/I'll collect them myself/i)
        .first()
        .click();
    await page.waitForTimeout(1200);

    const next = page.getByRole("button", { name: /^next$/i }).first();
    if (await next.isVisible().catch(() => false)) {
        await next.click();
        await page.waitForTimeout(1500);
        await shot(page, "F02a-self-pickup-step2");
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(400);
        await shot(page, "F02b-self-pickup-step2-bottom");
    }
});

test("G01 my pickups list", async ({ page }) => {
    await login(page);
    await page.goto("https://redbull.kadence.ae/my-pickups", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await shot(page, "G01-my-pickups");
});

test("G02 my orders list", async ({ page }) => {
    await login(page);
    await page.goto("https://redbull.kadence.ae/my-orders", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await shot(page, "G02-my-orders");
});
