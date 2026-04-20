import { test, type Page } from "@playwright/test";
import fs from "node:fs";

const OUT = "/tmp/kadence-smoke-screenshots/redbull-round3";
fs.mkdirSync(OUT, { recursive: true });

async function login(page: Page) {
    await page.goto("https://redbull.kadence.ae/", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email/i).first().fill("client@redbull.test");
    await page.getByLabel(/^password/i).fill("password123");
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/(client-dashboard|catalog|my-orders)/, { timeout: 30_000 });
}

test("review step Schedule card — flag off, only delivery+pickup show", async ({ page }) => {
    await login(page);
    // Add to cart
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

    await page.goto("https://redbull.kadence.ae/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    // Step 1
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.waitForTimeout(1200);

    // Step 2
    const dates = page.locator('input[type="date"]');
    const times = page.locator('input[type="time"]');
    await dates.nth(0).fill("2026-05-15");
    await times.nth(0).fill("09:00");
    await times.nth(1).fill("11:00");
    await dates.nth(1).fill("2026-05-17");
    await times.nth(2).fill("17:00");
    await times.nth(3).fill("18:00");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.waitForTimeout(1500);

    // Step 3 — venue
    await page
        .getByLabel(/venue name/i)
        .first()
        .fill("Burj Park")
        .catch(() => {});
    const addressArea = page.locator("textarea").first();
    if (await addressArea.isVisible().catch(() => false)) {
        await addressArea.fill("Downtown Dubai, UAE");
    }
    // Try to fill city combobox
    const cityTrigger = page
        .getByRole("combobox")
        .filter({ hasText: /city|select/i })
        .first();
    if (await cityTrigger.isVisible().catch(() => false)) {
        await cityTrigger.click();
        await page.waitForTimeout(400);
        await page
            .getByRole("option")
            .first()
            .click()
            .catch(() => {});
    }
    await page.waitForTimeout(500);
    await page
        .getByRole("button", { name: /^continue$/i })
        .click()
        .catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/06-step3-after-venue-attempt.png`, fullPage: true });

    // Step 4 — contact (prefilled + phone). react-phone-number-input needs
    // the user to type into the visible tel input.
    const phoneInput = page.locator('input[type="tel"]').first();
    await phoneInput.click();
    await phoneInput.type("501234567", { delay: 20 });
    await page.waitForTimeout(800);
    const cont = page.getByRole("button", { name: /^continue$/i });
    if (await cont.isEnabled().catch(() => false)) {
        await cont.click();
    }
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT}/07-step5-review.png`, fullPage: true });

    // Scroll for the Schedule card
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/07b-step5-scrolled.png`, fullPage: true });

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.7));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/07c-step5-more-scrolled.png`, fullPage: true });
});
