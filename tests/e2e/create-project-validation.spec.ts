import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const API_URL = process.env.E2E_API_URL ?? "http://localhost:3000/api";
// Igual que MAX_PROJECT_NAME_LENGTH y VARCHAR(150) de projects.name
const MAX_NAME_LENGTH = 150;

// Cuenta los POST de creación que el formulario envía a la API
function trackCreateRequests(page: Page) {
  const requests: string[] = [];

  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname.endsWith("/api/projects")
    ) {
      requests.push(request.url());
    }
  });

  return requests;
}

test.describe("validaciones al crear un proyecto", () => {
  let createdId: string | undefined;

  test.beforeEach(async ({ page }) => {
    await page.goto("/projects/new");
  });

  test.afterEach(async ({ request }) => {
    if (createdId) {
      await request.delete(`${API_URL}/projects/${createdId}`);
      createdId = undefined;
    }
  });

  test("con el nombre vacío el navegador no envía el formulario", async ({
    page,
  }) => {
    const requests = trackCreateRequests(page);
    const form = page.getByTestId("project-form");
    const name = form.getByTestId("project-form-name");

    await form.getByTestId("project-form-description").fill("Sin nombre");
    await form.getByTestId("project-form-submit").click();

    // El campo es obligatorio: lo bloquea la validación del navegador
    const valueMissing = await name.evaluate(
      (input: HTMLInputElement) => input.validity.valueMissing,
    );

    expect(valueMissing).toBe(true);
    await expect(page).toHaveURL("/projects/new");
    expect(requests).toHaveLength(0);
  });

  test("un nombre con solo espacios muestra el error y, al corregirlo, se crea", async ({
    page,
  }) => {
    const requests = trackCreateRequests(page);
    const form = page.getByTestId("project-form");
    const error = form.getByTestId("project-form-error");

    await form.getByTestId("project-form-name").fill("   ");
    await form.getByTestId("project-form-submit").click();

    await expect(error).toHaveText("El nombre del proyecto es obligatorio.");
    await expect(page).toHaveURL("/projects/new");
    expect(requests).toHaveLength(0);

    // Al corregir el nombre se crea con normalidad
    const name = `Proyecto Validado ${Date.now()}`;

    await form.getByTestId("project-form-name").fill(name);

    const createResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith("/api/projects") &&
        response.request().method() === "POST",
    );

    await form.getByTestId("project-form-submit").click();

    const created = await createResponse;

    expect(created.status()).toBe(201);
    createdId = (await created.json()).id;

    await expect(page).toHaveURL(`/projects/${createdId}`);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    // El contador registra envíos reales: solo hubo el del nombre corregido
    expect(requests).toHaveLength(1);
  });

  test("el campo nombre no admite más de 150 caracteres", async ({ page }) => {
    const name = page.getByTestId("project-form-name");

    await name.fill("a".repeat(MAX_NAME_LENGTH + 1));

    await expect(name).toHaveValue("a".repeat(MAX_NAME_LENGTH));
  });

  test("si se salta el límite del navegador, la API rechaza el nombre y el formulario muestra el error", async ({
    page,
    request,
  }) => {
    const form = page.getByTestId("project-form");
    const name = form.getByTestId("project-form-name");

    // Simula un cliente sin el límite del campo: la API debe validarlo igual
    await name.evaluate((input: HTMLInputElement) =>
      input.removeAttribute("maxlength"),
    );
    await name.fill("a".repeat(MAX_NAME_LENGTH + 1));

    const createResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith("/api/projects") &&
        response.request().method() === "POST",
    );

    await form.getByTestId("project-form-submit").click();

    expect((await createResponse).status()).toBe(400);
    await expect(form.getByTestId("project-form-error")).toHaveText(
      `name no puede superar ${MAX_NAME_LENGTH} caracteres`,
    );
    await expect(page).toHaveURL("/projects/new");

    // No quedó ningún proyecto con ese nombre
    const projects: { name: string }[] = await (
      await request.get(`${API_URL}/projects`)
    ).json();

    expect(
      projects.filter((project) => project.name.length > MAX_NAME_LENGTH),
    ).toHaveLength(0);
  });
});
