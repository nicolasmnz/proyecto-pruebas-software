import { expect, test } from "@playwright/test";

const API_URL = "http://localhost:3000/api";
const SEED_USER_ID = "11111111-1111-1111-1111-111111111111";

test.describe("editar y archivar proyectos", () => {
  let project: { id: string; name: string };

  test.beforeEach(async ({ request }) => {
    const response = await request.post(`${API_URL}/projects`, {
      data: {
        name: `Proyecto Editable ${Date.now()}`,
        description: "Descripción inicial",
        createdBy: SEED_USER_ID,
      },
    });

    expect(response.status()).toBe(201);

    project = await response.json();
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${API_URL}/projects/${project.id}`);
  });

  test("usuario edita el nombre y la descripción", async ({ page, request }) => {
    const newName = `${project.name} (editado)`;

    await page.goto(`/projects/${project.id}`);

    await page.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel(/Nombre/).fill(newName);
    await page.getByLabel("Descripción").fill("Descripción actualizada");
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: newName }),
    ).toBeVisible();
    await expect(page.getByText("Descripción actualizada")).toBeVisible();

    // El cambio quedó guardado en la API
    const response = await request.get(`${API_URL}/projects/${project.id}`);
    const saved = await response.json();

    expect(saved.name).toBe(newName);
    expect(saved.description).toBe("Descripción actualizada");
  });

  test("usuario archiva un proyecto, lo encuentra en Archivados y lo restaura", async ({
    page,
  }) => {
    await page.goto(`/projects/${project.id}`);

    await page.getByRole("button", { name: "Archivar" }).click();

    const dialog = page.getByRole("alertdialog", {
      name: "¿Archivar este proyecto?",
    });

    await dialog.getByRole("button", { name: "Archivar" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("Este proyecto está archivado.")).toBeVisible();

    // Ya no aparece entre los activos, sino en Archivados
    await page.goto("/projects");
    await expect(
      page
        .getByRole("list", { name: "Proyectos" })
        .getByRole("link", { name: project.name }),
    ).toHaveCount(0);

    await page
      .getByRole("navigation", { name: "Estado de los proyectos" })
      .getByRole("link", { name: /Archivados/ })
      .click();

    await page
      .getByRole("list", { name: "Proyectos archivados" })
      .getByRole("link", { name: project.name })
      .click();

    await page.getByRole("button", { name: "Restaurar" }).click();

    await expect(page.getByRole("button", { name: "Editar" })).toBeVisible();
  });
});
