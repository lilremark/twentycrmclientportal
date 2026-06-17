import { test } from "@playwright/test";

test("capture public pages screenshots", async ({ page }) => {
  const pages = [
    { name: "login", path: "/login" },
    { name: "setup", path: "/setup" },
    { name: "forgot-password", path: "/forgot-password" },
  ];

  const viewports = [
    { name: "desktop", width: 1280, height: 800 },
    { name: "mobile", width: 375, height: 812 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const p of pages) {
      console.log(`Navigating to ${p.path} in ${vp.name} viewport...`);
      try {
        await page.goto(p.path, { waitUntil: "networkidle", timeout: 10000 });
      } catch (err) {
        console.warn(`Networkidle timeout on ${p.path}, attempting to capture anyway.`);
        try {
          await page.goto(p.path, { waitUntil: "load", timeout: 5000 });
        } catch (e) {
          console.error(`Failed to load page ${p.path}:`, e);
        }
      }

      // Add a small pause for CSS transitions / fonts to load
      await page.waitForTimeout(1000);

      const path = `screenshots/${p.name}-${vp.name}.png`;
      await page.screenshot({
        path,
        fullPage: true,
      });
      console.log(`Screenshot saved to ${path}`);
    }
  }
});
