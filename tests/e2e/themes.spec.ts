import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Fondos de la página según el tema (--color-bg en themes.css)
const LIGHT_BG = "rgb(255, 255, 255)";
const DARK_BG = "rgb(29, 33, 37)";
const CONTRAST_BG = "rgb(255, 255, 255)";
const CONTRAST_DARK_BG = "rgb(0, 0, 0)";

function html(page: Page) {
  return page.locator("html");
}

async function bodyBackground(page: Page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

test.describe("temas", () => {
  test.use({ colorScheme: "light" });

  test("usuario elige el tema oscuro, se aplica en toda la app y se mantiene al recargar", async ({
    page,
  }) => {
    await page.goto("/projects");
    await page.getByRole("link", { name: "Configuración" }).click();

    await expect(page).toHaveURL("/settings");
    await expect(
      page.getByRole("radio", { name: /Según el sistema/ }),
    ).toBeChecked();
    expect(await bodyBackground(page)).toBe(LIGHT_BG);

    await page.getByRole("radio", { name: /^Oscuro/ }).check();

    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    expect(await bodyBackground(page)).toBe(DARK_BG);

    await page.reload();

    await expect(page.getByRole("radio", { name: /^Oscuro/ })).toBeChecked();
    await expect(html(page)).toHaveAttribute("data-theme", "dark");

    // Otras páginas, y el login, también usan el tema
    await page.goto("/projects");
    expect(await bodyBackground(page)).toBe(DARK_BG);

    await page.getByRole("button", { name: "Cerrar sesión" }).click();

    await expect(page).toHaveURL("/login");
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
  });

  test("«Según el sistema» cambia junto con el sistema operativo", async ({
    page,
  }) => {
    await page.goto("/settings");

    await expect(html(page)).toHaveAttribute("data-theme", "light");

    await page.emulateMedia({ colorScheme: "dark" });

    await expect(html(page)).toHaveAttribute("data-theme", "dark");

    await page.emulateMedia({ colorScheme: "light" });

    await expect(html(page)).toHaveAttribute("data-theme", "light");
  });

  test("el acento cambia los botones principales y alto contraste usa el suyo", async ({
    page,
  }) => {
    await page.goto("/settings");

    await page.getByRole("radio", { name: "Verde" }).check();

    await expect(html(page)).toHaveAttribute("data-accent", "green");

    await page.goto("/projects");

    // Crear proyecto es un botón principal: toma el acento verde
    await expect(page.getByRole("link", { name: "Crear proyecto" })).toHaveCSS(
      "background-color",
      "rgb(26, 122, 80)",
    );

    await page.goto("/settings");
    await page.getByRole("checkbox", { name: /Alto contraste/ }).check();

    await expect(html(page)).toHaveAttribute("data-theme", "contrast");
    await expect(html(page)).not.toHaveAttribute("data-accent");
    await expect(
      page.getByRole("group", { name: "Color de acento" }),
    ).toHaveAccessibleDescription(
      "El alto contraste usa su propio color de acento.",
    );
    // El fieldset deshabilitado deshabilita sus radios; el acento elegido se
    // conserva para cuando se vuelva a otro tema
    await expect(page.getByRole("radio", { name: "Verde" })).toBeDisabled();
    await expect(page.getByRole("radio", { name: "Verde" })).toBeChecked();
  });

  test("el alto contraste pasa a blanco sobre negro cuando el sistema está en modo oscuro", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page.getByRole("checkbox", { name: /Alto contraste/ }).check();

    await expect(html(page)).toHaveAttribute("data-theme", "contrast");
    expect(await bodyBackground(page)).toBe(CONTRAST_BG);

    // De noche: el sistema pasa a modo oscuro y «Según el sistema» lo sigue
    await page.emulateMedia({ colorScheme: "dark" });

    await expect(html(page)).toHaveAttribute("data-theme", "contrast-dark");
    expect(await bodyBackground(page)).toBe(CONTRAST_DARK_BG);

    await page.goto("/projects");

    await expect(html(page)).toHaveAttribute("data-theme", "contrast-dark");
    expect(await bodyBackground(page)).toBe(CONTRAST_DARK_BG);

    await page.emulateMedia({ colorScheme: "light" });

    await expect(html(page)).toHaveAttribute("data-theme", "contrast");
  });
});
