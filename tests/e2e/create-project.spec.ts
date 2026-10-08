import { expect, test } from "@playwright/test";

const API_URL = "http://localhost:3000/api";

test("usuario puede crear un proyecto", async ({ page, request }) => {
  const projectName = `Proyecto E2E ${Date.now()}`;

  await page.goto("/projects/new");

  await page.getByLabel(/Nombre/).fill(projectName);
  await page
    .getByLabel("Descripción")
    .fill("Proyecto creado mediante Playwright");

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/projects") &&
      response.request().method() === "POST",
  );

  await page.getByRole("button", { name: "Guardar" }).click();

  const createResponse = await createResponsePromise;

  expect(createResponse.status()).toBe(201);

  const createdProject = await createResponse.json();

  await expect(page).toHaveURL(`/projects/${createdProject.id}`);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: projectName,
    }),
  ).toBeVisible();

  const response = await request.get(`${API_URL}/projects`);

  expect(response.ok()).toBeTruthy();

  const projects = await response.json();

  const persistedProject = projects.find(
    (project: { id: string }) => project.id === createdProject.id,
  );

  expect(persistedProject).toBeTruthy();

  await request.delete(`${API_URL}/projects/${createdProject.id}`);
});
