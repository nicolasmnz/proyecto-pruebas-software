import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

const API_URL = "http://localhost:3000/api";
// Ana (seed): la sesión que guarda auth.setup.ts. Crea el proyecto, así que
// es su dueña
const ANA_ID = "11111111-1111-1111-1111-111111111111";

// Fecha local a `days` días de hoy, en formato AAAA-MM-DD
function dateFromToday(days: number) {
  const date = new Date();

  date.setDate(date.getDate() + days);

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

async function addTask(
  request: APIRequestContext,
  projectId: string,
  data: {
    title: string;
    estimate: number;
    status?: string;
    assigneeId?: string;
    dueDate?: string;
    sprintId?: string;
    epicId?: string;
  },
) {
  const created = await request.post(
    `${API_URL}/projects/${projectId}/work-items`,
    {
      data: {
        title: data.title,
        estimate: data.estimate,
        status: data.status ?? "TODO",
        createdBy: ANA_ID,
      },
    },
  );

  expect(created.status()).toBe(201);

  const item = await created.json();
  const itemPath = `${API_URL}/projects/${projectId}/work-items/${item.id}`;

  if (data.assigneeId || data.dueDate) {
    const updated = await request.put(itemPath, {
      data: {
        title: data.title,
        type: "TASK",
        priority: "MEDIUM",
        estimate: data.estimate,
        assigneeId: data.assigneeId ?? null,
        dueDate: data.dueDate ?? null,
      },
    });

    expect(updated.status()).toBe(200);
  }

  if (data.sprintId) {
    const moved = await request.patch(`${itemPath}/sprint`, {
      data: { sprintId: data.sprintId },
    });

    expect(moved.status()).toBe(200);
  }

  if (data.epicId) {
    const assigned = await request.patch(`${itemPath}/epic`, {
      data: { epicId: data.epicId },
    });

    expect(assigned.status()).toBe(200);
  }
}

function card(page: Page, name: string) {
  return page.getByRole("region", { name });
}

test.describe("panel del proyecto", () => {
  let project: { id: string; name: string };
  let sprint: { id: string };

  test.beforeEach(async ({ request }) => {
    const created = await request.post(`${API_URL}/projects`, {
      data: { name: `Proyecto Panel ${Date.now()}`, createdBy: ANA_ID },
    });

    expect(created.status()).toBe(201);

    project = await created.json();

    const sprintCreated = await request.post(
      `${API_URL}/projects/${project.id}/sprints`,
      {
        data: {
          name: "Sprint Panel",
          startDate: dateFromToday(-3),
          endDate: dateFromToday(5),
        },
      },
    );

    expect(sprintCreated.status()).toBe(201);

    sprint = await sprintCreated.json();

    const activated = await request.put(
      `${API_URL}/projects/${project.id}/sprints/${sprint.id}`,
      {
        data: {
          name: "Sprint Panel",
          status: "ACTIVE",
          startDate: dateFromToday(-3),
          endDate: dateFromToday(5),
        },
      },
    );

    expect(activated.status()).toBe(200);

    const epic = await request.post(`${API_URL}/projects/${project.id}/epics`, {
      data: { title: "Épica Panel", priority: "MEDIUM", createdBy: ANA_ID },
    });

    expect(epic.status()).toBe(201);

    const epicId = (await epic.json()).id;

    await addTask(request, project.id, {
      title: "Tarea vencida",
      estimate: 3,
      assigneeId: ANA_ID,
      dueDate: dateFromToday(-1),
      sprintId: sprint.id,
      epicId,
    });
    await addTask(request, project.id, {
      title: "Tarea terminada",
      estimate: 2,
      status: "DONE",
      sprintId: sprint.id,
      epicId,
    });
    await addTask(request, project.id, {
      title: "Tarea sin asignar",
      estimate: 1,
    });
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${API_URL}/projects/${project.id}`);
  });

  test("la dueña ve el avance, el sprint, las épicas, la carga y las vencidas", async ({
    page,
  }) => {
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("link", { name: "Ver panel" }).click();

    await expect(page).toHaveURL(`/projects/${project.id}/dashboard`);
    await expect(card(page, "Avance del proyecto")).toContainText(
      "1 de 3 tareas hechas · 2 de 6 pts · 33 %",
    );

    const sprintCard = card(page, "Sprint activo");

    await expect(sprintCard).toContainText("Sprint Panel");
    await expect(sprintCard).toContainText("Quedan 5 días");
    await expect(sprintCard).toContainText(
      "1 de 2 tareas hechas · 2 de 5 pts · 40 %",
    );

    await expect(card(page, "Épicas")).toContainText("Épica Panel");
    await expect(
      card(page, "Épicas").getByRole("progressbar", {
        name: "Avance de Épica Panel",
      }),
    ).toHaveAttribute("aria-valuenow", "40");

    const load = card(page, "Carga por integrante");

    await expect(load.getByRole("row", { name: /Ana Torres/ })).toHaveText(
      /Ana Torres\s*1\s*3/,
    );
    await expect(load.getByRole("row", { name: /Sin asignar/ })).toHaveText(
      /Sin asignar\s*1\s*1/,
    );

    const overdue = card(page, "Tareas vencidas");

    await expect(overdue.getByRole("listitem")).toHaveCount(1);
    await expect(overdue).toContainText("Tarea vencida");
    await expect(overdue).toContainText("Ana Torres");
    await expect(overdue).toContainText("hace 1 día");

    // La tarea vencida abre su ficha en el tablero
    await overdue.getByRole("link", { name: /Tarea vencida/ }).click();

    await expect(
      page.getByRole("dialog", { name: "Tarea vencida" }),
    ).toBeVisible();
  });

  test("sin sprint activo el panel lo indica", async ({ page, request }) => {
    const closed = await request.put(
      `${API_URL}/projects/${project.id}/sprints/${sprint.id}`,
      { data: { name: "Sprint Panel", status: "COMPLETED" } },
    );

    expect(closed.status()).toBe(200);

    await page.goto(`/projects/${project.id}/dashboard`);

    await expect(card(page, "Sprint activo")).toContainText(
      "No hay un sprint activo.",
    );
  });
});

test.describe("panel del proyecto sin permiso", () => {
  // María (seed) no participa en el proyecto; parte sin la sesión de Ana
  test.use({ storageState: { cookies: [], origins: [] } });

  let project: { id: string };

  test.beforeEach(async ({ request }) => {
    const created = await request.post(`${API_URL}/projects`, {
      data: { name: `Proyecto Ajeno ${Date.now()}`, createdBy: ANA_ID },
    });

    expect(created.status()).toBe(201);

    project = await created.json();
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${API_URL}/projects/${project.id}`);
  });

  test("quien no es dueño ni jefe de proyecto no ve el panel", async ({
    page,
  }) => {
    await page.goto(`/projects/${project.id}`);

    await page.getByLabel("Correo").fill("maria@pruebas.cl");
    await page.getByLabel("Contraseña").fill("123456");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page).toHaveURL(`/projects/${project.id}`);
    await expect(page.getByRole("link", { name: "Ver tablero" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver panel" })).toHaveCount(0);

    await page.goto(`/projects/${project.id}/dashboard`);

    await expect(
      page.getByRole("heading", {
        name: "Panel solo para la jefatura del proyecto",
      }),
    ).toBeVisible();
  });
});
