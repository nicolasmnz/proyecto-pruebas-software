import type { ReactNode } from "react";

import type { User } from "../api/auth";
import { AuthContext } from "../context/authContext";

// Usuario conectado en los tests; distinto del usuario de ejemplo del seed
export const TEST_USER: User = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Ana Pérez",
  email: "ana@pruebas.cl",
  is_active: true,
};

export function withSession(ui: ReactNode, user: User = TEST_USER) {
  return (
    <AuthContext.Provider
      value={{ user, login: async () => user, logout() {} }}
    >
      {ui}
    </AuthContext.Provider>
  );
}
