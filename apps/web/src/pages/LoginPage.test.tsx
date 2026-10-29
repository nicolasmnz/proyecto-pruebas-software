import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import LoginPage from "./LoginPage";
import { login } from "../api/auth";
import type { User } from "../api/auth";
import { ApiError } from "../api/projects";
import AuthProvider from "../context/AuthProvider";
import { SESSION_KEY } from "../context/authContext";

vi.mock("../api/auth", () => ({ login: vi.fn() }));

const mockedLogin = vi.mocked(login);

const ana: User = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Ana Pérez",
  email: "ana@pruebas.cl",
  is_active: true,
};

// Muestra la ruta a la que se llegó después del login
function Destination() {
  const location = useLocation();

  return <h1>{`Destino ${location.pathname}${location.search}`}</h1>;
}

function renderPage(initialEntry = "/login") {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Destination />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();

  if (email) {
    await user.type(screen.getByLabelText("Correo"), email);
  }

  if (password) {
    await user.type(screen.getByLabelText("Contraseña"), password);
  }

  await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test("muestra el formulario de inicio de sesión", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Iniciar sesión" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Correo")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute(
      "type",
      "password",
    );
  });

  test("con los campos vacíos indica qué falta sin llamar a la API", async () => {
    renderPage();

    await fillAndSubmit("", "");

    expect(screen.getByLabelText("Correo")).toHaveAccessibleDescription(
      "Ingresa tu correo.",
    );
    expect(screen.getByLabelText("Contraseña")).toHaveAccessibleDescription(
      "Ingresa tu contraseña.",
    );
    expect(screen.getByLabelText("Correo")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Correo")).toHaveFocus();
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  test("si solo falta la contraseña, lo indica y la enfoca", async () => {
    renderPage();

    await fillAndSubmit("ana@pruebas.cl", "");

    expect(screen.getByLabelText("Contraseña")).toHaveAccessibleDescription(
      "Ingresa tu contraseña.",
    );
    expect(screen.getByLabelText("Correo")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Contraseña")).toHaveFocus();
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  test("con credenciales incorrectas muestra el mensaje y sigue en el login", async () => {
    mockedLogin.mockRejectedValue(
      new ApiError("Correo o contraseña incorrectos", 401),
    );
    renderPage();

    await fillAndSubmit("ana@pruebas.cl", "mala");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Correo o contraseña incorrectos",
    );
    expect(
      screen.getByRole("heading", { name: "Iniciar sesión" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeEnabled();
  });

  test("con la cuenta desactivada muestra Usuario desactivado", async () => {
    mockedLogin.mockRejectedValue(new ApiError("Usuario desactivado", 403));
    renderPage();

    await fillAndSubmit("sofia@pruebas.cl", "123456");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Usuario desactivado",
    );
  });

  test("envía el correo sin espacios y entra al listado de proyectos", async () => {
    mockedLogin.mockResolvedValue(ana);
    renderPage();

    await fillAndSubmit("  ana@pruebas.cl ", "123456");

    expect(
      await screen.findByRole("heading", { name: "Destino /projects" }),
    ).toBeInTheDocument();
    expect(mockedLogin).toHaveBeenCalledWith("ana@pruebas.cl", "123456");
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!)).toEqual(ana);
  });

  test("al entrar vuelve a la página que se había pedido", async () => {
    mockedLogin.mockResolvedValue(ana);
    renderPage(
      `/login?redirect=${encodeURIComponent("/projects/abc/board?q=api")}`,
    );

    await fillAndSubmit("ana@pruebas.cl", "123456");

    expect(
      await screen.findByRole("heading", {
        name: "Destino /projects/abc/board?q=api",
      }),
    ).toBeInTheDocument();
  });

  test("no sigue un redirect a otro sitio", async () => {
    mockedLogin.mockResolvedValue(ana);
    renderPage("/login?redirect=//otro.sitio");

    await fillAndSubmit("ana@pruebas.cl", "123456");

    expect(
      await screen.findByRole("heading", { name: "Destino /projects" }),
    ).toBeInTheDocument();
  });

  test("desactiva el botón mientras se inicia sesión", async () => {
    let resolveLogin: (user: User) => void = () => {};

    mockedLogin.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );
    renderPage();

    await fillAndSubmit("ana@pruebas.cl", "123456");

    expect(
      screen.getByRole("button", { name: "Iniciando sesión..." }),
    ).toBeDisabled();

    resolveLogin(ana);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Destino /projects" }),
      ).toBeInTheDocument(),
    );
  });

  test("con la sesión ya iniciada no muestra el formulario", () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(ana));

    renderPage();

    expect(
      screen.getByRole("heading", { name: "Destino /projects" }),
    ).toBeInTheDocument();
  });
});
