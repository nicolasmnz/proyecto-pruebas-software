import type { BoardItem } from "../api/board";
import { normalizeText } from "./format";

export interface BoardFilters {
  query: string;
  type: string;
  priority: string;
  // "" = todos, "none" = sin asignar, o el id del responsable
  assignee: string;
  // "" = todas, "none" = sin épica, o el id de la épica
  epic: string;
}

export const NO_ASSIGNEE = "none";
export const NO_EPIC = "none";

export const EMPTY_FILTERS: BoardFilters = {
  query: "",
  type: "",
  priority: "",
  assignee: "",
  epic: "",
};

export function hasActiveFilters(filters: BoardFilters): boolean {
  return Object.values(filters).some((value) => value.trim() !== "");
}

// Busca por título o por identificador (#12 o 12). La épica se recibe aparte
// porque una tarea puede heredarla de su historia (ver utils/hierarchy)
export function matchesFilters(
  item: BoardItem,
  filters: BoardFilters,
  epicId: string | null = item.parent_id,
) {
  const query = normalizeText(filters.query).replace(/^#/, "");

  if (query) {
    const matchesNumber =
      /^\d+$/.test(query) && Number(query) === item.item_number;

    if (!matchesNumber && !normalizeText(item.title).includes(query)) {
      return false;
    }
  }

  if (filters.type && item.type !== filters.type) {
    return false;
  }

  if (filters.priority && item.priority !== filters.priority) {
    return false;
  }

  if (filters.epic === NO_EPIC) {
    if (epicId !== null) {
      return false;
    }
  } else if (filters.epic && epicId !== filters.epic) {
    return false;
  }

  if (filters.assignee === NO_ASSIGNEE) {
    return item.assignee_id === null;
  }

  return !filters.assignee || item.assignee_id === filters.assignee;
}
