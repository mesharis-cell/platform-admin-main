/**
 * Full-stack smoke test covering the 22 session reshapes across all 4 frontends.
 * Focuses on visual evidence (screenshots) and console-error detection.
 *
 * Assumes:
 *  - API on :9100 (bun run dev:test against test DB)
 *  - admin :4000, warehouse :4001, client :4002, control :4003
 *  - test DB seeded via `bun run db:seed:test`
 *
 * Credentials (from seed-test.ts):
 *   admin    : e2e.kadence.admin@homeofpmg.com     / E2ePass!Admin1
 *   logistics: e2e.kadence.logistics@homeofpmg.com / E2ePass!Logi1
 *   client   : alex.chen@kadence-demo.com          / DocsPass!Client1
 */

import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = "/tmp/kadence-smoke-screenshots";
fs.mkdirSync(OUT_DIR, { recursive: true });

const consoleErrorsPerTest = new Map<string, string[]>();

test.beforeEach(async ({ page }, info) => {
    const bag: string[] = [];
    consoleErrorsPerTest.set(info.title, bag);
    page.on("console", (msg) => {
        if (msg.type() === "error") bag.push(msg.text().slice(0, 500));
    });
    page.on("pageerror", (err) => {
        bag.push(`[pageerror] ${err.message}`);
    });
});

test.afterEach(async ({}, info) => {
    const errs = consoleErrorsPerTest.get(info.title) ?? [];
    if (errs.length) {
        console.log(`\n[console errors in "${info.title}"] ${errs.length} msg(s):`);
        errs.slice(0, 3).forEach((e) => console.log(`  • ${e}`));
    }
});

async function shoot(page: Page, name: string) {
    const p = path.join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: p, fullPage: true });
    console.log(`  📸 ${p}`);
}

