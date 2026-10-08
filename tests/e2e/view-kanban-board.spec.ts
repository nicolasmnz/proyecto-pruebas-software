import { expect, test } from "@playwright/test";

// Proyecto del seed con elementos en las tres columnas
const API_URL = "http://localhost:3000/api";
const SEED_USER_ID = "11111111-1111-1111-1111-111111111111";
const SEED_PROJECT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

test.describe("visualizar tablero kanban", () => {
  test("usuario abre el tablero desde el detalle del proyecto", async ({
    page,
  }) => {
    await page.goto(`/projects/${SEED_PROJECT_ID}`);

    await page.getByRole("link", { name: "Ver tablero" }).click();

    await expect(page).toHaveURL(`/projects/${SEED_PROJECT_ID}/board`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Tablero" }),
    ).toBeVisible();

    for (const column of ["Por hacer", "En progreso", "Hecho"]) {
      await expect(page.getByRole("region", { name: column })).toBeVisible();
    }

    await expect(
      page.getByRole("region", { name: "Hecho" }).getByText("Crear proyectos"),
    ).toBeVisible();
  });

  test("un proyecto inexistente muestra un mensaje", async ({ page }) => {
    await page.goto("/projects/no-existe/board");

    await expect(
      page.getByRole("heading", { name: "Proyecto no encontrado" }),
    ).toBeVisible();
  });
});

test.describe("agregar tareas al tablero", () => {
  let project: { id: string };

  test.beforeEach(async ({ request }) => {
    const response = await request.post(`${API_URL}/projects`, {
      data: { name: `Proyecto Tablero ${Date.now()}`, createdBy: SEED_USER_ID },
    });

    expect(response.status()).toBe(201);

    project = await response.json();
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${API_URL}/projects/${project.id}`);
  });

  test("usuario crea una tarea en la columna En progreso", async ({ page }) => {
    await page.goto(`/projects/${project.id}/board`);

    const column = page.getByRole("region", { name: "En progreso" });

    await expect(column.getByText("Sin elementos")).toBeVisible();

    await column.getByRole("button", { name: /Crear tarea/ }).click();
    await page.getByLabel(/Título/).fill("Preparar la demo");
    await page.getByLabel("Prioridad").selectOption("HIGH");
    await page.getByRole("button", { name: "Crear", exact: true }).click();

    await expect(column.getByText("Preparar la demo")).toBeVisible();

    // La tarea persiste al recargar
    await page.reload();

    await expect(
      page
        .getByRole("region", { name: "En progreso" })
        .getByText("Preparar la demo"),
    ).toBeVisible();
  });
});

