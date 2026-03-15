import { test, expect, requireEnv } from "./fixtures";

// ---------------------------------------------------------------------------
// Asset Families
// ---------------------------------------------------------------------------

test.describe("Asset Families", () => {
    test("lists families and navigates to detail", async ({ authedPage: page }) => {
        await page.goto("/assets", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: /asset families/i })).toBeVisible();
        await expect(page.getByTestId("family-list")).toBeVisible();

        const firstFamilyLink = page.locator('a[href^="/assets/families/"]').first();
        await expect(firstFamilyLink).toBeVisible();

        const firstFamilyName = (await firstFamilyLink.locator("h3").first().textContent())?.trim();
        await firstFamilyLink.click();

        await expect(page).toHaveURL(/\/assets\/families\//);
        if (firstFamilyName) {
            await expect(page.getByRole("heading", { name: firstFamilyName })).toBeVisible();
        }
    });

    test("family detail shows availability stats and stock records", async ({
        authedPage: page,
    }) => {
        await page.goto("/assets", { waitUntil: "domcontentloaded" });
        await page.locator('a[href^="/assets/families/"]').first().click();
        await expect(page).toHaveURL(/\/assets\/families\//);

        await expect(page.getByTestId("family-availability-stats")).toBeVisible();
        await expect(page.getByTestId("family-stock-list")).toBeVisible();
    });

    test("family detail shows image gallery when images exist", async ({ authedPage: page }) => {
        await page.goto("/assets", { waitUntil: "domcontentloaded" });
        await page.locator('a[href^="/assets/families/"]').first().click();
        await expect(page).toHaveURL(/\/assets\/families\//);

        // Image gallery is optional — family may have no images
        const gallery = page.getByTestId("family-image-gallery");
        const noImage = page.getByTestId("family-no-image");
        await expect(gallery.or(noImage).first()).toBeVisible();
    });

    test("family detail has action buttons", async ({ authedPage: page }) => {
        await page.goto("/assets", { waitUntil: "domcontentloaded" });
        await page.locator('a[href^="/assets/families/"]').first().click();
        await expect(page).toHaveURL(/\/assets\/families\//);

        await expect(page.getByTestId("family-add-stock-btn")).toBeVisible();
        await expect(page.getByTestId("family-edit-btn")).toBeVisible();
        await expect(page.getByTestId("family-delete-btn")).toBeVisible();
    });
});

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

test.describe("Collections", () => {
    test("collection detail shows items with family links", async ({ authedPage: page }) => {
        const collectionId = requireEnv("ADMIN_COLLECTION_SMOKE_ID");
        await page.goto(`/collections/${collectionId}`, {
            waitUntil: "domcontentloaded",
        });
        await expect(page.getByText(/collection items/i).first()).toBeVisible();
        await expect(page.locator('a[href^="/assets/families/"]').first()).toBeVisible();
    });
});

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

test.describe("Conditions", () => {
    test("condition management page loads with family cards", async ({ authedPage: page }) => {
        await page.goto("/conditions", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: /condition management/i })).toBeVisible();
        await expect(page.getByTestId("condition-family-list")).toBeVisible();
        await expect(page.getByTestId("condition-family-card").first()).toBeVisible();
    });
});

// ---------------------------------------------------------------------------
// Self-Bookings
// ---------------------------------------------------------------------------

test.describe("Self-Bookings", () => {
    test("new self-booking shows family browser", async ({ authedPage: page }) => {
        await page.goto("/self-bookings/new", { waitUntil: "domcontentloaded" });
        await expect(page.getByText(/1\. add items/i)).toBeVisible();
        await expect(page.getByTestId("self-booking-family-browser")).toBeVisible();
        await expect(page.getByTestId("self-booking-family-card").first()).toBeVisible();

        // Click a family to see stock records
        await page.getByTestId("self-booking-family-card").first().click();
        await expect(page.getByTestId("self-booking-family-stock")).toBeVisible();
    });
});

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

test.describe("Reports", () => {
    test("reports page loads", async ({ authedPage: page }) => {
        await page.goto("/reports", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: /reports & exports/i })).toBeVisible();
    });
});
