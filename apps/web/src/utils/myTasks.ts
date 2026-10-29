import type { AssignedItem } from "../api/myTasks";

export interface ProjectTasks {
  projectId: string;
  projectName: string;
  items: AssignedItem[];
}

// Fecha local de hoy en formato AAAA-MM-DD, el mismo de due_date
export function getLocalToday(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

// Vencida: su fecha límite ya pasó y todavía no está terminada
export function isOverdue(item: AssignedItem, today: string): boolean {
  return (
    item.status !== "DONE" && item.due_date !== null && item.due_date < today
  );
}

export function isPending(item: AssignedItem): boolean {
  return item.status !== "DONE";
}

// Agrupa por proyecto conservando el orden por fecha límite: el primer
// proyecto es el que tiene la tarea más urgente
export function groupByProject(items: AssignedItem[]): ProjectTasks[] {
  const groups = new Map<string, ProjectTasks>();

  for (const item of items) {
    const group = groups.get(item.project_id);

    if (group) {
      group.items.push(item);
    } else {
      groups.set(item.project_id, {
        projectId: item.project_id,
        projectName: item.project_name,
        items: [item],
      });
    }
  }

  return [...groups.values()];
}
