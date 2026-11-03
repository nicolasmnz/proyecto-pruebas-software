import { request } from "./projects";
import type { BoardItem } from "./board";

export type SprintStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export const SPRINT_STATUS_LABELS: Record<SprintStatus, string> = {
  PLANNED: "Planificado",
  ACTIVE: "Activo",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

// Coincide con el límite de la API (VARCHAR(100))
export const MAX_SPRINT_NAME_LENGTH = 100;

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  // Fechas sin hora (AAAA-MM-DD)
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSprintData {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateSprintData extends CreateSprintData {
  status: SprintStatus;
}

function sprintsPath(projectId: string) {
  return `/projects/${encodeURIComponent(projectId)}/sprints`;
}

// La API devuelve los sprints del más reciente al más antiguo
export function getSprints(
  projectId: string,
  signal?: AbortSignal,
): Promise<Sprint[]> {
  return request(sprintsPath(projectId), "No fue posible cargar los sprints", {
    signal,
  });
}

export function createSprint(
  projectId: string,
  data: CreateSprintData,
): Promise<Sprint> {
  return request(sprintsPath(projectId), "No fue posible crear el sprint", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function updateSprint(
  projectId: string,
  sprintId: string,
  data: UpdateSprintData,
): Promise<Sprint> {
  return request(
    `${sprintsPath(projectId)}/${encodeURIComponent(sprintId)}`,
    "No fue posible guardar el sprint",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );
}

// Las tareas del sprint eliminado vuelven al backlog
export async function deleteSprint(
  projectId: string,
  sprintId: string,
): Promise<Sprint> {
  const body = await request<{ sprint: Sprint }>(
    `${sprintsPath(projectId)}/${encodeURIComponent(sprintId)}`,
    "No fue posible eliminar el sprint",
    { method: "DELETE" },
  );

  return body.sprint;
}

// sprintId null devuelve la tarea al backlog
export function assignWorkItemToSprint(
  projectId: string,
  itemId: string,
  sprintId: string | null,
): Promise<Pick<BoardItem, "id" | "sprint_id">> {
  return request(
    `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(itemId)}/sprint`,
    "No fue posible cambiar el sprint de la tarea",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sprintId }),
    },
  );
}
