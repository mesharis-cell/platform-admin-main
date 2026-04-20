/** Round 2 — targeting what the honest walkthrough missed/found. */

import { test, type Page } from "@playwright/test";
import fs from "node:fs";

const OUT = "/tmp/kadence-smoke-screenshots/redbull-honest";
fs.mkdirSync(OUT, { recursive: true });

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
    const addBtn = page.getByRole("button", { name: /add to cart/i }).first();
    await addBtn.click();
    await page.waitForTimeout(1500);
}

test("H01 /self-pickups (correct nav URL) renders", async ({ page }) => {
    await login(page);
    await page.goto("https://redbull.kadence.ae/self-pickups", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/H01-self-pickups-list.png`, fullPage: true });
});

test("H02 delivery window picker opens — open after setting event dates", async ({ page }) => {
    await login(page);
    await addToCart(page);
    await page.goto("https://redbull.kadence.ae/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    // Step 1 → Continue
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.waitForTimeout(1500);

    // Fill event start + end so windows auto-populate
    await page.locator('input[type="date"]').first().fill("2026-05-15");
    await page.locator('input[type="date"]').nth(1).fill("2026-05-17");
    await page.waitForTimeout(600);

    // The delivery window button once populated looks like "15 May 2026 · — — —"
    // Click it broadly — any button in the delivery window region
    const deliveryLabel = page.getByText("Delivery window").first();
    await deliveryLabel.scrollIntoViewIfNeeded();
    // Sibling/parent button. Use locator
    const deliveryTrigger = page
        .locator("button")
        .filter({ has: page.locator("text=/may 2026/i") })
        .first();
    if (await deliveryTrigger.isVisible().catch(() => false)) {
        await deliveryTrigger.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${OUT}/H02a-delivery-picker-open.png`, fullPage: true });

        // Try to pick an hour in the picker
        const hourBtn = page
            .locator('[role="dialog"] button, [role="listbox"] button')
            .filter({ hasText: /^(1[0-2]|[1-9])$/ })
            .first();
        if (await hourBtn.isVisible().catch(() => false)) {
            await hourBtn.click();
            await page.waitForTimeout(400);
            await page.screenshot({ path: `${OUT}/H02b-delivery-picker-hour.png`, fullPage: true });
        }

        // Pick AM/PM
        const ampmBtn = page.getByRole("button", { name: /^(am|pm)$/i }).first();
        if (await ampmBtn.isVisible().catch(() => false)) {
            await ampmBtn.click();
            await page.waitForTimeout(400);
            await page.screenshot({ path: `${OUT}/H02c-delivery-picker-ampm.png`, fullPage: true });
        }

        // Close picker
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${OUT}/H02d-delivery-picker-closed.png`, fullPage: true });
    } else {
        await page.screenshot({
            path: `${OUT}/H02z-no-delivery-trigger-found.png`,
            fullPage: true,
        });
    }
});

test("H03 pickup window picker opens", async ({ page }) => {
    await login(page);
    await addToCart(page);
    await page.goto("https://redbull.kadence.ae/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.waitForTimeout(1500);
    await page.locator('input[type="date"]').first().fill("2026-05-15");
    await page.locator('input[type="date"]').nth(1).fill("2026-05-17");
    await page.waitForTimeout(600);

    // Click pickup window button
    const pickupTrigger = page
        .locator("button")
        .filter({ has: page.locator("text=/17 may 2026/i") })
        .first();
    if (await pickupTrigger.isVisible().catch(() => false)) {
        await pickupTrigger.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${OUT}/H03a-pickup-picker-open.png`, fullPage: true });
    } else {
        await page.screenshot({ path: `${OUT}/H03z-no-pickup-trigger.png`, fullPage: true });
    }
});

test("H04 feasibility — goto step 3 and beyond to see if the helper fires there", async ({
    page,
}) => {
    await login(page);
    await addToCart(page);
    await page.goto("https://redbull.kadence.ae/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.waitForTimeout(1500);

    // Fill tomorrow as start — supposed to trigger feasibility warn
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const afterTomorrow = new Date();
    afterTomorrow.setDate(afterTomorrow.getDate() + 3);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    await page.locator('input[type="date"]').first().fill(fmt(tomorrow));
    await page.locator('input[type="date"]').nth(1).fill(fmt(afterTomorrow));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/H04a-step2-near-date.png`, fullPage: true });

    // Search for any feasibility-related text
    const feasibilityTexts = [
        "earliest",
        "not enough",
        "can't fulfill",
        "insufficient",
        "lead time",
        "cannot deliver",
        "too soon",
        "use this date",
        "suggest",
        "recommended",
        "warning",
    ];
    for (const t of feasibilityTexts) {
        const n = await page.getByText(new RegExp(t, "i")).count();
        if (n > 0) console.log(`  feasibility cue "${t}" → ${n} hits`);
    }
});

test("H05 self-pickup step 2 — open the Date picker to see what it looks like native", async ({
    page,
}) => {
    await login(page);
    await addToCart(page);
    await page.goto("https://redbull.kadence.ae/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page
        .getByText(/I'll collect them myself/i)
        .first()
        .click();
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /^next$/i }).click();
    await page.waitForTimeout(1500);

    // Step 2 has native Date + From + To
    // Click the native Date input to prove it's native browser UI not DateTimeRangePicker
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.click();
    await page.waitForTimeout(500);
    await page.screenshot({
        path: `${OUT}/H05a-self-pickup-native-date-input.png`,
        fullPage: true,
    });

    // Check native time inputs
    const timeCount = await page.locator('input[type="time"]').count();
    console.log(`  self-pickup step 2 native time inputs: ${timeCount}`);
    console.log(
        `  self-pickup step 2 native date inputs: ${await page.locator('input[type="date"]').count()}`
    );
});