async function loginAdmin(page: Page) {
    await page.goto("http://localhost:4000/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.getByLabel(/email address/i).fill("e2e.kadence.admin@homeofpmg.com");
    await page.getByLabel(/^password/i).fill("E2ePass!Admin1");
    await page.getByRole("button", { name: /grant access|sign in|log in/i }).click();
    await page.waitForURL(/\/(analytics|orders|dashboard|home)/, { timeout: 30_000 });
}

async function loginWarehouse(page: Page) {
    await page.goto("http://localhost:4001/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.getByLabel(/email address|email/i).first().fill("e2e.kadence.logistics@homeofpmg.com");
    await page.getByLabel(/^password/i).fill("E2ePass!Logi1");
    await page.getByRole("button", { name: /grant access|sign in|log in/i }).click();
    await page.waitForURL(/\/(analytics|orders|dashboard|home)/, { timeout: 30_000 });
}

async function loginClient(page: Page) {
    await page.goto("http://localhost:4002/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const email = page.getByLabel(/email/i).first();
    const pass = page.getByLabel(/^password/i).first();
    await email.fill("alex.chen@kadence-demo.com");
    await pass.fill("DocsPass!Client1");
    await page.getByRole("button", { name: /grant access/i }).click();
    await page.waitForURL(/\/(client-dashboard|catalog|orders|my-orders)/, { timeout: 30_000 });
}

// ──────────────────────────────────────────────────────────────────
// ADMIN
// ──────────────────────────────────────────────────────────────────
test.describe("ADMIN (role-gated)", () => {
    test("login page renders + feature_registry lands on page", async ({ page }) => {
        await page.goto("http://localhost:4000/", { waitUntil: "domcontentloaded" });
        await shoot(page, "admin-01-login");
        await expect(page.getByRole("heading", { name: /access control/i })).toBeVisible();
    });

    test("assets page — tabbed layout (Assets + Families)", async ({ page }) => {
        await loginAdmin(page);
        await page.goto("http://localhost:4000/assets", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        await shoot(page, "admin-02-assets-default-tab");
        // Click Families tab if present
        const familiesTab = page.getByRole("tab", { name: /families/i }).or(page.getByRole("button", { name: /families/i }));
        if (await familiesTab.first().isVisible().catch(() => false)) {
            await familiesTab.first().click();
            await page.waitForTimeout(1000);
            await shoot(page, "admin-03-assets-families-tab");
        }
    });

    test("categories settings page renders + shows seeded categories", async ({ page }) => {
        await loginAdmin(page);
        await page.goto("http://localhost:4000/settings/categories", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        await shoot(page, "admin-04-settings-categories");
    });

    test("platform settings — feature flags render from registry", async ({ page }) => {
        await loginAdmin(page);
        await page.goto("http://localhost:4000/settings/platform", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        await shoot(page, "admin-05-settings-platform");
    });

    test("users page — Tier-2 layout sweep landed", async ({ page }) => {
        await loginAdmin(page);
        await page.goto("http://localhost:4000/users", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        await shoot(page, "admin-06-users-tier2");
    });

    test("brands page — Tier-2 layout sweep landed", async ({ page }) => {
        await loginAdmin(page);
        await page.goto("http://localhost:4000/brands", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        await shoot(page, "admin-07-brands-tier2");
    });

    test("order detail — fulfillment windows card", async ({ page }) => {
        await loginAdmin(page);
        // Demo order ORD-DEMO-003 (CONFIRMED, has requested_delivery_window seed)
        await page.goto("http://localhost:4000/orders/00000000-0000-4000-8050-000000000003", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        await shoot(page, "admin-08-order-detail-windows");
    });

    test("family detail — move-to-family 3-dots menu", async ({ page }) => {
        await loginAdmin(page);
        await page.goto("http://localhost:4000/assets/families/00000000-0000-4000-8030-000000000001", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        await shoot(page, "admin-09-family-detail");
    });

    test("self-pickups page — feature-gated (may be hidden)", async ({ page }) => {
        await loginAdmin(page);
        await page.goto("http://localhost:4000/self-pickups", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
        await shoot(page, "admin-10-self-pickups");
    });
});

// ──────────────────────────────────────────────────────────────────
// WAREHOUSE
// ──────────────────────────────────────────────────────────────────
test.describe("WAREHOUSE (logistics)", () => {
    test("login renders", async ({ page }) => {
        await page.goto("http://localhost:4001/", { waitUntil: "domcontentloaded" });
        await shoot(page, "warehouse-01-login");
    });

    test("assets — tabbed layout mirror of admin", async ({ page }) => {
        await loginWarehouse(page);
        await page.goto("http://localhost:4001/assets", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        await shoot(page, "warehouse-02-assets");
    });

    test("family detail — category pill + move-to-family menu", async ({ page }) => {
        await loginWarehouse(page);
        await page.goto("http://localhost:4001/assets/families/00000000-0000-4000-8030-000000000001", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        await shoot(page, "warehouse-03-family-detail");
    });

    test("dashboard (post-login landing)", async ({ page }) => {
        await loginWarehouse(page);
        await shoot(page, "warehouse-04-dashboard");
    });
});

// ──────────────────────────────────────────────────────────────────
// CLIENT
// ──────────────────────────────────────────────────────────────────
test.describe("CLIENT (Alex Chen, pernod-ricard tenant swapped for demo)", () => {
    test("login renders", async ({ page }) => {
        await page.goto("http://localhost:4002/", { waitUntil: "domcontentloaded" });
        await shoot(page, "client-01-login");
    });

    test("catalog — category pills + filter", async ({ page }) => {
        await loginClient(page);
        await page.goto("http://localhost:4002/catalog", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        await shoot(page, "client-02-catalog");
    });

    test("orders list", async ({ page }) => {
        await loginClient(page);
        await page.goto("http://localhost:4002/orders", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        await shoot(page, "client-03-orders");
    });

    test("order detail (confirmed order with windows)", async ({ page }) => {
        await loginClient(page);
        await page.goto("http://localhost:4002/orders/00000000-0000-4000-8050-000000000003", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        await shoot(page, "client-04-order-detail");
    });
});

// ──────────────────────────────────────────────────────────────────
// CONTROL (super-admin; no user seeded → just login page)
// ──────────────────────────────────────────────────────────────────
test.describe("CONTROL (super-admin)", () => {
    test("login page renders", async ({ page }) => {
        await page.goto("http://localhost:4003/", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
        await shoot(page, "control-01-login");
    });
});
