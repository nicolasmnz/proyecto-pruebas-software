import { expect, test } from "@playwright/test";

// Proyecto del seed con elementos en las tres columnas
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
