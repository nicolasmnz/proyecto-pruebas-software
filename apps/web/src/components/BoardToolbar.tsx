import { useId } from "react";
import { Gauge, Search, X } from "lucide-react";

import type { BoardMember } from "../api/board";
import { NO_ASSIGNEE, hasActiveFilters } from "../utils/boardFilters";
import type { BoardFilters } from "../utils/boardFilters";

import "./BoardToolbar.css";

interface BoardToolbarProps {
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
  members: BoardMember[];
  // Tareas visibles y totales en las columnas
  shown: number;
  total: number;
  // Sin esta función no se pueden cambiar los límites (proyecto archivado)
  onEditLimits?: () => void;
}

function BoardToolbar({
  filters,
  onChange,
  members,
  shown,
  total,
  onEditLimits,
}: BoardToolbarProps) {
  const searchId = useId();
  const typeId = useId();
  const priorityId = useId();
  const assigneeId = useId();
  const isFiltering = hasActiveFilters(filters);

  function set(change: Partial<BoardFilters>) {
    onChange({ ...filters, ...change });
  }

  return (
    <div className="board-toolbar" role="search" aria-label="Filtrar tareas">
      <div className="board-toolbar-field board-toolbar-search">
        <label htmlFor={searchId} className="sr-only">
          Buscar tareas
        </label>
        <Search size={16} aria-hidden="true" />
        <input
          id={searchId}
          type="search"
          placeholder="Buscar por título o #número"
          value={filters.query}
          onChange={(event) => set({ query: event.target.value })}
        />
      </div>

      <div className="board-toolbar-field">
        <label htmlFor={typeId}>Tipo</label>
        <select
          id={typeId}
          value={filters.type}
          onChange={(event) => set({ type: event.target.value })}
        >
          <option value="">Todos</option>
          <option value="TASK">Tarea</option>
          <option value="STORY">Historia</option>
          <option value="BUG">Error</option>
        </select>
      </div>

      <div className="board-toolbar-field">
        <label htmlFor={priorityId}>Prioridad</label>
        <select
          id={priorityId}
          value={filters.priority}
          onChange={(event) => set({ priority: event.target.value })}
        >
          <option value="">Todas</option>
          <option value="LOW">Baja</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
          <option value="CRITICAL">Crítica</option>
        </select>
      </div>

      <div className="board-toolbar-field">
        <label htmlFor={assigneeId}>Responsable</label>
        <select
          id={assigneeId}
          value={filters.assignee}
          onChange={(event) => set({ assignee: event.target.value })}
        >
          <option value="">Todos</option>
          <option value={NO_ASSIGNEE}>Sin asignar</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      {isFiltering && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            onChange({ query: "", type: "", priority: "", assignee: "" })
          }
        >
          <X size={16} aria-hidden="true" />
          Limpiar filtros
        </button>
      )}

      {onEditLimits && (
        <button
          type="button"
          className="btn-secondary board-toolbar-limits"
          onClick={onEditLimits}
        >
          <Gauge size={16} aria-hidden="true" />
          Límites
        </button>
      )}

      <p className="board-toolbar-summary" aria-live="polite">
        {isFiltering
          ? `Mostrando ${shown} de ${total} ${total === 1 ? "tarea" : "tareas"}`
          : ""}
      </p>
    </div>
  );
}

export default BoardToolbar;
