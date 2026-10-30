import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { login as loginRequest } from "../api/auth";
import type { User } from "../api/auth";
import { AuthContext, SESSION_KEY } from "./authContext";

function isUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const user = value as Record<string, unknown>;

  return (
    typeof user.id === "string" &&
    typeof user.name === "string" &&
    typeof user.email === "string"
  );
}

// localStorage puede fallar (modo privado, almacenamiento bloqueado) o tener
// datos de otra versión: en ese caso se empieza sin sesión
function readSession(): User | null {
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");

    return isUser(stored) ? stored : null;
  } catch {
    return null;
  }
}

function writeSession(user: User | null) {
  try {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Sin almacenamiento la sesión dura hasta recargar la página
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(readSession);

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await loginRequest(email, password);

    writeSession(loggedIn);
    setUser(loggedIn);

    return loggedIn;
  }, []);

  const logout = useCallback(() => {
    writeSession(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
