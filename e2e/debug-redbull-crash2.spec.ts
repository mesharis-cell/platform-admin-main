import { test, type Page } from "@playwright/test";

test("capture 500 source + sourcemap unminified", async ({ page }) => {
    const networkFails: { url: string; status: number; method: string }[] = [];
    const consoleErrors: string[] = [];

    page.on("response", (resp) => {
        if (resp.status() >= 400) {
            networkFails.push({
                url: resp.url().slice(0, 200),
                status: resp.status(),
                method: resp.request().method(),
            });
        }
    });
    page.on("pageerror", (err) =>
        consoleErrors.push(`${err.message}\n${err.stack?.slice(0, 3000) ?? ""}`)
    );
    page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(`[console] ${msg.text().slice(0, 800)}`);
    });

    await page.goto("https://redbull.kadence.ae/", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email/i).first().fill("client@redbull.test");
    await page.getByLabel(/^password/i).fill("password123");
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/(client-dashboard|catalog|my-orders)/, { timeout: 30_000 });

    networkFails.length = 0; // only care about catalog
    consoleErrors.length = 0;
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(10_000);

    console.log("\n=== 4xx/5xx RESPONSES ===");
    networkFails.forEach((f) => console.log(`  ${f.method} ${f.status} ${f.url}`));
    console.log("\n=== CONSOLE ERRORS ===");
    consoleErrors.forEach((e, i) => console.log(`[${i}]`, e));
    console.log("=== END ===\n");
});
