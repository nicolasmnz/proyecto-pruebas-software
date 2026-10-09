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

export interface Board {
  project: Project;
  columns: BoardColumn[];
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

export function moveWorkItem(
  projectId: string,
  itemId: string,
  status: WorkItemStatus,
): Promise<BoardItem> {
  return request(
    `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(itemId)}`,
    "No fue posible mover la tarea",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    },
  );
}
