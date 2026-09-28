import { expect, test } from "@playwright/test";

test("frontend está disponible", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("body")).toBeVisible();
});

test("API está disponible", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:3000/api/health");

  expect(response.ok()).toBeTruthy();
});
