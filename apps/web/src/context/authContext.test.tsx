import { renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { useCurrentUser } from "./authContext";
import { TEST_USER, withSession } from "../test/session";

describe("useCurrentUser", () => {
  test("entrega el usuario de la sesión", () => {
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: ({ children }) => withSession(children),
    });

    expect(result.current).toEqual(TEST_USER);
  });

  test("sin sesión falla en vez de crear a nombre de nadie", () => {
    // React informa el error por consola antes de lanzarlo
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => renderHook(() => useCurrentUser())).toThrow(
      "Esta página requiere una sesión iniciada",
    );

    consoleError.mockRestore();
  });
});
