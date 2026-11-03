import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import AuthProvider from "./AuthProvider";
import { SESSION_KEY, useAuth } from "./authContext";
import type { User } from "../api/auth";

const ana: User = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Ana Pérez",
  email: "ana@pruebas.cl",
  is_active: true,
};

const fetchMock = vi.fn();

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

// Muestra la sesión y permite entrar o salir desde los tests
function SessionProbe() {
  const { user, login, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <p>{user ? `Sesión de ${user.name}` : "Sin sesión"}</p>
      <button
        type="button"
        onClick={() =>
          login("ana@pruebas.cl", "123456").catch((reason: Error) =>
            setError(reason.message),
          )
        }
      >
        Entrar
      </button>
      <button type="button" onClick={logout}>
        Salir
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

function renderProvider() {
  render(
    <AuthProvider>
      <SessionProbe />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("sin sesión guardada empieza sin usuario", () => {
    renderProvider();

    expect(screen.getByText("Sin sesión")).toBeInTheDocument();
  });

  test("al iniciar sesión envía las credenciales y guarda el usuario", async () => {
    const user = userEvent.setup();

    respond(200, { user: ana });
    renderProvider();

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Sesión de Ana Pérez")).toBeInTheDocument();

    const [url, init] = fetchMock.mock.calls[0];

    expect(url).toMatch(/\/auth\/login$/);
    expect(init).toMatchObject({ method: "POST" });
    expect(JSON.parse(init.body)).toEqual({
      email: "ana@pruebas.cl",
      password: "123456",
    });
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!)).toEqual(ana);
  });

  test("con credenciales incorrectas no guarda la sesión y entrega el mensaje de la API", async () => {
    const user = userEvent.setup();

    respond(401, { message: "Correo o contraseña incorrectos" });
    renderProvider();

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Correo o contraseña incorrectos",
    );
    expect(screen.getByText("Sin sesión")).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  test("recupera la sesión guardada al cargar", () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(ana));

    renderProvider();

    expect(screen.getByText("Sesión de Ana Pérez")).toBeInTheDocument();
  });

  test("ignora una sesión guardada que no es válida", () => {
    localStorage.setItem(SESSION_KEY, "{no es json");

    renderProvider();

    expect(screen.getByText("Sin sesión")).toBeInTheDocument();
  });

  test("al cerrar sesión borra el usuario guardado", async () => {
    const user = userEvent.setup();

    localStorage.setItem(SESSION_KEY, JSON.stringify(ana));
    renderProvider();

    await user.click(screen.getByRole("button", { name: "Salir" }));

    expect(screen.getByText("Sin sesión")).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
