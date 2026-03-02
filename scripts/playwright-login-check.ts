/**
 * Playwright script to test Google login flow and capture console logs/screenshots
 * Run: npx playwright test scripts/playwright-login-check.ts --project=chromium
 * Or: npx tsx scripts/playwright-login-check.ts
 */
import { chromium } from "playwright";

const CONSOLE_LOGS: string[] = [];
const CONSOLE_ERRORS: string[] = [];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    const type = msg.type();
    CONSOLE_LOGS.push(`[${type}] ${text}`);
    if (type === "error") {
      CONSOLE_ERRORS.push(text);
    }
  });

  try {
    console.log("Navigating to http://localhost:3000...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 15000 });

    await page.waitForTimeout(2000);

    const loginLink = page.locator('a[href*="login"]').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await page.waitForTimeout(2000);
    } else {
      const loginBtn = page.getByRole("link", { name: /log in|sign in/i }).first();
      if (await loginBtn.isVisible()) {
        await loginBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    const googleBtn = page.getByRole("button", { name: /google|sign in with google/i }).first();
    if (await googleBtn.isVisible()) {
      console.log("Clicking Sign in with Google...");
      await googleBtn.click();

      await page.waitForTimeout(5000);

      const currentUrl = page.url();
      if (currentUrl.includes("accounts.google.com")) {
        console.log("Redirected to Google sign-in - popup/redirect flow working");
      } else if (currentUrl.includes("localhost")) {
        await page.screenshot({ path: "playwright-after-google-click.png" });
        console.log("Screenshot saved: playwright-after-google-click.png");
      }
    } else {
      await page.screenshot({ path: "playwright-login-page.png" });
      console.log("Screenshot saved: playwright-login-page.png (Google button not found)");
    }

    await page.waitForTimeout(3000);

    const body = await page.locator("body").first();
    const isWhiteScreen = await body.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const bg = style.backgroundColor;
      const children = el.children.length;
      return (bg === "rgb(255, 255, 255)" || bg === "white") && children < 3;
    }).catch(() => false);

    if (isWhiteScreen) {
      await page.screenshot({ path: "playwright-white-screen.png" });
      console.log("White screen detected - screenshot saved: playwright-white-screen.png");
    }
  } catch (err) {
    await page.screenshot({ path: "playwright-error.png" });
    console.log("Error occurred - screenshot saved: playwright-error.png");
    console.error(err);
  } finally {
    await browser.close();
  }

  console.log("\n========== CONSOLE LOGS ==========");
  CONSOLE_LOGS.forEach((log) => console.log(log));

  console.log("\n========== CONSOLE ERRORS ==========");
  if (CONSOLE_ERRORS.length === 0) {
    console.log("(none)");
  } else {
    CONSOLE_ERRORS.forEach((err) => console.error(err));
  }
}

main();
