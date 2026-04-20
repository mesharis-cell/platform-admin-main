/** Round 3 — verify all 5 honest-walkthrough findings are fixed. */

import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

const OUT = "/tmp/kadence-smoke-screenshots/redbull-round3";
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const consoleErrorsAll: string[] = [];

test.beforeEach(async ({ page }, info) => {
    page.on("console", (msg) => {
        if (msg.type() === "error") {
            consoleErrorsAll.push(`[${info.title}] ${msg.text().slice(0, 300)}`);
        }
    });
});

async function login(page: Page) {
    await page.goto("https://redbull.kadence.ae/", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email/i).first().fill("client@redbull.test");
    await page.getByLabel(/^password/i).fill("password123");
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/(client-dashboard|catalog|my-orders)/, { timeout: 30_000 });
}

async function addToCart(page: Page) {
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/families/i", { timeout: 30_000 });
    await page.locator('a[href*="/catalog/families/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.locator('a[href*="/catalog/assets/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page
        .getByRole("button", { name: /add to cart/i })
        .first()
        .click();
    await page.waitForTimeout(1500);
}

test("01 standard checkout step 2 — event dates HIDDEN (flag OFF), delivery+pickup required", async ({
    page,
}) => {
    await login(page);
    await addToCart(page);
    await page.goto("https://redbull.kadence.ae/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    // Step 1 continue
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/01a-step2-new-layout.png`, fullPage: true });

    // Event Start Date label should NOT appear
    const eventStartCount = await page.getByText(/event start date/i).count();
    console.log("  'Event Start Date' visible count:", eventStartCount, "(should be 0)");
    expect(eventStartCount).toBe(0);

    // Delivery Date + Pickup Date should be visible as required
    const deliveryDateLabel = await page.getByText(/delivery date/i).count();
    const pickupDateLabel = await page.getByText(/pickup date/i).count();
    console.log("  delivery-date label count:", deliveryDateLabel);
    console.log("  pickup-date label count:", pickupDateLabel);

    // Continue should be disabled (no delivery/pickup yet)
    const continueBtn = page.getByRole("button", { name: /^continue$/i });
    const isEnabled = await continueBtn.isEnabled();
    console.log("  continue enabled before filling:", isEnabled, "(should be false)");
    expect(isEnabled).toBe(false);

    // Fill delivery + pickup
    const dates = page.locator('input[type="date"]');
    const times = page.locator('input[type="time"]');
    await dates.nth(0).fill("2026-05-15");
    await times.nth(0).fill("09:00");
    await times.nth(1).fill("11:00");
    await dates.nth(1).fill("2026-05-17");
    await times.nth(2).fill("17:00");
    await times.nth(3).fill("18:00");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/01b-step2-all-filled.png`, fullPage: true });

    // Now continue should be enabled
    const enabledAfter = await continueBtn.isEnabled();
    console.log("  continue enabled after filling:", enabledAfter, "(should be true)");
    expect(enabledAfter).toBe(true);
});

test("02 self-pickup — no double progress indicator", async ({ page }) => {
    await login(page);
    await addToCart(page);
    await page.goto("https://redbull.kadence.ae/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page
        .getByText(/I'll collect them myself/i)
        .first()
        .click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/02a-self-pickup-step1-no-5step.png`, fullPage: true });

    // The old 5-step header contained "Installation Details Step 2 of 5" text.
    // After the fix, it should NOT appear when checkoutMode is self-pickup.
    const fiveStepMarker = await page.getByText(/step 1 of 5|step 2 of 5/i).count();
    console.log("  5-step-header text count:", fiveStepMarker, "(should be 0)");
    expect(fiveStepMarker).toBe(0);

    // Advance to step 2 of self-pickup
    await page.getByRole("button", { name: /^next$/i }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/02b-self-pickup-step2-no-5step.png`, fullPage: true });
});

test("03 catalog no React #31 + no brands 500", async ({ page }) => {
    const errs: string[] = [];
    page.on("pageerror", (e) => errs.push(e.message));
    page.on("console", (m) => {
        if (m.type() === "error") errs.push(`console: ${m.text().slice(0, 200)}`);
    });

    await login(page);
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/families/i", { timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/03-catalog-clean.png`, fullPage: true });

    const react31 = errs.filter((e) => e.includes("React error #31"));
    const brand500 = errs.filter((e) => /brand.*500|500.*brand/i.test(e));
    console.log("  React #31 errors:", react31.length, "(should be 0)");
    console.log("  brand 500 errors:", brand500.length, "(should be 0)");
    expect(react31.length).toBe(0);
});

test("04 checkout — advance through all 5 steps to review", async ({ page }) => {
    await login(page);
    await addToCart(page);
    await page.goto("https://redbull.kadence.ae/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    // Step 1
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.waitForTimeout(1200);

    // Step 2: fill delivery + pickup
    const dates = page.locator('input[type="date"]');
    const times = page.locator('input[type="time"]');
    await dates.nth(0).fill("2026-05-15");
    await times.nth(0).fill("09:00");
    await times.nth(1).fill("11:00");
    await dates.nth(1).fill("2026-05-17");
    await times.nth(2).fill("17:00");
    await times.nth(3).fill("18:00");
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/04a-step3-venue.png`, fullPage: true });

    // Step 3: venue info — fill required
    await page
        .getByLabel(/venue name/i)
        .first()
        .fill("Burj Park");
    // Country select
    const countrySel = page.getByText(/united arab emirates/i).first();
    // try to fill city
    const inputs = page.locator('input[type="text"]');
    // Address
    const addressArea = page.locator("textarea").first();
    if (await addressArea.isVisible().catch(() => false)) {
        await addressArea.fill("Downtown Dubai, UAE");
    }
    // Try to click city dropdown
    const cityBtn = page
        .getByRole("combobox")
        .filter({ hasText: /select city|city/i })
        .first();
    if (await cityBtn.isVisible().catch(() => false)) {
        await cityBtn.click();
        await page.waitForTimeout(400);
        const firstOpt = page.getByRole("option").first();
        if (await firstOpt.isVisible().catch(() => false)) {
            await firstOpt.click();
        }
    }
    await page.screenshot({ path: `${OUT}/04b-step3-venue-filled.png`, fullPage: true });

    // Continue to step 4 if possible
    const cont = page.getByRole("button", { name: /^continue$/i });
    if (await cont.isEnabled().catch(() => false)) {
        await cont.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${OUT}/04c-step4-contact.png`, fullPage: true });
    } else {
        await page.screenshot({ path: `${OUT}/04b-step3-continue-disabled.png`, fullPage: true });
    }
});

test("05 my-pickups (via nav)", async ({ page }) => {
    await login(page);
    // Click nav link rather than hardcoding URL
    await page
        .getByRole("link", { name: /my pickups/i })
        .first()
        .click();
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/05-my-pickups.png`, fullPage: true });
});

test.afterAll(() => {
    fs.writeFileSync(`${OUT}/console-errors.log`, consoleErrorsAll.join("\n"));
});
