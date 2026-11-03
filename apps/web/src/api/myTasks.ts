import { request } from "./projects";
import type { BoardItem } from "./board";

// Tarea asignada al usuario, con el proyecto al que pertenece
export interface AssignedItem extends BoardItem {
  project_id: string;
  project_name: string;
}

// La API las entrega de la fecha límite más cercana a la más lejana, sin
// épicas, archivadas ni tareas de proyectos archivados
export function getAssignedItems(
  userId: string,
  signal?: AbortSignal,
): Promise<AssignedItem[]> {
  return request(
    `/users/${encodeURIComponent(userId)}/work-items`,
    "No fue posible cargar tus tareas",
    { signal },
  );
}
