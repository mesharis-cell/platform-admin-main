import { test } from "@playwright/test";
import fs from "node:fs";

test("capture raw stack + all chunks urls", async ({ page }) => {
    const chunks = new Set<string>();
    const errors: string[] = [];

    page.on("response", (resp) => {
        const u = resp.url();
        if (u.includes("/_next/static/chunks/") && u.endsWith(".js")) {
            chunks.add(u);
        }
    });
    page.on("pageerror", (err) => {
        errors.push(`${err.name}: ${err.message}\n${err.stack ?? ""}`);
    });

    await page.goto("https://redbull.kadence.ae/", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email/i).first().fill("client@redbull.test");
    await page.getByLabel(/^password/i).fill("password123");
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/(client-dashboard|catalog|my-orders)/, { timeout: 30_000 });

    chunks.clear();
    errors.length = 0;
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(7_000);

    fs.writeFileSync("/tmp/prod-chunks.txt", Array.from(chunks).join("\n"));
    fs.writeFileSync("/tmp/prod-errors.txt", errors.join("\n\n====\n\n"));
    console.log("chunks captured:", chunks.size);
    console.log("errors captured:", errors.length);
});
