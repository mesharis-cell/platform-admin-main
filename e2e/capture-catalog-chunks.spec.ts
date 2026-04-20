import { test } from "@playwright/test";
import fs from "node:fs";

test("capture all chunks loaded on /catalog", async ({ page }) => {
    const chunkUrls = new Set<string>();
    page.on("response", (resp) => {
        const u = resp.url();
        if (u.includes("/_next/static/chunks/") && u.endsWith(".js")) {
            chunkUrls.add(u);
        }
    });

    await page.goto("https://redbull.kadence.ae/", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/email/i).first().fill("client@redbull.test");
    await page.getByLabel(/^password/i).fill("password123");
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/(client-dashboard|catalog|my-orders)/, { timeout: 30_000 });

    chunkUrls.clear();
    await page.goto("https://redbull.kadence.ae/catalog", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(6000);

    fs.writeFileSync("/tmp/catalog-chunks.txt", Array.from(chunkUrls).sort().join("\n"));
    console.log("chunks on /catalog:", chunkUrls.size);
    Array.from(chunkUrls)
        .sort()
        .forEach((u) => console.log("  ", u));
});
