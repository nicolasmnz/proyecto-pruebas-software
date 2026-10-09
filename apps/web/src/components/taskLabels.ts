import type { WorkItemPriority, WorkItemType } from "../api/board";

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
