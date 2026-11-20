import { expect, test } from "@playwright/test";

const API_URL = process.env.E2E_API_URL ?? "http://localhost:3000/api";
const SEED_USER_ID = "11111111-1111-1111-1111-111111111111";

test.describe("visualizar proyectos", () => {
  let project: { id: string; name: string };

  test.beforeEach(async ({ request }) => {
    const response = await request.post(`${API_URL}/projects`, {
      data: {
        name: `Proyecto Visible ${Date.now()}`,
        description: "Proyecto para probar el listado",
        createdBy: SEED_USER_ID,
      },
    });

    expect(response.status()).toBe(201);

    project = await response.json();
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${API_URL}/projects/${project.id}`);
  });

  test("la portada redirige al listado de proyectos", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL("/projects");
    await expect(
      page.getByRole("heading", { level: 1, name: "Proyectos" }),
    ).toBeVisible();
  });

  test("usuario busca un proyecto y abre su detalle", async ({ page }) => {
    await page.goto("/projects");

    const list = page.getByRole("list", { name: "Proyectos" });

    await expect(list.getByRole("link", { name: project.name })).toBeVisible();

    await page
      .getByRole("searchbox", { name: "Buscar proyectos" })
      .fill(project.name);

    await expect(list.getByRole("listitem")).toHaveCount(1);
    await expect(page).toHaveURL(/q=/);

    await list.getByRole("link", { name: project.name }).click();

    await expect(page).toHaveURL(`/projects/${project.id}`);
    await expect(
      page.getByRole("heading", { level: 1, name: project.name }),
    ).toBeVisible();
    await expect(
      page.getByText("Proyecto para probar el listado"),
    ).toBeVisible();
  });

  test("una búsqueda sin coincidencias muestra el estado vacío y se puede limpiar", async ({
    page,
  }) => {
    const query = `sin coincidencias ${Date.now()}`;

    await page.goto("/projects");

    const list = page.getByTestId("projects-list");
    const noResults = page.getByTestId("projects-no-results");
    const search = page.getByTestId("projects-search");

    await expect(list.getByRole("link", { name: project.name })).toBeVisible();

    await search.fill(query);

    await expect(noResults).toContainText(
      `No hay proyectos que coincidan con «${query}»`,
    );
    await expect(list).toHaveCount(0);
    await expect(page).toHaveURL(/q=/);

    // La búsqueda vive en la URL: al recargar sigue sin resultados
    await page.reload();

    await expect(search).toHaveValue(query);
    await expect(noResults).toBeVisible();

    // «Limpiar búsqueda» vuelve a mostrar todos los proyectos
    await noResults.getByRole("button", { name: "Limpiar búsqueda" }).click();

    await expect(search).toHaveValue("");
    await expect(noResults).toHaveCount(0);
    await expect(list.getByRole("link", { name: project.name })).toBeVisible();
    await expect(page).not.toHaveURL(/q=/);
  });

  test("un proyecto inexistente muestra un mensaje", async ({ page }) => {
    await page.goto("/projects/no-existe");

    await expect(
      page.getByRole("heading", { name: "Proyecto no encontrado" }),
    ).toBeVisible();
  });
});
