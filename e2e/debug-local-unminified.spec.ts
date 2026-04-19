/**
 * Point local client (http://localhost:4002, .env.local has NEXT_PUBLIC_API_URL=https://api.kadence.ae
 * and NEXT_PUBLIC_DEV_HOST_OVERRIDE=redbull.kadence.ae) at prod API and reproduce the crash.
 * Dev build of React gives component names in stack.
 */

import { test, type Page } from "@playwright/test";

test("reproduce crash locally with unminified React", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => {
        errors.push(`${err.name}: ${err.message}\n${err.stack?.slice(0, 5000) ?? ""}`);
    });
    page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(`[${msg.type()}] ${msg.text().slice(0, 1500)}`);
    });

    // Login locally but API calls hit prod
    await page.goto("http://localhost:4002/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

    const emailInput = page.getByLabel(/email/i).first();
    if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill("client@redbull.test");
        await page.getByLabel(/^password/i).fill("password123");
        await page.getByRole("button", { name: /grant access/i }).click();
        await page.waitForURL(/\/(client-dashboard|catalog|my-orders)/, { timeout: 45_000 }).catch(() => {});
    }

    errors.length = 0;
    await page.goto("http://localhost:4002/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(12_000);
    await page.screenshot({ path: "/tmp/kadence-smoke-screenshots/debug-local-unminified.png", fullPage: true });

    console.log("\n=== UNMINIFIED ERRORS ===");
    errors.forEach((e, i) => console.log(`\n[${i}]`, e.slice(0, 3500)));
    console.log("=== END ===\n");
});
