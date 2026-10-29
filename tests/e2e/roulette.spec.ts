import { expect, test } from "@playwright/test";

const API_URL = "http://localhost:3000/api";
// Proyecto de ejemplo (seed): Ana (OWNER), Carlos (ADMIN), María (MEMBER) y
// Diego (VIEWER, de solo lectura)
const SEED_PROJECT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ANA_ID = "11111111-1111-1111-1111-111111111111";

test.describe("ruleta de asignación", () => {
  let item: { id: string; title: string };

  // Sin animación, para no esperar el giro
  test.use({ reducedMotion: "reduce" });

  test.beforeEach(async ({ page, request }) => {
    // El azar queda fijo en 0: sale el primer integrante de la ruleta (Ana)
    await page.addInitScript(() => {
      Math.random = () => 0;
    });

    const title = `Tarea para la ruleta ${Date.now()}`;
    const created = await request.post(
      `${API_URL}/projects/${SEED_PROJECT_ID}/work-items`,
      { data: { title, estimate: 2, createdBy: ANA_ID } },
    );

    expect(created.status()).toBe(201);

    item = await created.json();
  });

  test.afterEach(async ({ request }) => {
    await request.delete(
      `${API_URL}/projects/${SEED_PROJECT_ID}/work-items/${item.id}`,
    );
  });

  test("usuario gira la ruleta en una tarea sin responsable y se la asigna al elegido", async ({
    page,
    request,
  }) => {
    await page.goto(`/projects/${SEED_PROJECT_ID}/board?task=${item.id}`);

    const dialog = page.getByRole("dialog", { name: item.title });

    await dialog.getByRole("button", { name: "Girar ruleta" }).click();

    const roulette = dialog.getByRole("region", {
      name: "Ruleta de asignación",
    });
    const legend = roulette.getByRole("list", {
      name: "Probabilidad de cada integrante",
    });

    // Participan quienes pueden recibir tareas: Diego (VIEWER) no
    await expect(legend.getByRole("listitem")).toHaveText([
      /Ana Torres\s*\d+ %/,
      /Carlos Muñoz\s*\d+ %/,
      /María González\s*\d+ %/,
    ]);
    await expect(legend).not.toContainText("Diego Soto");

    // Cancelar no asigna
    await roulette.getByRole("button", { name: "Cancelar" }).click();
    await expect(roulette).toBeHidden();

    await dialog.getByRole("button", { name: "Girar ruleta" }).click();
    await roulette.getByRole("button", { name: "Girar", exact: true }).click();

    await expect(roulette.getByRole("status")).toHaveText(
      "La ruleta eligió a Ana Torres.",
    );

    await roulette
      .getByRole("button", { name: "Asignar a Ana Torres" })
      .click();

    await expect(roulette).toBeHidden();
    await expect(dialog.getByText("Responsable").locator("+ dd")).toHaveText(
      "Ana Torres",
    );
    await expect(
      dialog.getByRole("button", { name: "Girar ruleta" }),
    ).toHaveCount(0);

    // La asignación quedó guardada
    const saved = await request.get(
      `${API_URL}/projects/${SEED_PROJECT_ID}/work-items/${item.id}`,
    );

    expect((await saved.json()).assignee_id).toBe(ANA_ID);
  });
});
