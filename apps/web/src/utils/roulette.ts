import type { BoardItem, BoardMember } from "../api/board";
import { isPendingItem } from "./dashboard";

export interface RouletteSlice {
  member: BoardMember;
  // Una tarea pendiente sin estimar cuenta como 1 punto, para no ignorarla
  pendingPoints: number;
  // Entre 0 y 1; todas suman 1
  probability: number;
  // Entero; todos suman 100
  percentage: number;
}

// Reparte 100 en enteros proporcionales a las probabilidades: cada uno recibe
// su parte entera y lo que falta va a los de mayor resto
function toPercentages(probabilities: number[]): number[] {
  const exact = probabilities.map((probability) => probability * 100);
  const result = exact.map(Math.floor);
  let missing = 100 - result.reduce((sum, value) => sum + value, 0);

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (const { index } of byRemainder) {
    if (missing <= 0) {
      break;
    }

    result[index] += 1;
    missing -= 1;
  }

  return result;
}

// Todos pueden salir, pero con más probabilidad quien tiene menos puntos
// pendientes: el peso de cada uno es 1 / (1 + puntos pendientes)
export function getRouletteOdds(
  members: BoardMember[],
  items: BoardItem[],
): RouletteSlice[] {
  const pending = items.filter(isPendingItem);
  const points = members.map((member) =>
    pending
      .filter((item) => item.assignee_id === member.id)
      .reduce((sum, item) => sum + (item.estimate ?? 1), 0),
  );
  const weights = points.map((value) => 1 / (1 + value));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const probabilities = weights.map((weight) =>
    total === 0 ? 0 : weight / total,
  );
  const percentages = toPercentages(probabilities);

  return members.map((member, index) => ({
    member,
    pendingPoints: points[index],
    probability: probabilities[index],
    percentage: percentages[index],
  }));
}

// Elige un sector según su probabilidad. `random` devuelve un número en
// [0, 1), como Math.random; se recibe para que los tests sean deterministas
export function pickSlice(
  slices: RouletteSlice[],
  random: () => number = Math.random,
): RouletteSlice {
  if (slices.length === 0) {
    throw new Error("La ruleta no tiene participantes");
  }

  const target = random();
  let accumulated = 0;

  for (const slice of slices) {
    accumulated += slice.probability;

    if (target < accumulated) {
      return slice;
    }
  }

  // Por redondeo la suma puede quedar apenas bajo 1
  return slices[slices.length - 1];
}
