import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const API_URL = "http://localhost:3000/api";
const SEED_USER_ID = "11111111-1111-1111-1111-111111111111";

function sprintCard(page: Page, name: string) {
  return page.getByRole("article", { name });
}

function backlog(page: Page) {
  return page.getByRole("region", { name: "Backlog" });
}

test.describe("sprints", () => {
  let project: { id: string };

  test.beforeEach(async ({ request }) => {
    const created = await request.post(`${API_URL}/projects`, {
      data: { name: `Proyecto Sprints ${Date.now()}`, createdBy: SEED_USER_ID },
    });

    expect(created.status()).toBe(201);

    project = await created.json();

    const item = await request.post(
      `${API_URL}/projects/${project.id}/work-items`,
      {
        data: {
          title: "Pantalla de login",
          estimate: 3,
          createdBy: SEED_USER_ID,
        },
      },
    );

    expect(item.status()).toBe(201);
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${API_URL}/projects/${project.id}`);
  });

  test("usuario crea un sprint, le asigna una tarea del backlog y lo elimina", async ({
    page,
  }) => {
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("link", { name: "Ver sprints" }).click();

    await expect(page).toHaveURL(`/projects/${project.id}/sprints`);
    await expect(page.getByText(/aún no tiene sprints/)).toBeVisible();
    await expect(backlog(page)).toContainText("Pantalla de login");

    await page.getByRole("button", { name: "Nuevo sprint" }).click();

    const form = page.getByRole("region", { name: "Nuevo sprint" });

    await form.getByLabel(/Nombre/).fill("Sprint 1");
    await form.getByLabel("Fecha de inicio").fill("2026-11-02");
    await form.getByLabel("Fecha de término").fill("2026-11-13");
    await form.getByRole("button", { name: "Crear" }).click();

    const sprint = sprintCard(page, "Sprint 1");

    await expect(sprint).toContainText("Planificado");
    await expect(sprint).toContainText("2 nov 2026 – 13 nov 2026");

    // La tarea pasa del backlog al sprint
    await backlog(page)
      .getByLabel("Mover «Pantalla de login» a")
      .selectOption({ label: "Sprint 1" });

    await expect(sprint).toContainText("Pantalla de login");
    await expect(sprint).toContainText("1 tarea · 3 pts");
    await expect(backlog(page)).toContainText("No hay tareas en el backlog");

    // La asignación persiste al recargar
    await page.reload();

    await expect(sprintCard(page, "Sprint 1")).toContainText(
      "Pantalla de login",
    );

    // Al eliminar el sprint, la tarea vuelve al backlog
    await sprintCard(page, "Sprint 1")
      .getByRole("button", { name: "Eliminar" })
      .click();

    const dialog = page.getByRole("alertdialog", {
      name: "¿Eliminar este sprint?",
    });

    await expect(dialog).toContainText("Su tarea vuelve al backlog.");

    await dialog.getByRole("button", { name: "Eliminar" }).click();

    await expect(sprintCard(page, "Sprint 1")).toHaveCount(0);
    await expect(backlog(page)).toContainText("Pantalla de login");

    await page.reload();

    await expect(backlog(page)).toContainText("Pantalla de login");
  });

  test("usuario valida las fechas, activa sprints y ve el aviso de varios activos", async ({
    page,
    request,
  }) => {
    for (const name of ["Sprint A", "Sprint B"]) {
      const created = await request.post(
        `${API_URL}/projects/${project.id}/sprints`,
        { data: { name } },
      );

      expect(created.status()).toBe(201);
    }

    await page.goto(`/projects/${project.id}/sprints`);

    // Una fecha de término anterior a la de inicio no se guarda
    const first = sprintCard(page, "Sprint A");

    await first.getByRole("button", { name: "Editar" }).click();
    await first.getByLabel("Fecha de inicio").fill("2026-11-10");
    await first.getByLabel("Fecha de término").fill("2026-11-01");
    await first.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(first.getByRole("alert")).toHaveText(
      "La fecha de término no puede ser anterior a la de inicio.",
    );

    await first.getByLabel("Fecha de término").fill("2026-11-20");
    await first.getByLabel("Estado").selectOption("ACTIVE");
    await first.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(first).toContainText("Activo");
    await expect(page.getByText(/sprints activos/)).toHaveCount(0);

    // Un segundo sprint activo se permite, pero se avisa
    const second = sprintCard(page, "Sprint B");

    await second.getByRole("button", { name: "Editar" }).click();
    await second.getByLabel("Estado").selectOption("ACTIVE");
    await second.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(
      page.getByText(/Hay 2 sprints activos al mismo tiempo/),
    ).toBeVisible();

    await page.reload();

    await expect(
      page.getByText(/Hay 2 sprints activos al mismo tiempo/),
    ).toBeVisible();
  });
});
