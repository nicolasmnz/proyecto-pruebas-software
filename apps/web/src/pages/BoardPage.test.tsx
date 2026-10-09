import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import BoardPage from "./BoardPage";
import { createWorkItem, getBoard, moveWorkItem } from "../api/board";
import type { Board, BoardItem } from "../api/board";
import { ApiError } from "../api/projects";

vi.mock("../api/board", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/board")>()),
  getBoard: vi.fn(),
  createWorkItem: vi.fn(),
  moveWorkItem: vi.fn(),
}));

const mockedGetBoard = vi.mocked(getBoard);
const mockedCreateWorkItem = vi.mocked(createWorkItem);
const mockedMoveWorkItem = vi.mocked(moveWorkItem);

const PROJECT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function buildItem(overrides: Partial<BoardItem>): BoardItem {
  return {
    id: "30000000-0000-0000-0000-000000000010",
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

const board: Board = {
  project: {
    id: PROJECT_ID,
    name: "Sistema de Gestión de Proyectos",
    description: null,
    created_by: "11111111-1111-1111-1111-111111111111",
    is_archived: false,
    created_at: "2026-09-01T12:00:00Z",
    updated_at: "2026-10-07T12:00:00Z",
  },
  columns: [
    {
      status: "TODO",
      items: [
        buildItem({ id: "1", title: "Diseñar login", priority: "HIGH" }),
        buildItem({ id: "2", title: "Corregir menú", type: "BUG" }),
      ],
    },
    {
      status: "IN_PROGRESS",
      items: [
        buildItem({
          id: "3",
          title: "Administrar miembros",
          type: "STORY",
          estimate: 8,
          assignee_name: "Ana Pérez",
        }),
      ],
    },
    { status: "DONE", items: [] },
  ],
};

function renderPage() {
  render(
    <MemoryRouter initialEntries={[`/projects/${PROJECT_ID}/board`]}>
      <Routes>
        <Route path="/projects" element={<h1>Listado</h1>} />
        <Route path="/projects/:projectId" element={<h1>Detalle</h1>} />
        <Route path="/projects/:projectId/board" element={<BoardPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("BoardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("muestra un estado de carga y luego las tres columnas", async () => {
    mockedGetBoard.mockResolvedValue(board);

    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent("Cargando tablero");

    const todo = await screen.findByRole("region", { name: "Por hacer" });
    const inProgress = screen.getByRole("region", { name: "En progreso" });
    const done = screen.getByRole("region", { name: "Hecho" });

    expect(mockedGetBoard).toHaveBeenCalledWith(PROJECT_ID, expect.anything());
    expect(within(todo).getAllByRole("listitem")).toHaveLength(2);
    expect(within(todo).getByText("Diseñar login")).toBeInTheDocument();
    expect(within(todo).getByText("Prioridad alta")).toBeInTheDocument();
    expect(within(todo).getByText("Error")).toBeInTheDocument();
    expect(within(inProgress).getByText("8 pts")).toBeInTheDocument();
    expect(
      within(inProgress).getByLabelText("Asignado a Ana Pérez"),
    ).toBeInTheDocument();
    expect(within(todo).getAllByLabelText("Sin asignar")).toHaveLength(2);
    expect(within(done).getByText("Sin elementos")).toBeInTheDocument();
  });

  test("el breadcrumb enlaza con el proyecto", async () => {
    mockedGetBoard.mockResolvedValue(board);

    renderPage();

    await userEvent.click(
      await screen.findByRole("link", { name: board.project.name }),
    );

    expect(
      screen.getByRole("heading", { name: "Detalle" }),
    ).toBeInTheDocument();
  });

  test("muestra un mensaje si el proyecto no existe", async () => {
    mockedGetBoard.mockRejectedValue(new ApiError("No encontrado", 404));

    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Proyecto no encontrado" }),
    ).toBeInTheDocument();
  });

  test("muestra el error y permite reintentar", async () => {
    mockedGetBoard.mockRejectedValueOnce(new Error("Fallo de red"));
    mockedGetBoard.mockResolvedValueOnce(board);

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Fallo de red");

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("region", { name: "Por hacer" }),
    ).toBeInTheDocument();
    expect(mockedGetBoard).toHaveBeenCalledTimes(2);
  });

  describe("crear tareas", () => {
    test("crea una tarea en la columna elegida y la muestra al final", async () => {
      mockedGetBoard.mockResolvedValue(board);
      mockedCreateWorkItem.mockResolvedValue(
        buildItem({
          id: "99",
          title: "Preparar demo",
          type: "STORY",
          priority: "HIGH",
          estimate: 5,
          status: "IN_PROGRESS",
        }),
      );

      renderPage();

      const inProgress = await screen.findByRole("region", {
        name: "En progreso",
      });

      await userEvent.click(
        within(inProgress).getByRole("button", { name: /Crear tarea/ }),
      );

      await userEvent.type(screen.getByLabelText(/Título/), "  Preparar demo ");
      await userEvent.selectOptions(screen.getByLabelText("Tipo"), "STORY");
      await userEvent.selectOptions(screen.getByLabelText("Prioridad"), "HIGH");
      await userEvent.type(screen.getByLabelText("Puntos"), "5");
      await userEvent.click(screen.getByRole("button", { name: "Crear" }));

      expect(mockedCreateWorkItem).toHaveBeenCalledWith(PROJECT_ID, {
        title: "Preparar demo",
        description: undefined,
        type: "STORY",
        priority: "HIGH",
        estimate: 5,
        status: "IN_PROGRESS",
        createdBy: expect.any(String),
      });

      const items = await within(inProgress).findAllByRole("listitem");

      expect(items).toHaveLength(2);
      expect(within(items[1]).getByText("Preparar demo")).toBeInTheDocument();
      expect(screen.queryByLabelText(/Título/)).not.toBeInTheDocument();
      expect(screen.getByRole("status", { name: "" })).toHaveTextContent(
        'Tarea "Preparar demo" creada.',
      );
    });

    test("no envía el formulario sin título", async () => {
      mockedGetBoard.mockResolvedValue(board);

      renderPage();

      const todo = await screen.findByRole("region", { name: "Por hacer" });

      await userEvent.click(
        within(todo).getByRole("button", { name: /Crear tarea/ }),
      );
      await userEvent.type(screen.getByLabelText(/Título/), "   ");
      await userEvent.click(screen.getByRole("button", { name: "Crear" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "El título es obligatorio.",
      );
      expect(mockedCreateWorkItem).not.toHaveBeenCalled();
    });

    test("muestra el error de la API y conserva lo escrito", async () => {
      mockedGetBoard.mockResolvedValue(board);
      mockedCreateWorkItem.mockRejectedValue(new Error("Error creando tarea"));

      renderPage();

      const todo = await screen.findByRole("region", { name: "Por hacer" });

      await userEvent.click(
        within(todo).getByRole("button", { name: /Crear tarea/ }),
      );
      await userEvent.type(screen.getByLabelText(/Título/), "Mi tarea");
      await userEvent.click(screen.getByRole("button", { name: "Crear" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Error creando tarea",
      );
      expect(screen.getByLabelText(/Título/)).toHaveValue("Mi tarea");
      expect(within(todo).getAllByRole("listitem")).toHaveLength(2);
    });

    test("Cancelar y Escape cierran el formulario y devuelven el foco", async () => {
      mockedGetBoard.mockResolvedValue(board);

      renderPage();

      const todo = await screen.findByRole("region", { name: "Por hacer" });
      const addButton = () =>
        within(todo).getByRole("button", { name: /Crear tarea/ });

      await userEvent.click(addButton());
      await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(screen.queryByLabelText(/Título/)).not.toBeInTheDocument();
      await waitFor(() => expect(addButton()).toHaveFocus());

      await userEvent.click(addButton());
      await userEvent.keyboard("{Escape}");

      expect(screen.queryByLabelText(/Título/)).not.toBeInTheDocument();
      await waitFor(() => expect(addButton()).toHaveFocus());
    });

    test("un proyecto archivado no permite crear tareas", async () => {
      mockedGetBoard.mockResolvedValue({
        ...board,
        project: { ...board.project, is_archived: true },
      });

      renderPage();

      expect(
        await screen.findByText(/Restáuralo para agregar tareas/),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Crear tarea/ }),
      ).not.toBeInTheDocument();
    });
  });

  describe("mover tareas", () => {
    const moved = (overrides: Partial<BoardItem> = {}) =>
      buildItem({
        id: "1",
        title: "Diseñar login",
        priority: "HIGH",
        status: "DONE",
        ...overrides,
      });

    test("mueve una tarea con el selector «Mover a»", async () => {
      mockedGetBoard.mockResolvedValue(board);
      mockedMoveWorkItem.mockResolvedValue(moved());

      renderPage();

      await userEvent.selectOptions(
        await screen.findByLabelText("Mover «Diseñar login» a"),
        "Hecho",
      );

      expect(mockedMoveWorkItem).toHaveBeenCalledWith(PROJECT_ID, "1", "DONE");

      const done = screen.getByRole("region", { name: "Hecho" });

      expect(
        await within(done).findByText("Diseñar login"),
      ).toBeInTheDocument();
      expect(
        within(screen.getByRole("region", { name: "Por hacer" })).queryByText(
          "Diseñar login",
        ),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("status", { name: "" })).toHaveTextContent(
        'Tarea "Diseñar login" movida a Hecho.',
      );
    });

    test("el selector no ofrece la columna actual", async () => {
      mockedGetBoard.mockResolvedValue(board);

      renderPage();

      const select = await screen.findByLabelText("Mover «Diseñar login» a");
      const options = within(select)
        .getAllByRole("option")
        .map((option) => option.textContent);

      expect(options).toEqual(["Mover a…", "En progreso", "Hecho"]);
    });

    test("mueve una tarea arrastrándola a otra columna", async () => {
      mockedGetBoard.mockResolvedValue(board);
      mockedMoveWorkItem.mockResolvedValue(moved({ status: "IN_PROGRESS" }));

      renderPage();

      const card = (await screen.findByText("Diseñar login")).closest(
        "article",
      )!;
      const inProgress = screen.getByRole("region", { name: "En progreso" });
      const dataTransfer = { setData: vi.fn() };

      fireEvent.dragStart(card, { dataTransfer });
      fireEvent.dragOver(inProgress, { dataTransfer });
      fireEvent.drop(inProgress, { dataTransfer });

      expect(mockedMoveWorkItem).toHaveBeenCalledWith(
        PROJECT_ID,
        "1",
        "IN_PROGRESS",
      );
      await waitFor(() =>
        expect(within(inProgress).getAllByRole("listitem")).toHaveLength(2),
      );
    });

    test("soltar la tarea en su propia columna no llama a la API", async () => {
      mockedGetBoard.mockResolvedValue(board);

      renderPage();

      const card = (await screen.findByText("Diseñar login")).closest(
        "article",
      )!;
      const todo = screen.getByRole("region", { name: "Por hacer" });
      const dataTransfer = { setData: vi.fn() };

      fireEvent.dragStart(card, { dataTransfer });
      fireEvent.dragOver(todo, { dataTransfer });
      fireEvent.drop(todo, { dataTransfer });

      expect(mockedMoveWorkItem).not.toHaveBeenCalled();
    });

    test("si la API falla muestra el error y la tarea no se mueve", async () => {
      mockedGetBoard.mockResolvedValue(board);
      mockedMoveWorkItem.mockRejectedValue(new Error("Error moviendo tarea"));

      renderPage();

      await userEvent.selectOptions(
        await screen.findByLabelText("Mover «Diseñar login» a"),
        "Hecho",
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Error moviendo tarea",
      );
      expect(
        within(screen.getByRole("region", { name: "Por hacer" })).getByText(
          "Diseñar login",
        ),
      ).toBeInTheDocument();
    });

    test("un proyecto archivado no permite mover tareas", async () => {
      mockedGetBoard.mockResolvedValue({
        ...board,
        project: { ...board.project, is_archived: true },
      });

      renderPage();

      const card = (await screen.findByText("Diseñar login")).closest(
        "article",
      )!;

      expect(
        screen.queryByLabelText(/Mover «Diseñar login» a/),
      ).not.toBeInTheDocument();
      expect(card).toHaveAttribute("draggable", "false");
    });
  });
});
