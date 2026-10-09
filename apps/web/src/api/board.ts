import { request } from "./projects";
import type { Project } from "./projects";

export type WorkItemStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type WorkItemType = "EPIC" | "STORY" | "TASK" | "BUG";
export type WorkItemPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const STATUS_LABELS: Record<WorkItemStatus, string> = {
  TODO: "Por hacer",
  IN_PROGRESS: "En progreso",
  DONE: "Hecho",
};

export interface BoardItem {
  id: string;
  // Identificador correlativo dentro del proyecto (#1, #2, ...)
  item_number: number;
  is_archived: boolean;
  type: WorkItemType;
  title: string;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  estimate: number | null;
  position: number;
  due_date: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
}

export interface BoardColumn {
  status: WorkItemStatus;
  items: BoardItem[];
}

export interface BoardMember {
  id: string;
  name: string;
}

// Límite de tareas por columna; ausente o null = sin límite
export type WipLimits = Partial<Record<WorkItemStatus, number | null>>;

export interface Board {
  project: Project;
  columns: BoardColumn[];
  // Tareas terminadas que se sacaron del tablero
  archived: BoardItem[];
  // Quienes pueden ser responsables de una tarea
  members: BoardMember[];
  wip_limits: WipLimits;
}

export function getBoard(
  projectId: string,
  signal?: AbortSignal,
): Promise<Board> {
  return request(
    `/projects/${encodeURIComponent(projectId)}/board`,
    "No fue posible cargar el tablero",
    { signal },
  );
}

export interface CreateWorkItemData {
  title: string;
  description?: string;
  type: Exclude<WorkItemType, "EPIC">;
  priority: WorkItemPriority;
  status: WorkItemStatus;
  estimate?: number;
  createdBy: string;
}

// Coincide con el límite de la API (VARCHAR(200))
export const MAX_WORK_ITEM_TITLE_LENGTH = 200;

export function createWorkItem(
  projectId: string,
  data: CreateWorkItemData,
): Promise<BoardItem> {
  return request(
    `/projects/${encodeURIComponent(projectId)}/work-items`,
    "No fue posible crear la tarea",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );
}

// Con `index` la tarea queda en esa posición de la columna de destino
// (0 = primera); sin él, al final
export function moveWorkItem(
  projectId: string,
  itemId: string,
  status: WorkItemStatus,
  index?: number,
): Promise<BoardItem> {
  return request(
    `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(itemId)}`,
    "No fue posible mover la tarea",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, index }),
    },
  );
}

// Archiva todas las tareas de Hecho; devuelve las que se archivaron
export async function archiveDoneItems(
  projectId: string,
): Promise<BoardItem[]> {
  const body = await request<{ archived: BoardItem[] }>(
    `/projects/${encodeURIComponent(projectId)}/work-items/archive-done`,
    "No fue posible archivar las tareas",
    { method: "PATCH" },
  );

  return body.archived;
}

// Coincide con el límite de la API
export const MAX_WIP_LIMIT = 999;

export function saveWipLimits(
  projectId: string,
  limits: WipLimits,
): Promise<WipLimits> {
  return request(
    `/projects/${encodeURIComponent(projectId)}/wip-limits`,
    "No fue posible guardar los límites",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(limits),
    },
  );
}

function setArchived(
  projectId: string,
  itemId: string,
  action: "archive" | "restore",
  fallbackMessage: string,
): Promise<BoardItem> {
  return request(
    `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(itemId)}/${action}`,
    fallbackMessage,
    { method: "PATCH" },
  );
}

export function archiveWorkItem(
  projectId: string,
  itemId: string,
): Promise<BoardItem> {
  return setArchived(
    projectId,
    itemId,
    "archive",
    "No fue posible archivar la tarea",
  );
}

export function restoreWorkItem(
  projectId: string,
  itemId: string,
): Promise<BoardItem> {
  return setArchived(
    projectId,
    itemId,
    "restore",
    "No fue posible restaurar la tarea",
  );
}

export interface WorkItemDetail extends BoardItem {
  description: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateWorkItemData {
  title: string;
  description?: string;
  type: Exclude<WorkItemType, "EPIC">;
  priority: WorkItemPriority;
  estimate?: number;
  assigneeId?: string;
  dueDate?: string;
}

export function getWorkItem(
  projectId: string,
  itemId: string,
  signal?: AbortSignal,
): Promise<WorkItemDetail> {
  return request(
    `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(itemId)}`,
    "No fue posible cargar la tarea",
    { signal },
  );
}

export function updateWorkItem(
  projectId: string,
  itemId: string,
  data: UpdateWorkItemData,
): Promise<WorkItemDetail> {
  return request(
    `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(itemId)}`,
    "No fue posible guardar la tarea",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );
}

export async function deleteWorkItem(
  projectId: string,
  itemId: string,
): Promise<void> {
  await request(
    `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(itemId)}`,
    "No fue posible eliminar la tarea",
    { method: "DELETE" },
  );
}
