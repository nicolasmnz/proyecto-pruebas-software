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

test.describe("mover tareas entre columnas", () => {
  let project: { id: string };

  test.beforeEach(async ({ request }) => {
    const created = await request.post(`${API_URL}/projects`, {
      data: { name: `Proyecto Mover ${Date.now()}`, createdBy: SEED_USER_ID },
    });

    expect(created.status()).toBe(201);

    project = await created.json();

    const item = await request.post(
      `${API_URL}/projects/${project.id}/work-items`,
      { data: { title: "Tarea a mover", createdBy: SEED_USER_ID } },
    );

    expect(item.status()).toBe(201);
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${API_URL}/projects/${project.id}`);
  });

  test("usuario mueve una tarea a Hecho y el cambio persiste", async ({
    page,
  }) => {
    await page.goto(`/projects/${project.id}/board`);

    await page
      .getByLabel("Mover «Tarea a mover» a")
      .selectOption({ label: "Hecho" });

    const done = page.getByRole("region", { name: "Hecho" });

    await expect(done.getByText("Tarea a mover")).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Por hacer" })
        .getByText("Sin elementos"),
    ).toBeVisible();

    await page.reload();

    await expect(
      page.getByRole("region", { name: "Hecho" }).getByText("Tarea a mover"),
    ).toBeVisible();
  });
});

test.describe("archivar tareas terminadas", () => {
  let project: { id: string };

  test.beforeEach(async ({ request }) => {
    const created = await request.post(`${API_URL}/projects`, {
      data: {
        name: `Proyecto Archivar ${Date.now()}`,
        createdBy: SEED_USER_ID,
      },
    });

    expect(created.status()).toBe(201);

    project = await created.json();

    const item = await request.post(
      `${API_URL}/projects/${project.id}/work-items`,
      {
        data: {
          title: "Tarea terminada",
          status: "DONE",
          createdBy: SEED_USER_ID,
        },
      },
    );

    expect(item.status()).toBe(201);
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${API_URL}/projects/${project.id}`);
  });

  test("usuario archiva y restaura una tarea de Hecho", async ({ page }) => {
    await page.goto(`/projects/${project.id}/board`);

    const done = page.getByRole("region", { name: "Hecho" });

    await page
      .getByRole("button", { name: "Archivar «Tarea terminada»" })
      .click();

    await expect(done.getByText("Sin elementos")).toBeVisible();

    // Archivar no cambia el progreso: la tarea sigue contando como hecha
    await expect(
      page.getByRole("progressbar", { name: "Progreso" }),
    ).toHaveAttribute("aria-valuenow", "100");

    // El archivado persiste al recargar
    await page.reload();

    await expect(
      page.getByRole("region", { name: "Hecho" }).getByText("Sin elementos"),
    ).toBeVisible();

    await page.getByRole("button", { name: "Archivadas (1)" }).click();
    await page
      .getByRole("button", { name: "Restaurar «Tarea terminada»" })
      .click();

    await expect(
      page.getByRole("region", { name: "Hecho" }).getByText("Tarea terminada"),
    ).toBeVisible();
  });
});

test.describe("ficha de la tarea", () => {
  let project: { id: string };

  test.beforeEach(async ({ request }) => {
    const created = await request.post(`${API_URL}/projects`, {
      data: { name: `Proyecto Ficha ${Date.now()}`, createdBy: SEED_USER_ID },
    });

    expect(created.status()).toBe(201);

    project = await created.json();

    const item = await request.post(
      `${API_URL}/projects/${project.id}/work-items`,
      {
        data: {
          title: "Tarea con ficha",
          description: "Descripción inicial",
          createdBy: SEED_USER_ID,
        },
      },
    );

    expect(item.status()).toBe(201);
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${API_URL}/projects/${project.id}`);
  });

  test("usuario edita la tarea, la asigna y luego la elimina", async ({
    page,
  }) => {
    await page.goto(`/projects/${project.id}/board`);

    await page.getByRole("button", { name: "Tarea con ficha" }).click();

    const dialog = page.getByRole("dialog", { name: "Tarea con ficha" });

    await expect(dialog.getByText("Descripción inicial")).toBeVisible();

    await dialog.getByRole("button", { name: "Editar" }).click();
    await dialog.getByLabel(/Título/).fill("Tarea editada");
    // La primera opción es "Sin asignar": se elige al primer miembro
    await dialog.getByLabel("Responsable").selectOption({ index: 1 });
    await dialog.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(
      page.getByRole("dialog", { name: "Tarea editada" }),
    ).toBeVisible();
    await expect(dialog.getByText("Sin asignar")).toHaveCount(0);

    // Los cambios persisten al recargar
    await page.reload();
    await page.getByRole("button", { name: "Tarea editada" }).click();

    await page
      .getByRole("dialog", { name: "Tarea editada" })
      .getByRole("button", { name: "Eliminar" })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Eliminar" })
      .click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Tarea editada" }),
    ).toHaveCount(0);

    await page.reload();

    await expect(
      page
        .getByRole("region", { name: "Por hacer" })
        .getByText("Sin elementos"),
    ).toBeVisible();
  });
});
