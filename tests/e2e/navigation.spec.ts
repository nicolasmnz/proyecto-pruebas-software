import { expect, test, type Page } from "@playwright/test";

const SEED_PROJECT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

type NavigationErrors = {
  console: string[];
  javascript: string[];
  server: string[];
};

function monitorErrors(page: Page) {
  const errors: NavigationErrors = {
    console: [],
    javascript: [],
    server: [],
  };

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.console.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    errors.javascript.push(error.message);
  });

  page.on("response", (response) => {
    if (response.status() >= 500) {
      errors.server.push(
        `${response.status()} ${response.request().method()} ${response.url()}`,
      );
    }
  });

  return errors;
}

function expectNoCriticalErrors(errors: NavigationErrors) {
  expect(
    errors.javascript,
    `Errores JavaScript no controlados:\n${errors.javascript.join("\n")}`,
  ).toEqual([]);

  expect(
    errors.server,
    `Respuestas HTTP 5xx:\n${errors.server.join("\n")}`,
  ).toEqual([]);
}

async function expectHeading(
  page: Page,
  heading: string | RegExp,
) {
  await expect(
    page.getByRole("heading", { name: heading }).first(),
  ).toBeVisible();
}

test("carga la vista de Proyectos sin errores", async ({ page }) => {
  const errors = monitorErrors(page);

  await page.goto("/projects");

  await expectHeading(page, "Proyectos");

  expectNoCriticalErrors(errors);
});

test("carga el detalle de un proyecto sin errores", async ({ page }) => {
  const errors = monitorErrors(page);

  await page.goto(`/projects/${SEED_PROJECT_ID}`);

  await expect(
    page.getByRole("heading").first(),
  ).toBeVisible();

  expectNoCriticalErrors(errors);
});

test("carga el Tablero sin errores", async ({ page }) => {
  const errors = monitorErrors(page);

  await page.goto(`/projects/${SEED_PROJECT_ID}/board`);

  await expectHeading(page, /tablero/i);

  expectNoCriticalErrors(errors);
});

test("carga la vista de Épicas sin errores", async ({ page }) => {
  const errors = monitorErrors(page);

  await page.goto(`/projects/${SEED_PROJECT_ID}/epics`);

  await expectHeading(page, /épicas/i);

  expectNoCriticalErrors(errors);
});

test("carga la vista de Sprints sin errores", async ({ page }) => {
  const errors = monitorErrors(page);

  await page.goto(`/projects/${SEED_PROJECT_ID}/sprints`);

  await expectHeading(page, /sprints/i);

  expectNoCriticalErrors(errors);
});

test("carga el Panel del proyecto sin errores", async ({ page }) => {
  const errors = monitorErrors(page);

  await page.goto(`/projects/${SEED_PROJECT_ID}/dashboard`);

  await expectHeading(page, /panel/i);

  expectNoCriticalErrors(errors);
});

test("carga Mis tareas sin errores", async ({ page }) => {
  const errors = monitorErrors(page);

  await page.goto("/my-tasks");

  await expectHeading(page, /mis tareas/i);

  expectNoCriticalErrors(errors);
});

test("carga Configuración sin errores", async ({ page }) => {
  const errors = monitorErrors(page);

  await page.goto("/settings");

  await expectHeading(page, /configuración/i);

  expectNoCriticalErrors(errors);
});