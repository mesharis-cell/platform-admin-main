import { test, type Page } from "@playwright/test";

const OUT = "/tmp/kadence-smoke-screenshots/redbull-final";

async function login(page: Page) {
    await page.goto("https://redbull.kadence.ae/", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email/i).first().fill("client@redbull.test");
    await page.getByLabel(/^password/i).fill("password123");
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/(client-dashboard|catalog|my-orders)/, { timeout: 30_000 });
}

async function addItemToCart(page: Page) {
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=/families/i", { timeout: 20_000 });
    await page.locator('a[href*="/catalog/families/"]').first().click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const firstAssetLink = page.locator('a[href*="/catalog/assets/"]').first();
    await firstAssetLink.click();
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const addBtn = page.getByRole("button", { name: /add to cart/i }).first();
    await addBtn.click();
    await page.waitForTimeout(1500);
}

test("advance through checkout standard-mode to capture date picker + feasibility", async ({
    page,
}) => {
    await login(page);
    await addItemToCart(page);
    await page.goto("https://redbull.kadence.ae/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/07-step1-mode.png`, fullPage: true });

    // Step 1 → Click Continue (Delivery is default selected)
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/08-step2-installation.png`, fullPage: true });

    // Step 2: Installation Details — likely has DateTimeRangePicker for event window
    // Try to find and click a date picker trigger
    const dateButton = page
        .locator("button")
        .filter({ hasText: /pick.*date|start.*date|event.*start|select.*date|📅/i })
        .first();
    if (await dateButton.isVisible().catch(() => false)) {
        await dateButton.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${OUT}/09-date-picker-open.png`, fullPage: true });
    } else {
        // take a picture anyway for whatever step 2 shows
        console.log("  date button not found — capturing step 2 as-is");
    }

    // Try to continue to step 3 (skip validation errors where possible)
    const continueBtn = page.getByRole("button", { name: /continue/i });
    if (await continueBtn.isEnabled().catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${OUT}/10-step3-location.png`, fullPage: true });
    }
});

test("switch to self-pickup mode and capture form", async ({ page }) => {
    await login(page);
    await addItemToCart(page);
    await page.goto("https://redbull.kadence.ae/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

    // Click the "I'll collect them myself" card
    const selfPickupCard = page.getByText(/I'll collect them myself/i).first();
    await selfPickupCard.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/11-self-pickup-selected.png`, fullPage: true });

    // Click Continue to advance
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/12-self-pickup-step2.png`, fullPage: true });

    // Scroll through full page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/13-self-pickup-middle.png`, fullPage: true });
});
