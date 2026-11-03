import { useEffect, useState } from "react";

import { getProjectMembers } from "../api/members";
import type { ProjectRole } from "../api/members";
import { useAuth } from "../context/authContext";

// Rol del usuario conectado en el proyecto; null mientras carga, si no
// participa o si no se pudo consultar
export function useProjectRole(projectId: string): ProjectRole | null {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [result, setResult] = useState<{
    key: string;
    role: ProjectRole | null;
  } | null>(null);

  const requestKey = `${projectId}:${userId}`;

  useEffect(() => {
    if (!userId) {
      return;
    }

    const controller = new AbortController();

    getProjectMembers(projectId, controller.signal)
      .then((members) =>
        setResult({
          key: requestKey,
          role: members.find(({ id }) => id === userId)?.role ?? null,
        }),
      )
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult({ key: requestKey, role: null });
        }
      });

    return () => controller.abort();
  }, [projectId, userId, requestKey]);

  return result?.key === requestKey ? result.role : null;
}
