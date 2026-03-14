import { expect, test, type Page } from "@playwright/test";

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const collectionSmokeId = process.env.ADMIN_COLLECTION_SMOKE_ID;

const requireEnv = (value: string | undefined, name: string) => {
    if (!value) {
        throw new Error(`Missing required Playwright env: ${name}`);
    }
    return value;
};

async function login(page: Page) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /access control/i })).toBeVisible();
    await page.getByLabel(/email address/i).fill(requireEnv(adminEmail, "ADMIN_EMAIL"));
    await page.getByLabel(/password/i).fill(requireEnv(adminPassword, "ADMIN_PASSWORD"));
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/analytics$/, { timeout: 60_000 });
}

test("admin staging smoke", async ({ page }) => {
    await login(page);

    await page.goto("/assets", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /asset families/i })).toBeVisible();

    const firstFamilyLink = page.locator('a[href^="/assets/families/"]').first();
    await expect(firstFamilyLink).toBeVisible();
    const firstFamilyName = (await firstFamilyLink.locator("h3").first().textContent())?.trim();
    await firstFamilyLink.click();

    await expect(page).toHaveURL(/\/assets\/families\//);
    if (firstFamilyName) {
        await expect(page.getByRole("heading", { name: firstFamilyName })).toBeVisible();
    }
    await expect(page.getByText(/stock records/i).first()).toBeVisible();

    await page.goto(`/collections/${requireEnv(collectionSmokeId, "ADMIN_COLLECTION_SMOKE_ID")}`, {
        waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("heading", { name: /collection items/i })).toBeVisible();
    await expect(page.locator('a[href^="/assets/families/"]').first()).toBeVisible();
});
