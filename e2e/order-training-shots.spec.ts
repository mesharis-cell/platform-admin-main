/**
 * Screenshot capture for the Admin "Running an Order" training doc.
 *
 * Captures the ACTUAL admin control for each Admin touchpoint (not just the
 * order page header). `embed.mjs` inlines them into the HTML doc as base64.
 *
 * Touchpoints with live UI: approve/send quote (PENDING_APPROVAL), the Cancel
 * dialog, and the sent-quote line items. Invoicing + payment are stubbed in
 * this build (no UI) — no shot for those.
 *
 * PREREQUISITES: test API :9100 + seeded demo data, admin dev :4000 with
 * admin/.env.local = { NEXT_PUBLIC_API_URL=http://localhost:9100,
 * NEXT_PUBLIC_DEV_HOST_OVERRIDE=demo.kadence.test }.
 *
 * The orchestrator (capture.sh / manual) flips demo order ...002 to
 * PENDING_APPROVAL before the "review-quote" test, then restores it.
 *
 * RUN (from /admin): ADMIN_BASE_URL=http://localhost:4000 \
 *   bunx playwright test e2e/order-training-shots.spec.ts --project=chromium --grep "<title>"
 */
import { test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.ADMIN_BASE_URL || "http://localhost:4000";
const OUT = path.join(__dirname, "..", "scripts", "order-training-shots", "out");
fs.mkdirSync(OUT, { recursive: true });

const ORDERS = {
    quoted: "00000000-0000-4000-8050-000000000002", // QUOTED (flipped to PENDING_APPROVAL for the approve shot)
    confirmed: "00000000-0000-4000-8050-000000000003", // CONFIRMED — cancellable, for the Cancel dialog
};

async function hideDevOverlay(page: Page) {
    await page
        .addStyleTag({
            content: `nextjs-portal,[data-next-badge-root],[data-nextjs-dev-tools-button],
                [data-nextjs-toast],#__next-build-watcher,#__next-dev-indicator{display:none!important;}
                *{caret-color:transparent!important;}`,
        })
        .catch(() => {});
}

async function shootViewport(page: Page, name: string) {
    await hideDevOverlay(page);
    await page.waitForTimeout(500);
    await page.screenshot({
        path: path.join(OUT, `${name}.png`),
        animations: "disabled",
        scale: "css",
    });
    console.log(`  📸 ${name}`);
}

async function loginAdmin(page: Page) {
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.getByLabel(/email address/i).fill("e2e.kadence.admin@homeofpmg.com");
    await page.getByLabel(/^password/i).fill("E2ePass!Admin1");
    await page.getByRole("button", { name: /grant access|sign in|log in/i }).click();
    await page.waitForURL(/\/(analytics|orders|dashboard|home)/, { timeout: 30_000 });
}

async function open(page: Page, url: string) {
    await page.goto(BASE + url, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(900);
}

// hero → doc header: the orders list
test("hero", async ({ page }) => {
    await loginAdmin(page);
    await open(page, "/orders");
    await shootViewport(page, "hero-orders-list");
});

// review-quote → the Approve panel (order ...002 must be PENDING_APPROVAL at run time)
test("review-quote", async ({ page }) => {
    await loginAdmin(page);
    await open(page, `/orders/${ORDERS.quoted}`);
    const approve = page.getByRole("button", { name: /approve & send quote to client/i });
    await approve.waitFor({ timeout: 30_000 });
    await approve.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await shootViewport(page, "review-quote");
});

// revise → the sent-quote line items you'd edit (order ...002 while QUOTED)
test("revise", async ({ page }) => {
    await loginAdmin(page);
    await open(page, `/orders/${ORDERS.quoted}`);
    const lines = page.getByText(/service line items|final pricing review/i).first();
    await lines.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(400);
    await shootViewport(page, "revise");
});

// add-catalog → the "Add Catalog Services" picker (order ...002 must be PENDING_APPROVAL)
test("add-catalog", async ({ page }) => {
    await loginAdmin(page);
    await open(page, `/orders/${ORDERS.quoted}`);
    await page.getByRole("button", { name: /catalog service/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ timeout: 10_000 });
    await hideDevOverlay(page);
    await page.waitForTimeout(600);
    await dialog.screenshot({ path: path.join(OUT, "add-catalog.png") });
    console.log("  📸 add-catalog (dialog)");
});

// add-custom → the "Add Custom Line Item" modal (order ...002 must be PENDING_APPROVAL)
test("add-custom", async ({ page }) => {
    await loginAdmin(page);
    await open(page, `/orders/${ORDERS.quoted}`);
    await page.getByRole("button", { name: /custom charge/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ timeout: 10_000 });
    await hideDevOverlay(page);
    await page.waitForTimeout(600);
    await dialog.screenshot({ path: path.join(OUT, "add-custom.png") });
    console.log("  📸 add-custom (dialog)");
});

// edit-line → the inline line-item editor (order ...002 must be PENDING_APPROVAL so no revert)
test("edit-line", async ({ page }) => {
    await loginAdmin(page);
    await open(page, `/orders/${ORDERS.quoted}`);
    // per-line edit pencil is icon-only; the first pencil in DOM is the Job Number card,
    // so a line-item pencil is the last one on the page.
    const pencils = page.locator(
        "button:has(svg.lucide-pencil), button:has(svg.lucide-square-pen), button:has(svg.lucide-file-pen), button:has(svg.lucide-pen-line), button:has(svg.lucide-edit)"
    );
    const target = pencils.last();
    await target.scrollIntoViewIfNeeded();
    await target.click();
    await page
        .locator("button:has(svg.lucide-save)")
        .first()
        .waitFor({ timeout: 8_000 })
        .catch(() => {});
    // frame the TOP of the inline editor (Quantity / Unit Rate) rather than the Notes area
    await page
        .getByText(/^Quantity$/)
        .last()
        .scrollIntoViewIfNeeded()
        .catch(() => {});
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(400);
    await shootViewport(page, "edit-line");
});

// cancel → open the Cancel Order dialog on a cancellable (CONFIRMED) order
test("cancel", async ({ page }) => {
    await loginAdmin(page);
    await open(page, `/orders/${ORDERS.confirmed}`);
    await page
        .getByRole("button", { name: /cancel order/i })
        .first()
        .click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ timeout: 10_000 });
    await hideDevOverlay(page);
    await page.waitForTimeout(500);
    await dialog.screenshot({ path: path.join(OUT, "cancel.png") });
    console.log("  📸 cancel (dialog)");
});
