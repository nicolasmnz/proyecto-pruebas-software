import { request } from "./projects";
import type { Project } from "./projects";

export type WorkItemStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type WorkItemType = "EPIC" | "STORY" | "TASK" | "BUG";
export type WorkItemPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface BoardItem {
  id: string;
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
