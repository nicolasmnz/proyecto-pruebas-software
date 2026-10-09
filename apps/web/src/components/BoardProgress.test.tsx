import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import BoardProgress from "./BoardProgress";
import type { BoardColumn, BoardItem } from "../api/board";

function item(id: number, status: BoardItem["status"]): BoardItem {
  return {
    id: String(id),
    item_number: id,
    is_archived: false,
    type: "TASK",
    title: `Tarea ${id}`,
    status,
    priority: "MEDIUM",
    estimate: null,
    position: 0,
    due_date: null,
    assignee_id: null,
    assignee_name: null,
  };
}

function columns(
  todo: number,
  inProgress: number,
  done: number,
): BoardColumn[] {
  let id = 0;
  const make = (count: number, status: BoardItem["status"]) =>
    Array.from({ length: count }, () => item(++id, status));

  return [
    { status: "TODO", items: make(todo, "TODO") },
    { status: "IN_PROGRESS", items: make(inProgress, "IN_PROGRESS") },
    { status: "DONE", items: make(done, "DONE") },
  ];
}

describe("BoardProgress", () => {
  test("muestra hechas sobre el total y el porcentaje", () => {
    render(<BoardProgress columns={columns(3, 2, 3)} archived={[]} />);

    expect(screen.getByText("3 de 8 tareas hechas · 38 %")).toBeInTheDocument();

    const bar = screen.getByRole("progressbar", { name: "Progreso" });

    expect(bar).toHaveAttribute("aria-valuenow", "38");
    expect(bar).toHaveAttribute("aria-valuetext", "38 % completado");
  });

  test("las tareas archivadas cuentan como hechas y dentro del total", () => {
    render(
      <BoardProgress
        columns={columns(2, 0, 1)}
        archived={[item(90, "DONE"), item(91, "DONE")]}
      />,
    );

    // 1 en Hecho + 2 archivadas = 3 hechas de 5
    expect(screen.getByText("3 de 5 tareas hechas · 60 %")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "60",
    );
  });

  test("sin tareas muestra 0 % sin dividir por cero", () => {
    render(<BoardProgress columns={columns(0, 0, 0)} archived={[]} />);

    expect(screen.getByText("Aún no hay tareas")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  test("una sola tarea usa el singular", () => {
    render(<BoardProgress columns={columns(0, 0, 1)} archived={[]} />);

    expect(screen.getByText("1 de 1 tarea hecha · 100 %")).toBeInTheDocument();
  });

  test("todas hechas llega al 100 %", () => {
    render(<BoardProgress columns={columns(0, 0, 4)} archived={[]} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });
});
