import { expect, test as setup } from "@playwright/test";

// Sesión que usan los demás specs: inicia sesión una vez con Ana (seed)
// y guarda el estado del navegador, incluido localStorage
const AUTH_FILE = "playwright/.auth/user.json";

setup("iniciar sesión", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Correo").fill("ana@pruebas.cl");
  await page.getByLabel("Contraseña").fill("123456");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page).toHaveURL("/projects");

  await page.context().storageState({ path: AUTH_FILE });
});
