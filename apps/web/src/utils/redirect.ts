const DEFAULT_TARGET = "/projects";

// Ruta a la que se vuelve después de iniciar sesión. Solo se aceptan rutas
// internas, para que ?redirect= no pueda llevar a otro sitio
export function getRedirectTarget(redirect: string | null) {
  if (
    !redirect ||
    !redirect.startsWith("/") ||
    redirect.startsWith("//") ||
    redirect.startsWith("/\\") ||
    redirect.startsWith("/login")
  ) {
    return DEFAULT_TARGET;
  }

  return redirect;
}
