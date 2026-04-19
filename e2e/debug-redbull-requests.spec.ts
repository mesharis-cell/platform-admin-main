import { test, type Page } from "@playwright/test";

test("capture ALL network requests on /catalog", async ({ page }) => {
    const reqs: string[] = [];
    page.on("request", (req) => {
        if (req.url().includes("kadence.ae")) {
            reqs.push(`${req.method()} ${req.url().slice(0, 200)}`);
        }
    });

    await page.goto("https://redbull.kadence.ae/", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email/i).first().fill("client@redbull.test");
    await page.getByLabel(/^password/i).fill("password123");
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/(client-dashboard|catalog|my-orders)/, { timeout: 30_000 });

    reqs.length = 0;
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(8000);

    console.log("\n=== API REQUESTS DURING /catalog ===");
    const apiReqs = reqs.filter((r) => r.includes("api.kadence.ae") || r.includes("operations") || r.includes("client/v1"));
    apiReqs.forEach((r) => console.log("  ", r));
    console.log("=== END ===\n");
});
