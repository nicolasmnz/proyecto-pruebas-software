import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const API_URL = process.env.E2E_API_URL ?? "http://localhost:3000/api";

// Enlace del proyecto dentro del listado visible (activos o archivados)
function projectLink(page: Page, name: string) {
  return page
    .getByTestId("projects-list")
    .getByRole("link", { name, exact: true });
}

// CRUD completo desde la interfaz: crear → listar → ver detalle → editar →
// archivar. La interfaz no elimina proyectos: archivar cumple ese papel,
// porque el proyecto sale del listado de activos y se puede restaurar
test.describe("ciclo completo de un proyecto", () => {
  let projectId: string | undefined;

  test.afterEach(async ({ request }) => {
    if (projectId) {
      await request.delete(`${API_URL}/projects/${projectId}`);
      projectId = undefined;
    }
  });

  test("usuario crea, lista, abre, edita y archiva un proyecto", async ({
    page,
  }) => {
    const name = `Proyecto Ciclo ${Date.now()}`;
    const editedName = `${name} (editado)`;

    // Crear
    await page.goto("/projects");
    await page.getByRole("link", { name: "Crear proyecto" }).click();

    const createForm = page.getByTestId("project-form");

    await createForm.getByLabel(/Nombre/).fill(name);
    await createForm.getByLabel("Descripción").fill("Descripción inicial");

    const createResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/projects") &&
        response.request().method() === "POST",
    );

    await createForm.getByTestId("project-form-submit").click();

    const created = await createResponse;

    expect(created.status()).toBe(201);
    projectId = (await created.json()).id;

    await expect(page).toHaveURL(`/projects/${projectId}`);

    // Listar
    await page.goto("/projects");

    await expect(projectLink(page, name)).toBeVisible();

    // Ver detalle
    await projectLink(page, name).click();

    await expect(page).toHaveURL(`/projects/${projectId}`);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Descripción" }),
    ).toContainText("Descripción inicial");

    // Editar
    await page.getByRole("button", { name: "Editar" }).click();

    const editForm = page.getByTestId("project-form");

    await editForm.getByLabel(/Nombre/).fill(editedName);
    await editForm.getByLabel("Descripción").fill("Descripción editada");
    await editForm.getByTestId("project-form-submit").click();

    await expect(
      page.getByRole("heading", { level: 1, name: editedName }),
    ).toBeVisible();

    // La edición persiste al recargar
    await page.reload();

    await expect(
      page.getByRole("heading", { level: 1, name: editedName }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Descripción" }),
    ).toContainText("Descripción editada");

    // Archivar
    await page.getByRole("button", { name: "Archivar" }).click();

    const dialog = page.getByTestId("confirm-dialog");

    await dialog.getByTestId("confirm-dialog-confirm").click();

    await expect(dialog).toBeHidden();
    // Un proyecto archivado es de solo lectura: se restaura, no se edita
    await expect(page.getByRole("button", { name: "Restaurar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);

    // Sale de los activos y aparece en Archivados
    await page.goto("/projects");

    await expect(page.getByTestId("projects-list")).toBeVisible();
    await expect(projectLink(page, editedName)).toHaveCount(0);

    await page
      .getByRole("navigation", { name: "Estado de los proyectos" })
      .getByRole("link", { name: /Archivados/ })
      .click();

    await expect(projectLink(page, editedName)).toBeVisible();
  });
});
