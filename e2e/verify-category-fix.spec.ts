import { test, expect, type Page } from "@playwright/test";

const OUT = "/tmp/kadence-smoke-screenshots";

async function loginAdmin(page: Page) {
    await page.goto("http://localhost:4000/", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email address/i).fill("e2e.kadence.admin@homeofpmg.com");
    await page.getByLabel(/^password/i).fill("E2ePass!Admin1");
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/(analytics|orders|dashboard|home)/, { timeout: 30_000 });
}

async function loginWarehouse(page: Page) {
    await page.goto("http://localhost:4001/", { waitUntil: "domcontentloaded" });
    await page
        .getByLabel(/email address|email/i)
        .first()
        .fill("e2e.kadence.logistics@homeofpmg.com");
    await page.getByLabel(/^password/i).fill("E2ePass!Logi1");
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/(analytics|orders|dashboard|home|assets)/, { timeout: 30_000 });
}

test("admin family detail — category pill now renders", async ({ page }) => {
    await loginAdmin(page);
    await page.goto("http://localhost:4000/assets/families/00000000-0000-4000-8030-000000000001", {
        waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/admin-09b-family-detail-category.png`, fullPage: true });
    // verify text "Furniture" is visible somewhere on the page (eventChairs category)
    await expect(page.getByText("Furniture").first()).toBeVisible({ timeout: 10_000 });
});

test("warehouse family detail — category pill now renders", async ({ page }) => {
    await loginWarehouse(page);
    await page.goto("http://localhost:4001/assets/families/00000000-0000-4000-8030-000000000002", {
        waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.screenshot({
        path: `${OUT}/warehouse-03b-family-detail-category.png`,
        fullPage: true,
    });
    await expect(page.getByText("Decor").first()).toBeVisible({ timeout: 10_000 });
});

test("warehouse assets — category pills in flat list", async ({ page }) => {
    await loginWarehouse(page);
    await page.goto("http://localhost:4001/assets", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/warehouse-02b-assets-category.png`, fullPage: true });
});
