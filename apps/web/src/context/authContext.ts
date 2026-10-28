import { createContext, useContext } from "react";

import type { User } from "../api/auth";

// Clave de localStorage donde se guarda el usuario que inició sesión
export const SESSION_KEY = "mira.session";

export interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

// Sin provider no hay sesión (p. ej. en tests que no la necesitan)
export const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: async () => {
    throw new Error("No hay un AuthProvider");
  },
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Usuario de la sesión en las páginas internas, que RequireAuth protege
export function useCurrentUser() {
  const { user } = useAuth();

  if (!user) {
    throw new Error("Esta página requiere una sesión iniciada");
  }

  return user;
}
