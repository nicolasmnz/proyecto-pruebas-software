import type { BoardItem, BoardMember } from "../api/board";
import type { Sprint } from "../api/sprints";

// Pendiente: ni terminada ni archivada (solo se archiva lo terminado)
export function isPendingItem(item: BoardItem): boolean {
  return !item.is_archived && item.status !== "DONE";
}

function sumPoints(items: BoardItem[]) {
  return items.reduce((sum, item) => sum + (item.estimate ?? 0), 0);
}

// Días entre dos fechas AAAA-MM-DD (positivo si `to` es posterior)
export function daysBetween(from: string, to: string): number {
  const toUtc = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);

    return Date.UTC(year, month - 1, day);
  };

  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

export interface MemberLoad {
  // null = tareas sin asignar
  id: string | null;
  name: string;
  tasks: number;
  points: number;
}

// Carga pendiente de cada integrante, de la mayor a la menor. Incluye a los
// miembros sin tareas (pueden recibir trabajo) y a responsables que ya no son
// miembros; lo sin asignar va aparte
export function getMemberLoad(
  items: BoardItem[],
  members: BoardMember[],
): { members: MemberLoad[]; unassigned: MemberLoad } {
  const pending = items.filter(isPendingItem);
  const loads = new Map<string, MemberLoad>(
    members.map((member) => [
      member.id,
      { id: member.id, name: member.name, tasks: 0, points: 0 },
    ]),
  );

  for (const item of pending) {
    if (!item.assignee_id) {
      continue;
    }

    const load = loads.get(item.assignee_id) ?? {
      id: item.assignee_id,
      name: item.assignee_name ?? "Responsable",
      tasks: 0,
      points: 0,
    };

    load.tasks += 1;
    load.points += item.estimate ?? 0;
    loads.set(item.assignee_id, load);
  }

  const unassignedItems = pending.filter((item) => !item.assignee_id);

  return {
    members: [...loads.values()].sort(
      (a, b) =>
        b.points - a.points ||
        b.tasks - a.tasks ||
        a.name.localeCompare(b.name, "es"),
    ),
    unassigned: {
      id: null,
      name: "Sin asignar",
      tasks: unassignedItems.length,
      points: sumPoints(unassignedItems),
    },
  };
}

export interface OverdueItem {
  item: BoardItem;
  daysLate: number;
}

// Tareas pendientes con la fecha límite ya pasada, de la más atrasada
export function getOverdueItems(
  items: BoardItem[],
  today: string,
): OverdueItem[] {
  return items
    .filter(
      (item) =>
        isPendingItem(item) && item.due_date !== null && item.due_date < today,
    )
    .map((item) => ({
      item,
      daysLate: daysBetween(item.due_date as string, today),
    }))
    .sort(
      (a, b) =>
        b.daysLate - a.daysLate || a.item.item_number - b.item.item_number,
    );
}

// Los sprints activos, del que empezó antes al más reciente
export function getActiveSprints(sprints: Sprint[]): Sprint[] {
  return sprints
    .filter((sprint) => sprint.status === "ACTIVE")
    .sort((a, b) =>
      (a.start_date ?? "9999").localeCompare(b.start_date ?? "9999"),
    );
}

function plural(count: number, word: string) {
  return `${count} ${count === 1 ? word : `${word}s`}`;
}

// «Quedan 3 días», «Termina hoy» o «Atrasado: debía terminar hace 2 días»
export function describeSprintTiming(
  sprint: Pick<Sprint, "end_date">,
  today: string,
): { text: string; isLate: boolean } {
  if (!sprint.end_date) {
    return { text: "Sin fecha de término", isLate: false };
  }

  const remaining = daysBetween(today, sprint.end_date);

  if (remaining < 0) {
    return {
      text: `Atrasado: debía terminar hace ${plural(-remaining, "día")}`,
      isLate: true,
    };
  }

  if (remaining === 0) {
    return { text: "Termina hoy", isLate: false };
  }

  return {
    text: `${remaining === 1 ? "Queda" : "Quedan"} ${plural(remaining, "día")}`,
    isLate: false,
  };
}
