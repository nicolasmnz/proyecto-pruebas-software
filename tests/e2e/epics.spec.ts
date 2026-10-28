import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

// El título de una tarjeta es un botón (ver view-kanban-board.spec.ts)
function card(scope: Page | Locator, title: string) {
  return scope.getByRole("button", { name: title, exact: true });
}

function epicCard(page: Page, title: string) {
  return page.getByRole("article", { name: title });
}

const API_URL = "http://localhost:3000/api";
const SEED_USER_ID = "11111111-1111-1111-1111-111111111111";

test.describe("épicas", () => {
  let project: { id: string };

  test.beforeEach(async ({ request }) => {
    const created = await request.post(`${API_URL}/projects`, {
      data: { name: `Proyecto Épicas ${Date.now()}`, createdBy: SEED_USER_ID },
    });

    expect(created.status()).toBe(201);

    project = await created.json();

    const item = await request.post(
      `${API_URL}/projects/${project.id}/work-items`,
      { data: { title: "Pantalla de login", createdBy: SEED_USER_ID } },
    );

    expect(item.status()).toBe(201);
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${API_URL}/projects/${project.id}`);
  });

  test("usuario crea una épica, le asigna una tarea y filtra el tablero por ella", async ({
    page,
  }) => {
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("link", { name: "Ver épicas" }).click();

    await expect(page).toHaveURL(`/projects/${project.id}/epics`);
    await expect(page.getByText(/aún no tiene épicas/)).toBeVisible();

    await page.getByRole("button", { name: "Nueva épica" }).click();

    const form = page.getByRole("region", { name: "Nueva épica" });

    await form.getByLabel(/Título/).fill("Autenticación");
    await form.getByLabel("Prioridad").selectOption("HIGH");
    await form.getByRole("button", { name: "Crear" }).click();

    await expect(epicCard(page, "Autenticación")).toContainText(
      "Aún no tiene tareas",
    );

    // La épica persiste al recargar
    await page.reload();

    await expect(epicCard(page, "Autenticación")).toBeVisible();

    // Se asigna la tarea a la épica desde su ficha en el tablero
    await page.goto(`/projects/${project.id}/board`);
    await card(page, "Pantalla de login").click();

    const dialog = page.getByRole("dialog", { name: "Pantalla de login" });

    await expect(dialog).toContainText("Sin épica");

    await dialog.getByRole("button", { name: "Editar" }).click();
    await dialog.getByLabel("Épica").selectOption({ label: "Autenticación" });
    await dialog.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(dialog).toContainText("Autenticación");

    await dialog.getByRole("button", { name: "Cerrar" }).click();

    const todo = page.getByRole("region", { name: "Por hacer" });

    await expect(todo.getByRole("article")).toContainText(
      "Épica: Autenticación",
    );

    // El avance de la épica cuenta la tarea asignada
    await page.goto(`/projects/${project.id}/epics`);

    const epic = epicCard(page, "Autenticación");

    await expect(epic).toContainText("0 de 1 tarea hecha · 0 %");

    // «Ver en el tablero» abre el tablero filtrado por la épica
    await epic.getByRole("link", { name: /Ver en el tablero/ }).click();

    await expect(page).toHaveURL(/\/board\?epic=/);
    await expect(page.getByLabel("Épica")).toHaveValue(/.+/);
    await expect(card(todo, "Pantalla de login")).toBeVisible();

    await page.getByLabel("Épica").selectOption({ label: "Sin épica" });

    await expect(todo.getByText("Sin resultados")).toBeVisible();
  });

  test("usuario edita el estado de una épica y la archiva", async ({
    page,
    request,
  }) => {
    const created = await request.post(
      `${API_URL}/projects/${project.id}/epics`,
      { data: { title: "Reportes", createdBy: SEED_USER_ID } },
    );

    expect(created.status()).toBe(201);

    await page.goto(`/projects/${project.id}/epics`);

    const epic = epicCard(page, "Reportes");

    await expect(epic).toContainText("Por hacer");

    await epic.getByRole("button", { name: "Editar" }).click();
    await epic.getByLabel("Estado").selectOption("IN_PROGRESS");
    await epic.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(epic).toContainText("En progreso");

    // El cambio persiste al recargar
    await page.reload();

    await expect(epicCard(page, "Reportes")).toContainText("En progreso");

    await epicCard(page, "Reportes")
      .getByRole("button", { name: "Archivar" })
      .click();
    await page
      .getByRole("alertdialog", { name: "¿Archivar esta épica?" })
      .getByRole("button", { name: "Archivar" })
      .click();

    await expect(epicCard(page, "Reportes")).toHaveCount(0);

    await page.reload();

    await expect(page.getByText(/aún no tiene épicas/)).toBeVisible();

    // Archivar la épica no saca sus tareas del tablero
    await page.goto(`/projects/${project.id}/board`);

    await expect(card(page, "Pantalla de login")).toBeVisible();
  });

  test("el detalle del proyecto resume las épicas y permite crear una", async ({
    page,
    request,
  }) => {
    const created = await request.post(
      `${API_URL}/projects/${project.id}/epics`,
      { data: { title: "Notificaciones", createdBy: SEED_USER_ID } },
    );

    expect(created.status()).toBe(201);

    await page.goto(`/projects/${project.id}`);

    const summary = page.getByRole("region", { name: "Épicas" });

    await expect(
      summary.getByRole("progressbar", { name: "Avance de Notificaciones" }),
    ).toHaveAttribute("aria-valuenow", "0");

    await summary.getByRole("link", { name: "Nueva épica" }).click();

    await expect(
      page.getByRole("region", { name: "Nueva épica" }),
    ).toBeVisible();
    await expect(page.getByLabel(/Título/)).toBeFocused();
  });
});
