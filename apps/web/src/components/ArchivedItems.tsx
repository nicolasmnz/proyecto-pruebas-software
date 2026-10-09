import { useId, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { BoardItem } from "../api/board";
import KanbanCard from "./KanbanCard";

import "./ArchivedItems.css";

interface ArchivedItemsProps {
  items: BoardItem[];
  // Abre la ficha de una tarea archivada
  onOpen?: (item: BoardItem) => void;
  // Sin esta función las tareas archivadas no se pueden restaurar
  onRestore?: (item: BoardItem) => void;
}

function ArchivedItems({ items, onOpen, onRestore }: ArchivedItemsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();

  return (
    <section className="archived-items" aria-label="Tareas archivadas">
      <button
        type="button"
        className="archived-items-toggle"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => setIsOpen((value) => !value)}
      >
        {isOpen ? (
          <ChevronDown size={16} aria-hidden="true" />
        ) : (
          <ChevronRight size={16} aria-hidden="true" />
        )}
        Archivadas ({items.length})
      </button>

      <div id={listId} hidden={!isOpen}>
        {items.length === 0 ? (
          <p className="archived-items-empty">No hay tareas archivadas.</p>
        ) : (
          <ul className="archived-items-list">
            {items.map((item) => (
              <li key={item.id}>
                <KanbanCard item={item} onOpen={onOpen} onRestore={onRestore} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default ArchivedItems;
