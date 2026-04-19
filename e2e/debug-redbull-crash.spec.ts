import { test, type Page } from "@playwright/test";

test("capture catalog crash stack trace", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => {
        errors.push(`${err.name}: ${err.message}\n${err.stack ?? "no stack"}`);
    });
    page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(`[console] ${msg.text()}`);
    });

    await page.goto("https://redbull.kadence.ae/", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email/i).first().fill("client@redbull.test");
    await page.getByLabel(/^password/i).fill("password123");
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/(client-dashboard|catalog|my-orders)/, { timeout: 30_000 });

    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(8000);

    console.log("\n=== CAPTURED ERRORS ===");
    errors.forEach((e, i) => console.log(`[${i}]`, e.slice(0, 1500)));
    console.log("=== END ===\n");
});
