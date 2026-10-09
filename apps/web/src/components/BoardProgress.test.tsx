import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import BoardProgress from "./BoardProgress";
import type { BoardColumn, BoardItem } from "../api/board";

function item(
  id: number,
  status: BoardItem["status"],
  estimate: number | null = null,
): BoardItem {
  return {
    id: String(id),
    item_number: id,
    is_archived: false,
    type: "TASK",
    title: `Tarea ${id}`,
    status,
    priority: "MEDIUM",
    estimate,
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

  describe("según puntos", () => {
    const withPoints: BoardColumn[] = [
      {
        status: "TODO",
        items: [item(1, "TODO", 8), item(2, "TODO", 5)],
      },
      { status: "IN_PROGRESS", items: [item(3, "IN_PROGRESS", 2)] },
      { status: "DONE", items: [item(4, "DONE", 5)] },
    ];

    test("muestra tareas y puntos, y la barra pesa por puntos", () => {
      render(<BoardProgress columns={withPoints} archived={[]} />);

      // 1 de 4 tareas (25 %), pero 5 de 20 puntos (25 %): cambia el peso
      expect(
        screen.getByText("1 de 4 tareas hechas · 5 de 20 pts · 25 %"),
      ).toBeInTheDocument();
    });

    test("difiere del porcentaje por tareas cuando las estimaciones son desiguales", () => {
      const columns: BoardColumn[] = [
        { status: "TODO", items: [item(1, "TODO", 13)] },
        { status: "IN_PROGRESS", items: [] },
        { status: "DONE", items: [item(2, "DONE", 1)] },
      ];

      render(<BoardProgress columns={columns} archived={[]} />);

      // La mitad de las tareas, pero solo 1 de 14 puntos
      expect(
        screen.getByText("1 de 2 tareas hechas · 1 de 14 pts · 7 %"),
      ).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "7",
      );
    });

    test("los puntos de las archivadas cuentan como hechos", () => {
      render(
        <BoardProgress
          columns={withPoints}
          archived={[item(90, "DONE", 5), item(91, "DONE", 5)]}
        />,
      );

      expect(
        screen.getByText("3 de 6 tareas hechas · 15 de 30 pts · 50 %"),
      ).toBeInTheDocument();
    });

    test("las tareas sin estimar no pesan, ni siquiera al terminarlas", () => {
      const columns: BoardColumn[] = [
        { status: "TODO", items: [item(1, "TODO", 4)] },
        { status: "IN_PROGRESS", items: [] },
        { status: "DONE", items: [item(2, "DONE")] },
      ];

      render(<BoardProgress columns={columns} archived={[]} />);

      expect(
        screen.getByText("1 de 2 tareas hechas · 0 de 4 pts · 0 %"),
      ).toBeInTheDocument();
    });

    test("todo hecho llega al 100 %", () => {
      const columns: BoardColumn[] = [
        { status: "TODO", items: [] },
        { status: "IN_PROGRESS", items: [] },
        { status: "DONE", items: [item(1, "DONE", 3), item(2, "DONE", 8)] },
      ];

      render(<BoardProgress columns={columns} archived={[]} />);

      expect(
        screen.getByText("2 de 2 tareas hechas · 11 de 11 pts · 100 %"),
      ).toBeInTheDocument();
    });
  });

  test("si ninguna tarea tiene puntos se muestra solo por tareas", () => {
    render(<BoardProgress columns={columns(2, 0, 2)} archived={[]} />);

    expect(screen.getByText("2 de 4 tareas hechas · 50 %")).toBeInTheDocument();
    expect(screen.queryByText(/pts/)).not.toBeInTheDocument();
  });
});
