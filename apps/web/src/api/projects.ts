export interface CreateProjectData {
  name: string;
  description?: string;
  createdBy: string;
}

export interface UpdateProjectData {
  name: string;
  description?: string;
}

// Coincide con el límite de la API (VARCHAR(150))
export const MAX_PROJECT_NAME_LENGTH = 150;

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_URL = import.meta.env.VITE_API_URL;

export async function request<T>(
  path: string,
  fallbackMessage: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);

  if (!response.ok) {
    // El cuerpo de error puede venir vacío o no ser JSON
    const body = await response.json().catch(() => null);

    throw new ApiError(body?.message ?? fallbackMessage, response.status);
  }

  return response.json();
}

export function getProjects(signal?: AbortSignal): Promise<Project[]> {
  return request("/projects", "No fue posible cargar los proyectos", {
    signal,
  });
}

export function getArchivedProjects(signal?: AbortSignal): Promise<Project[]> {
  return request(
    "/projects?archived=true",
    "No fue posible cargar los proyectos archivados",
    { signal },
  );
}

export function getProject(id: string, signal?: AbortSignal): Promise<Project> {
  return request(
    `/projects/${encodeURIComponent(id)}`,
    "No fue posible cargar el proyecto",
    { signal },
  );
}

export function createProject(data: CreateProjectData): Promise<Project> {
  return request("/projects", "No fue posible crear el proyecto", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function updateProject(
  id: string,
  data: UpdateProjectData,
): Promise<Project> {
  return request(
    `/projects/${encodeURIComponent(id)}`,
    "No fue posible actualizar el proyecto",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );
}

export async function archiveProject(id: string): Promise<Project> {
  const body = await request<{ project: Project }>(
    `/projects/${encodeURIComponent(id)}`,
    "No fue posible archivar el proyecto",
    { method: "DELETE" },
  );

  return body.project;
}

export function restoreProject(id: string): Promise<Project> {
  return request(
    `/projects/${encodeURIComponent(id)}/restore`,
    "No fue posible restaurar el proyecto",
    { method: "PATCH" },
  );
}
