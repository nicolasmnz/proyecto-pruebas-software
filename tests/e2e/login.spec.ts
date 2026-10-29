import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const API_URL = "http://localhost:3000/api";
const SEED_PROJECT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

// Estos tests parten sin la sesión que guarda auth.setup.ts
test.use({ storageState: { cookies: [], origins: [] } });

// El usuario conectado se muestra al pie de la barra lateral
function sessionUser(page: Page, name: string) {
  return page.getByRole("complementary").getByText(name);
}

async function login(page: Page, email: string, password: string) {
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

test("usuario sin sesión es llevado al login y vuelve a la página que pidió", async ({
  page,
}) => {
  await page.goto(`/projects/${SEED_PROJECT_ID}/board`);

  await expect(page).toHaveURL(
    `/login?redirect=${encodeURIComponent(`/projects/${SEED_PROJECT_ID}/board`)}`,
  );

  // Campos vacíos: se indica qué falta
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page.getByText("Ingresa tu correo.")).toBeVisible();
  await expect(page.getByText("Ingresa tu contraseña.")).toBeVisible();

  // Contraseña incorrecta: sigue en el login
  await login(page, "ana@pruebas.cl", "incorrecta");

  await expect(page.getByRole("alert")).toHaveText(
    "Correo o contraseña incorrectos",
  );
  await expect(page).toHaveURL(/\/login/);

  // Correcta: vuelve al tablero y muestra el nombre
  await page.getByLabel("Contraseña").fill("123456");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page).toHaveURL(`/projects/${SEED_PROJECT_ID}/board`);
  await expect(sessionUser(page, "Ana Torres")).toBeVisible();

  // La sesión sigue al recargar
  await page.reload();

  await expect(page).toHaveURL(`/projects/${SEED_PROJECT_ID}/board`);
  await expect(sessionUser(page, "Ana Torres")).toBeVisible();
});

test("una cuenta desactivada no puede entrar", async ({ page }) => {
  await page.goto("/login");

  await login(page, "sofia@pruebas.cl", "123456");

  await expect(page.getByRole("alert")).toHaveText("Usuario desactivado");
  await expect(page).toHaveURL("/login");
});

test("al cerrar sesión no se puede volver a las páginas internas", async ({
  page,
}) => {
  await page.goto("/login");
  await login(page, "ana@pruebas.cl", "123456");

  await expect(page).toHaveURL("/projects");

  await page.getByRole("button", { name: "Cerrar sesión" }).click();

  await expect(page).toHaveURL("/login");

  await page.goto("/projects");

  await expect(page).toHaveURL(
    `/login?redirect=${encodeURIComponent("/projects")}`,
  );
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión" }),
  ).toBeVisible();
});

test("lo que se crea queda a nombre del usuario conectado", async ({
  page,
  request,
}) => {
  const projectName = `Proyecto de Carlos ${Date.now()}`;

  await page.goto("/login");
  await login(page, "carlos@pruebas.cl", "123456");

  await expect(sessionUser(page, "Carlos Muñoz")).toBeVisible();

  await page.goto("/projects/new");
  await page.getByLabel(/Nombre/).fill(projectName);

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/projects") &&
      response.request().method() === "POST",
  );

  await page.getByRole("button", { name: "Guardar" }).click();

  const created = await (await createResponsePromise).json();

  try {
    const response = await request.get(`${API_URL}/projects/${created.id}`);

    // Carlos en el seed, no el usuario de ejemplo fijo (Ana)
    expect((await response.json()).created_by).toBe(
      "22222222-2222-2222-2222-222222222222",
    );
  } finally {
    await request.delete(`${API_URL}/projects/${created.id}`);
  }
});
