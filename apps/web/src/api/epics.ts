import { request } from "./projects";
import type { BoardItem, WorkItemPriority, WorkItemStatus } from "./board";

export interface Epic {
  id: string;
  project_id: string;
  // Identificador correlativo dentro del proyecto, compartido con las tareas
  item_number: number;
  is_archived: boolean;
  type: "EPIC";
  title: string;
  description: string | null;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  estimate: number | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEpicData {
  title: string;
  description?: string;
  priority: WorkItemPriority;
  estimate?: number;
  dueDate?: string;
  createdBy: string;
}

export interface UpdateEpicData {
  title: string;
  description?: string;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  estimate?: number;
  dueDate?: string;
}

function epicsPath(projectId: string) {
  return `/projects/${encodeURIComponent(projectId)}/epics`;
}

// La API devuelve las épicas activas, de la más reciente a la más antigua
export function getEpics(
  projectId: string,
  signal?: AbortSignal,
): Promise<Epic[]> {
  return request(epicsPath(projectId), "No fue posible cargar las épicas", {
    signal,
  });
}

export function createEpic(
  projectId: string,
  data: CreateEpicData,
): Promise<Epic> {
  return request(epicsPath(projectId), "No fue posible crear la épica", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function updateEpic(
  projectId: string,
  epicId: string,
  data: UpdateEpicData,
): Promise<Epic> {
  return request(
    `${epicsPath(projectId)}/${encodeURIComponent(epicId)}`,
    "No fue posible guardar la épica",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );
}

// Las tareas de una épica archivada siguen en el tablero
export async function archiveEpic(
  projectId: string,
  epicId: string,
): Promise<Epic> {
  const body = await request<{ epic: Epic }>(
    `${epicsPath(projectId)}/${encodeURIComponent(epicId)}`,
    "No fue posible archivar la épica",
    { method: "DELETE" },
  );

  return body.epic;
}

// epicId null quita la tarea de su épica
export function assignWorkItemToEpic(
  projectId: string,
  itemId: string,
  epicId: string | null,
): Promise<Pick<BoardItem, "id" | "parent_id">> {
  return request(
    `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(itemId)}/epic`,
    "No fue posible cambiar la épica de la tarea",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ epicId }),
    },
  );
}
