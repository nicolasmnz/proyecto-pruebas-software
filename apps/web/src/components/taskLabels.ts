import type {
  WorkItemPriority,
  WorkItemStatus,
  WorkItemType,
} from "../api/board";

export const TYPE_LABELS: Record<WorkItemType, string> = {
  EPIC: "Épica",
  STORY: "Historia",
  TASK: "Tarea",
  BUG: "Error",
};

export const PRIORITY_LABELS: Record<WorkItemPriority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

// Sufijo de los data-testid por estado: IN_PROGRESS → in-progress
export function statusTestId(status: WorkItemStatus): string {
  return status.toLowerCase().replace("_", "-");
}
