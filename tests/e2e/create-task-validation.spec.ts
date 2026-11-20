import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

const API_URL = process.env.E2E_API_URL ?? "http://localhost:3000/api";
const SEED_USER_ID = "11111111-1111-1111-1111-111111111111";

// Cuenta los POST de creación de tareas que el formulario envía a la API
function trackCreateRequests(page: Page) {
  const requests: string[] = [];

  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname.endsWith("/work-items")
    ) {
      requests.push(request.url());
    }
  });

  return requests;
}

// Abre el formulario de creación de la columna y lo devuelve
async function openTaskForm(column: Locator) {
  await column.getByTestId("board-add-task").click();

  return column.getByTestId("task-form");
}

test.describe("validaciones al crear una tarea", () => {
  let project: { id: string };

  test.beforeEach(async ({ page, request }) => {
    const response = await request.post(`${API_URL}/projects`, {
      data: {
        name: `Proyecto Validación Tareas ${Date.now()}`,
        createdBy: SEED_USER_ID,
      },
    });

    expect(response.status()).toBe(201);

    project = await response.json();

    await page.goto(`/projects/${project.id}/board`);
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${API_URL}/projects/${project.id}`);
  });

  test("con el título vacío el navegador no envía la tarea", async ({
    page,
  }) => {
    const requests = trackCreateRequests(page);
    const column = page.getByTestId("board-column-todo");
    const form = await openTaskForm(column);
    const title = form.getByTestId("task-form-title");

    await form.getByLabel("Descripción").fill("Tarea sin título");
    await form.getByTestId("task-form-submit").click();

    // El campo es obligatorio: lo bloquea la validación del navegador
    const valueMissing = await title.evaluate(
      (input: HTMLInputElement) => input.validity.valueMissing,
    );

    expect(valueMissing).toBe(true);
    await expect(form).toBeVisible();
    await expect(column.getByTestId("task-card")).toHaveCount(0);
    expect(requests).toHaveLength(0);
  });

  test("un título con solo espacios muestra el error y, al corregirlo, se crea", async ({
    page,
  }) => {
    const requests = trackCreateRequests(page);
    const column = page.getByTestId("board-column-todo");
    const form = await openTaskForm(column);
    const title = form.getByTestId("task-form-title");

    await title.fill("   ");
    await form.getByTestId("task-form-submit").click();

    await expect(form.getByTestId("task-form-error")).toHaveText(
      "El título es obligatorio.",
    );
    // El foco vuelve al título para corregirlo
    await expect(title).toBeFocused();
    await expect(column.getByTestId("task-card")).toHaveCount(0);
    expect(requests).toHaveLength(0);

    // Al corregir el título la tarea se crea en la misma columna
    await title.fill("Tarea con título");

    const createResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith("/work-items") &&
        response.request().method() === "POST",
    );

    await form.getByTestId("task-form-submit").click();

    expect((await createResponse).status()).toBe(201);
    await expect(form).toBeHidden();
    await expect(column.getByTestId("task-card")).toHaveCount(1);
    await expect(column.getByTestId("task-card-open")).toHaveText(
      "Tarea con título",
    );
    // El contador registra envíos reales: solo hubo el del título corregido
    expect(requests).toHaveLength(1);
  });
});
