import { request } from "./projects";

export type ProjectRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export const ROLE_LABELS: Record<ProjectRole, string> = {
  OWNER: "Dueño",
  ADMIN: "Jefe de proyecto",
  MEMBER: "Integrante",
  VIEWER: "Solo lectura",
};

export interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: ProjectRole;
}

// Quienes pueden ver el panel del proyecto
export function canManageProject(role: ProjectRole | null | undefined) {
  return role === "OWNER" || role === "ADMIN";
}

// Integrantes activos con su rol; quien creó el proyecto es su dueño
export function getProjectMembers(
  projectId: string,
  signal?: AbortSignal,
): Promise<ProjectMember[]> {
  return request(
    `/projects/${encodeURIComponent(projectId)}/members`,
    "No fue posible cargar los integrantes del proyecto",
    { signal },
  );
}
