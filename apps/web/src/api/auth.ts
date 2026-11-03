import { request } from "./projects";

export interface User {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
}

// La API responde 401 con credenciales incorrectas y 403 si la cuenta está
// desactivada; en ambos casos el mensaje llega en el ApiError
export async function login(email: string, password: string): Promise<User> {
  const body = await request<{ user: User }>(
    "/auth/login",
    "No fue posible iniciar sesión",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    },
  );

  return body.user;
}
