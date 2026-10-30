import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

const API_URL = "http://localhost:3000/api";
// Ana (seed): la sesión que guarda auth.setup.ts
const ANA_ID = "11111111-1111-1111-1111-111111111111";

// Fecha local a `days` días de hoy, en formato AAAA-MM-DD
function dateFromToday(days: number) {
  const date = new Date();

  date.setDate(date.getDate() + days);

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

async function addAssignedTask(
  request: APIRequestContext,
  projectId: string,
  title: string,
  dueDate: string,
  status = "TODO",
) {
  const created = await request.post(
    `${API_URL}/projects/${projectId}/work-items`,
    { data: { title, status, priority: "HIGH", createdBy: ANA_ID } },
  );

  expect(created.status()).toBe(201);

  const item = await created.json();

  const updated = await request.put(
    `${API_URL}/projects/${projectId}/work-items/${item.id}`,
    {
      data: {
        title,
        type: "TASK",
        priority: "HIGH",
        assigneeId: ANA_ID,
        dueDate,
      },
    },
  );

  expect(updated.status()).toBe(200);
}

function taskRow(page: Page, title: string) {
  return page.getByRole("listitem").filter({ hasText: title });
}

test.describe("mis tareas", () => {
  let project: { id: string; name: string };

  test.beforeEach(async ({ request }) => {
    const created = await request.post(`${API_URL}/projects`, {
      data: { name: `Proyecto Mis Tareas ${Date.now()}`, createdBy: ANA_ID },
    });

    expect(created.status()).toBe(201);

    project = await created.json();

    await addAssignedTask(
      request,
      project.id,
      "Preparar demo",
      dateFromToday(10),
    );
    await addAssignedTask(
      request,
      project.id,
      "Revisar contrato",
      dateFromToday(-1),
    );
    await addAssignedTask(
      request,
      project.id,
      "Escribir informe",
      dateFromToday(3),
    );
    await addAssignedTask(
      request,
      project.id,
      "Tarea terminada",
      dateFromToday(1),
      "DONE",
    );
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${API_URL}/projects/${project.id}`);
  });

  test("usuario ve sus tareas por fecha, con las vencidas marcadas, y abre una en el tablero", async ({
    page,
  }) => {
    await page.goto("/projects");
    await page.getByRole("link", { name: "Mis tareas", exact: true }).click();

    await expect(page).toHaveURL("/my-tasks");

    // Otros specs pueden asignarle tareas a Ana en paralelo: se mira solo este proyecto
    const section = page.getByRole("region", { name: project.name });

    await expect(section.getByRole("listitem")).toHaveText([
      /Revisar contrato/,
      /Escribir informe/,
      /Preparar demo/,
    ]);
    await expect(taskRow(page, "Revisar contrato")).toContainText("Vencida");
    await expect(taskRow(page, "Escribir informe")).not.toContainText(
      "Vencida",
    );

    // Las terminadas se ocultan, pero se pueden mostrar
    await expect(section).not.toContainText("Tarea terminada");

    await page.getByRole("checkbox", { name: /Mostrar terminadas/ }).check();

    await expect(taskRow(page, "Tarea terminada")).toContainText("Hecho");
    await expect(page).toHaveURL("/my-tasks?done=1");

    // La tarea abre su ficha en el tablero del proyecto
    await section.getByRole("link", { name: /Escribir informe/ }).click();

    await expect(page).toHaveURL(
      new RegExp(`/projects/${project.id}/board\\?task=`),
    );

    const dialog = page.getByRole("dialog", { name: "Escribir informe" });

    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Cerrar" }).click();

    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(`/projects/${project.id}/board`);
  });
});

test.describe("mis tareas sin tareas asignadas", () => {
  // Diego (seed) no tiene tareas; parte sin la sesión de Ana
  test.use({ storageState: { cookies: [], origins: [] } });

  test("un usuario sin tareas ve el estado vacío", async ({ page }) => {
    await page.goto("/my-tasks");

    await page.getByLabel("Correo").fill("diego@pruebas.cl");
    await page.getByLabel("Contraseña").fill("123456");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page).toHaveURL("/my-tasks");
    await expect(
      page.getByRole("heading", { name: "No tienes tareas asignadas" }),
    ).toBeVisible();
    await expect(page.getByText("0 tareas pendientes")).toBeVisible();
  });
});
