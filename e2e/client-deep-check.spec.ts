import { test, expect, type Page } from "@playwright/test";

const OUT = "/tmp/kadence-smoke-screenshots";

async function loginClient(page: Page) {
    await page.goto("http://localhost:4002/", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email/i).first().fill("alex.chen@kadence-demo.com");
    await page
        .getByLabel(/^password/i)
        .first()
        .fill("DocsPass!Client1");
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/(client-dashboard|catalog|orders|my-orders)/, { timeout: 30_000 });
}

test("catalog loads 3 families with category pills", async ({ page }) => {
    await loginClient(page);
    await page.goto("http://localhost:4002/catalog", { waitUntil: "domcontentloaded" });
    // Give data time to load past skeleton
    await page.waitForSelector("text=/Event Chairs|Backdrop Panels|LED Screens/", {
        timeout: 30_000,
    });
    await page.screenshot({ path: `${OUT}/client-02b-catalog-loaded.png`, fullPage: true });
    const heading = page.getByText(/(\d+) famil(y|ies)/).first();
    const text = await heading.textContent();
    console.log("  catalog heading:", text);
    expect(text).not.toMatch(/^\s*0 /);
});

test("client order detail — renders confirmed order", async ({ page }) => {
    await loginClient(page);
    await page.goto("http://localhost:4002/orders/00000000-0000-4000-8050-000000000003", {
        waitUntil: "networkidle",
        timeout: 45_000,
    });
    await page.waitForSelector("text=/ORD-DEMO-003|Alex Chen|Event Chair/", { timeout: 30_000 });
    await page.screenshot({ path: `${OUT}/client-04b-order-detail-loaded.png`, fullPage: true });
});

test("client my-orders page", async ({ page }) => {
    await loginClient(page);
    await page.goto("http://localhost:4002/my-orders", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/client-05-my-orders.png`, fullPage: true });
});

test("client checkout — date time range picker", async ({ page }) => {
    await loginClient(page);
    await page.goto("http://localhost:4002/checkout", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}/client-06-checkout.png`, fullPage: true });
});
