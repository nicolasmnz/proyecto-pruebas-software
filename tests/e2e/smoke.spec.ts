import { expect, test } from "@playwright/test";

test("frontend está disponible", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("body")).toBeVisible();
});

test("API está disponible", async ({ request }) => {
  const apiURL = process.env.E2E_API_URL ?? "http://localhost:3000/api";
  const response = await request.get(`${apiURL}/health`);

  expect(response.ok()).toBeTruthy();
});
