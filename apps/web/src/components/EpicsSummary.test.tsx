import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import EpicsSummary from "./EpicsSummary";
import { getBoard } from "../api/board";
import type { Board, BoardItem } from "../api/board";
import { getEpics } from "../api/epics";
import type { Epic } from "../api/epics";

vi.mock("../api/board", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/board")>()),
  getBoard: vi.fn(),
}));

vi.mock("../api/epics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/epics")>()),
  getEpics: vi.fn(),
}));

const mockedGetBoard = vi.mocked(getBoard);
const mockedGetEpics = vi.mocked(getEpics);

const PROJECT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function buildItem(overrides: Partial<BoardItem>): BoardItem {
  return {
    id: "1",
    item_number: 1,
    is_archived: false,
    parent_id: null,
    type: "TASK",
    title: "Tarea",
    status: "TODO",
    priority: "MEDIUM",
    estimate: null,
    position: 0,
    due_date: null,
    assignee_id: null,
    assignee_name: null,
    ...overrides,
  };
}

function buildEpic(id: string, title: string): Epic {
  return {
    id,
    project_id: PROJECT_ID,
    item_number: 1,
    is_archived: false,
    type: "EPIC",
    title,
    description: null,
    status: "TODO",
    priority: "MEDIUM",
    estimate: null,
    due_date: null,
    created_by: "11111111-1111-1111-1111-111111111111",
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-01T12:00:00Z",
  };
}

const board: Board = {
  project: {
    id: PROJECT_ID,
    name: "Proyecto",
    description: null,
    created_by: "11111111-1111-1111-1111-111111111111",
    is_archived: false,
    created_at: "2026-09-01T12:00:00Z",
    updated_at: "2026-10-07T12:00:00Z",
  },
  columns: [
    {
      status: "TODO",
      items: [buildItem({ id: "1", parent_id: "e1" })],
    },
    {
      status: "DONE",
      items: [buildItem({ id: "2", status: "DONE", parent_id: "e1" })],
    },
  ],
  archived: [],
  members: [],
  wip_limits: {},
};

function renderSummary(readOnly = false) {
  render(
    <MemoryRouter>
      <EpicsSummary projectId={PROJECT_ID} readOnly={readOnly} />
    </MemoryRouter>,
  );
}

describe("EpicsSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetBoard.mockResolvedValue(board);
  });

  test("muestra un indicador de carga", () => {
    mockedGetEpics.mockReturnValue(new Promise(() => {}));

    renderSummary();

    expect(screen.getByRole("status")).toHaveTextContent("Cargando épicas");
  });

  test("muestra las épicas con su avance y enlaza a la página de épicas", async () => {
    mockedGetEpics.mockResolvedValue([
      buildEpic("e1", "Autenticación"),
      buildEpic("e2", "Reportes"),
    ]);

    renderSummary();

    const login = await screen.findByRole("progressbar", {
      name: "Avance de Autenticación",
    });

    expect(login).toHaveAttribute("aria-valuenow", "50");
    expect(login).toHaveAttribute(
      "aria-valuetext",
      "1 de 2 tareas hechas · 50 %",
    );
    expect(
      screen.getByRole("progressbar", { name: "Avance de Reportes" }),
    ).toHaveAttribute("aria-valuetext", "Aún no tiene tareas");
    expect(
      screen.getByRole("link", { name: "Ver todas las épicas" }),
    ).toHaveAttribute("href", `/projects/${PROJECT_ID}/epics`);
    expect(screen.getByRole("link", { name: "Nueva épica" })).toHaveAttribute(
      "href",
      `/projects/${PROJECT_ID}/epics?nueva`,
    );
  });

  test("muestra como máximo tres épicas e indica cuántas hay", async () => {
    mockedGetEpics.mockResolvedValue([
      buildEpic("e1", "Una"),
      buildEpic("e2", "Dos"),
      buildEpic("e3", "Tres"),
      buildEpic("e4", "Cuatro"),
    ]);

    renderSummary();

    const list = await screen.findByRole("list");

    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).queryByText("Cuatro")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver las 4 épicas" }),
    ).toBeInTheDocument();
  });

  test("indica cuando el proyecto no tiene épicas", async () => {
    mockedGetEpics.mockResolvedValue([]);

    renderSummary();

    expect(
      await screen.findByText("Este proyecto aún no tiene épicas."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Ver todas las épicas" }),
    ).not.toBeInTheDocument();
  });

  test("muestra el error y permite reintentar", async () => {
    const user = userEvent.setup();
    mockedGetEpics
      .mockRejectedValueOnce(new Error("Error obteniendo épicas"))
      .mockResolvedValueOnce([buildEpic("e1", "Autenticación")]);

    renderSummary();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error obteniendo épicas",
    );

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Autenticación")).toBeInTheDocument();
  });

  test("en un proyecto archivado no ofrece crear épicas", async () => {
    mockedGetEpics.mockResolvedValue([buildEpic("e1", "Autenticación")]);

    renderSummary(true);

    await screen.findByText("Autenticación");

    expect(
      screen.queryByRole("link", { name: "Nueva épica" }),
    ).not.toBeInTheDocument();
  });
});
