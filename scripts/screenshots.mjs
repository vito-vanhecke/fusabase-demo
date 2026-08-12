// Takes blog screenshots of the running demos with Playwright.
//
// Prerequisites:
//   npm run dev            (in another terminal)
//   npm i -D playwright && npx playwright install chromium   (one-off)
//
// Usage:
//   BASE_URL=http://localhost:5173 OUT_DIR=./shots \
//   DEMO_EMAIL=demo@vvanhecke.be DEMO_PASSWORD=... node scripts/screenshots.mjs
//
// The demo-2/demo-3 shots are saved as *-denied.png while the security rules
// are not published yet, and as *-todos.png / *-files.png once they are —
// re-run this script after publishing the rules in the Console.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";
const OUT_DIR = process.env.OUT_DIR ?? "./shots";
const EMAIL = process.env.DEMO_EMAIL ?? "demo@vvanhecke.be";
const PASSWORD = process.env.DEMO_PASSWORD ?? "FusabaseDemo123!";

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 880, height: 760 },
  deviceScaleFactor: 2,
});

const shot = async (name) => {
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: true });
  console.log(`saved ${OUT_DIR}/${name}.png`);
};

const errorText = async () => {
  const banner = page.locator("#message.error");
  return (await banner.count()) ? (await banner.textContent()).trim() : null;
};

// --- landing page ------------------------------------------------------------
await page.goto(`${BASE_URL}/`);
await page.waitForLoadState("networkidle");
await shot("fusabase-demo-home");

// --- demo 1: auth ------------------------------------------------------------
await page.goto(`${BASE_URL}/demos/01-auth/`);
await page.waitForSelector("#signed-out:not([hidden]), #signed-in:not([hidden])");

if (await page.locator("#signed-in:not([hidden])").count()) {
  // restored session from an earlier run — sign out for the signed-out shot
  await page.click("#signout-btn");
  await page.waitForSelector("#signed-out:not([hidden])");
}
await shot("fusabase-demo1-signedout");

await page.fill("#signin-email", EMAIL);
await page.fill("#signin-password", PASSWORD);
await page.click("#signin-form button[type=submit]");
try {
  await page.waitForSelector("#signed-in:not([hidden])", { timeout: 15000 });
  await page.waitForSelector("#token-claims:not(:empty)", { timeout: 15000 });
  await shot("fusabase-demo1-signedin");
} catch {
  console.log("sign-in failed:", await errorText());
  await shot("fusabase-demo1-error");
  await browser.close();
  process.exit(1);
}

// --- demo 2: database ----------------------------------------------------------
await page.goto(`${BASE_URL}/demos/02-database/`);
await page.waitForSelector("#signed-in:not([hidden])", { timeout: 15000 });
await page.waitForTimeout(1500); // initial loadTodos round-trip

const addTodo = async (title) => {
  await page.fill("#new-title", title);
  await page.click("#add-form button[type=submit]");
  await page.waitForTimeout(1200);
};

await addTodo("Write part 2 of the blog series");
if (await errorText()) {
  console.log("db write denied (rules not published?):", await errorText());
  await shot("fusabase-demo2-denied");
} else {
  await addTodo("Publish the security rules");
  await addTodo("Take the Console screenshots");
  // tick off the first one for a livelier screenshot
  const firstCheckbox = page.locator("#todo-list li input[type=checkbox]").last();
  if (await firstCheckbox.count()) {
    await firstCheckbox.check();
    await page.waitForTimeout(1200);
  }
  await shot("fusabase-demo2-todos");
}

// --- demo 3: storage -----------------------------------------------------------
await page.goto(`${BASE_URL}/demos/03-storage/`);
await page.waitForSelector("#signed-in:not([hidden])", { timeout: 15000 });
await page.waitForTimeout(1500); // initial loadFiles round-trip

const listDenied = await errorText();
await page.setInputFiles("#file-input", {
  name: "meeting-notes.txt",
  mimeType: "text/plain",
  buffer: Buffer.from("Notes from the fusabase demo.\n"),
});
await page.click("#upload-form button[type=submit]");
await page.waitForTimeout(2500);

if (await errorText()) {
  console.log("storage denied (rules not published?):", await errorText());
  await shot("fusabase-demo3-denied");
} else if (listDenied) {
  // upload worked but the earlier list was denied — reload for a clean state
  await page.reload();
  await page.waitForSelector("#signed-in:not([hidden])");
  await page.waitForTimeout(1500);
  await shot("fusabase-demo3-files");
} else {
  await shot("fusabase-demo3-files");
}

await browser.close();
