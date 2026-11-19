import { expect, test, type Page } from "@playwright/test";

const SEED_PROJECT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

type NavigationErrors = {
  console: string[];
  javascript: string[];
  server: string[];
};

async function expectHeading(
  page: Page,
  heading: string | RegExp,
) {
  await expect(
    page.getByRole("heading", { name: heading }).first(),
  ).toBeVisible();
}

test("las vistas principales cargan sin errores de JavaScript ni respuestas 5xx", async ({
  page,
}, testInfo) => {
  const errors: NavigationErrors = {
    console: [],
    javascript: [],
    server: [],
  };

  // Registrar errores de consola
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.console.push(message.text());
    }
  });

  // Registrar errores JavaScript no controlados
  page.on("pageerror", (error) => {
    errors.javascript.push(error.message);
  });

  // Registrar respuestas HTTP 5xx
  page.on("response", (response) => {
    if (response.status() >= 500) {
      errors.server.push(
        `${response.status()} ${response.request().method()} ${response.url()}`,
      );
    }
  });

  await test.step("Proyectos", async () => {
    await page.goto("/projects");

    await expectHeading(page, "Proyectos");
  });

  await test.step("Detalle del proyecto", async () => {
    await page.goto(`/projects/${SEED_PROJECT_ID}`);

    await expect(
      page.getByRole("heading").first(),
    ).toBeVisible();
  });

  await test.step("Tablero", async () => {
    await page
      .getByRole("link", { name: /tablero/i })
      .click();

    await expectHeading(page, /tablero/i);
  });

  await test.step("Épicas", async () => {
    await page
      .getByRole("link", { name: /épicas/i })
      .click();

    await expectHeading(page, /épicas/i);
  });

  await test.step("Sprints", async () => {
    await page
      .getByRole("link", { name: /sprints/i })
      .click();

    await expectHeading(page, /sprints/i);
  });

  await test.step("Panel del proyecto", async () => {
    await page
      .getByRole("link", {
        name: /panel del proyecto/i,
      })
      .click();

    await expectHeading(
      page,
      /panel del proyecto/i,
    );
  });

  await test.step("Mis tareas", async () => {
    await page
      .getByRole("link", { name: /mis tareas/i })
      .click();

    await expectHeading(page, /mis tareas/i);
  });

  await test.step("Configuración", async () => {
    await page
      .getByRole("link", { name: /configuración/i })
      .click();

    await expectHeading(page, /configuración/i);
  });

  await test.step("Guardar registro de errores", async () => {
    await testInfo.attach("navigation-errors", {
      body: JSON.stringify(errors, null, 2),
      contentType: "application/json",
    });
  });

  await test.step("Validar que no hubo errores JavaScript", async () => {
    expect(
      errors.javascript,
      `Se detectaron errores JavaScript no controlados:\n${errors.javascript.join("\n")}`,
    ).toEqual([]);
  });

  await test.step("Validar que no hubo respuestas 5xx", async () => {
    expect(
      errors.server,
      `Se detectaron respuestas HTTP 5xx:\n${errors.server.join("\n")}`,
    ).toEqual([]);
  });
});