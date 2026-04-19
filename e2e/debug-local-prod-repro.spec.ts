import { test, type Page } from "@playwright/test";

test("reproduce crash on local client (dev React = unminified)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => {
        errors.push(`${err.name}: ${err.message}\n${err.stack ?? "no stack"}`);
    });
    page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(`[console] ${msg.text().slice(0, 800)}`);
    });

    await page.goto("http://localhost:4002/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 25_000 }).catch(() => {});
    await page.getByLabel(/email/i).first().fill("client@redbull.test");
    await page.getByLabel(/^password/i).fill("password123");
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/(client-dashboard|catalog|my-orders)/, { timeout: 45_000 }).catch(() => {});

    errors.length = 0;
    await page.goto("http://localhost:4002/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(15_000);

    await page.screenshot({ path: "/tmp/kadence-smoke-screenshots/debug-local-crash.png", fullPage: true });

    console.log("\n=== ERRORS FROM LOCAL CLIENT AGAINST PROD API ===");
    errors.forEach((e, i) => console.log(`[${i}]`, e.slice(0, 3000)));
    console.log("=== END ===\n");
});
