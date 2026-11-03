import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, test } from "vitest";

import RequireAuth from "./RequireAuth";
import type { User } from "../api/auth";
import { AuthContext } from "../context/authContext";

const ana: User = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Ana Pérez",
  email: "ana@pruebas.cl",
  is_active: true,
};

function LoginProbe() {
  const location = useLocation();

  return <h1>{`Login ${location.search}`}</h1>;
}

function renderAt(initialEntry: string, user: User | null) {
  render(
    <AuthContext.Provider
      value={{ user, login: async () => ana, logout: () => {} }}
    >
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route
            path="*"
            element={
              <RequireAuth>
                <h1>Página interna</h1>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("RequireAuth", () => {
  test("con sesión muestra la página", () => {
    renderAt("/projects", ana);

    expect(
      screen.getByRole("heading", { name: "Página interna" }),
    ).toBeInTheDocument();
  });

  test("sin sesión redirige al login recordando la página pedida", () => {
    renderAt("/projects/abc/board?q=api", null);

    expect(
      screen.getByRole("heading", {
        name: `Login ?redirect=${encodeURIComponent("/projects/abc/board?q=api")}`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Página interna" }),
    ).not.toBeInTheDocument();
  });

  test("desde la raíz redirige al login sin redirect", () => {
    renderAt("/", null);

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
  });
});
