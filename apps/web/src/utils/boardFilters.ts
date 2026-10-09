import type { BoardItem } from "../api/board";
import { normalizeText } from "./format";

export interface BoardFilters {
  query: string;
  type: string;
  priority: string;
  // "" = todos, "none" = sin asignar, o el id del responsable
  assignee: string;
}

export const NO_ASSIGNEE = "none";

export const EMPTY_FILTERS: BoardFilters = {
  query: "",
  type: "",
  priority: "",
  assignee: "",
};

export function hasActiveFilters(filters: BoardFilters): boolean {
  return Object.values(filters).some((value) => value.trim() !== "");
}

// Busca por título o por identificador (#12 o 12)
export function matchesFilters(item: BoardItem, filters: BoardFilters) {
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

  if (filters.assignee === NO_ASSIGNEE) {
    return item.assignee_id === null;
  }

  return !filters.assignee || item.assignee_id === filters.assignee;
}
