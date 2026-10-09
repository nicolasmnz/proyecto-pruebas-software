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
import {
  archiveWorkItem,
  createWorkItem,
  deleteWorkItem,
  getBoard,
  getWorkItem,
  moveWorkItem,
  restoreWorkItem,
  saveWipLimits,
  updateWorkItem,
} from "../api/board";
import type { Board, BoardItem, WorkItemDetail } from "../api/board";
import { ApiError } from "../api/projects";

vi.mock("../api/board", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/board")>()),
  getBoard: vi.fn(),
  createWorkItem: vi.fn(),
  moveWorkItem: vi.fn(),
  archiveWorkItem: vi.fn(),
  restoreWorkItem: vi.fn(),
  getWorkItem: vi.fn(),
  updateWorkItem: vi.fn(),
  deleteWorkItem: vi.fn(),
  saveWipLimits: vi.fn(),
}));

const mockedGetBoard = vi.mocked(getBoard);
const mockedCreateWorkItem = vi.mocked(createWorkItem);
const mockedMoveWorkItem = vi.mocked(moveWorkItem);
const mockedArchiveWorkItem = vi.mocked(archiveWorkItem);
const mockedRestoreWorkItem = vi.mocked(restoreWorkItem);
const mockedGetWorkItem = vi.mocked(getWorkItem);
const mockedUpdateWorkItem = vi.mocked(updateWorkItem);
const mockedDeleteWorkItem = vi.mocked(deleteWorkItem);
const mockedSaveWipLimits = vi.mocked(saveWipLimits);

const PROJECT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function buildItem(overrides: Partial<BoardItem>): BoardItem {
  return {
    id: "30000000-0000-0000-0000-000000000010",
    item_number: 1,
    is_archived: false,
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
        buildItem({
          id: "1",
          item_number: 1,
          title: "Diseñar login",
          priority: "HIGH",
        }),
        buildItem({
          id: "2",
          item_number: 2,
          title: "Corregir menú",
          type: "BUG",
        }),
      ],
    },
    {
      status: "IN_PROGRESS",
      items: [
        buildItem({
          id: "3",
          item_number: 3,
          title: "Administrar miembros",
          type: "STORY",
          estimate: 8,
          assignee_name: "Ana Pérez",
        }),
      ],
    },
    { status: "DONE", items: [] },
  ],
  archived: [],
  members: [
    { id: "u1", name: "Ana Pérez" },
    { id: "u2", name: "Beto Soto" },
  ],
  wip_limits: {},
};

function renderPage(search = "") {
  render(
    <MemoryRouter initialEntries={[`/projects/${PROJECT_ID}/board${search}`]}>
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

  test("cada tarjeta muestra su identificador", async () => {
    mockedGetBoard.mockResolvedValue(board);

    renderPage();

    const todo = await screen.findByRole("region", { name: "Por hacer" });
    const inProgress = screen.getByRole("region", { name: "En progreso" });

    expect(within(todo).getByText("#1")).toBeInTheDocument();
    expect(within(todo).getByText("#2")).toBeInTheDocument();
    expect(within(inProgress).getByText("#3")).toBeInTheDocument();
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

      await userEvent.type(
        within(inProgress).getByLabelText(/Título/),
        "  Preparar demo ",
      );
      await userEvent.selectOptions(
        within(inProgress).getByLabelText("Tipo"),
        "STORY",
      );
      await userEvent.selectOptions(
        within(inProgress).getByLabelText("Prioridad"),
        "HIGH",
      );
      await userEvent.type(within(inProgress).getByLabelText("Puntos"), "5");
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

      expect(mockedMoveWorkItem).toHaveBeenCalledWith(
        PROJECT_ID,
        "1",
        "DONE",
        undefined,
      );

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

      // Soltar sobre la columna (no sobre una tarjeta) la deja al final
      expect(mockedMoveWorkItem).toHaveBeenCalledWith(
        PROJECT_ID,
        "1",
        "IN_PROGRESS",
        1,
      );
      await waitFor(() =>
        expect(within(inProgress).getAllByRole("listitem")).toHaveLength(2),
      );
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

  describe("archivar tareas", () => {
    const doneItem = buildItem({
      id: "10",
      item_number: 10,
      title: "Crear proyectos",
      status: "DONE",
    });

    const boardWithDone: Board = {
      ...board,
      columns: board.columns.map((column) =>
        column.status === "DONE" ? { ...column, items: [doneItem] } : column,
      ),
    };

    test("solo las tareas de Hecho tienen botón Archivar", async () => {
      mockedGetBoard.mockResolvedValue(boardWithDone);

      renderPage();

      await screen.findByRole("region", { name: "Hecho" });

      expect(
        screen.getAllByRole("button", { name: /^Archivar «/ }),
      ).toHaveLength(1);
      expect(
        screen.getByRole("button", { name: "Archivar «Crear proyectos»" }),
      ).toBeInTheDocument();
    });

    test("archivar saca la tarea de Hecho y la lista en Archivadas", async () => {
      mockedGetBoard.mockResolvedValue(boardWithDone);
      mockedArchiveWorkItem.mockResolvedValue({
        ...doneItem,
        is_archived: true,
      });

      renderPage();

      await userEvent.click(
        await screen.findByRole("button", {
          name: "Archivar «Crear proyectos»",
        }),
      );

      expect(mockedArchiveWorkItem).toHaveBeenCalledWith(PROJECT_ID, "10");

      const done = screen.getByRole("region", { name: "Hecho" });

      await waitFor(() =>
        expect(within(done).getByText("Sin elementos")).toBeInTheDocument(),
      );
      expect(
        screen.getByRole("button", { name: "Archivadas (1)" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("status", { name: "" })).toHaveTextContent(
        'Tarea "Crear proyectos" archivada.',
      );
    });

    test("restaurar devuelve la tarea a Hecho", async () => {
      mockedGetBoard.mockResolvedValue({
        ...board,
        archived: [{ ...doneItem, is_archived: true }],
      });
      mockedRestoreWorkItem.mockResolvedValue(doneItem);

      renderPage();

      await userEvent.click(
        await screen.findByRole("button", { name: "Archivadas (1)" }),
      );
      await userEvent.click(
        screen.getByRole("button", { name: "Restaurar «Crear proyectos»" }),
      );

      expect(mockedRestoreWorkItem).toHaveBeenCalledWith(PROJECT_ID, "10");

      const done = screen.getByRole("region", { name: "Hecho" });

      expect(
        await within(done).findByText("Crear proyectos"),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Archivadas (0)" }),
      ).toBeInTheDocument();
    });

    test("la sección Archivadas está plegada y se despliega", async () => {
      mockedGetBoard.mockResolvedValue({
        ...board,
        archived: [{ ...doneItem, is_archived: true }],
      });

      renderPage();

      const toggle = await screen.findByRole("button", {
        name: "Archivadas (1)",
      });

      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(screen.getByText("Crear proyectos")).not.toBeVisible();

      await userEvent.click(toggle);

      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText("Crear proyectos")).toBeVisible();
    });

    test("si la API falla muestra el error y la tarea sigue en Hecho", async () => {
      mockedGetBoard.mockResolvedValue(boardWithDone);
      mockedArchiveWorkItem.mockRejectedValue(
        new Error("Error archivando tarea"),
      );

      renderPage();

      await userEvent.click(
        await screen.findByRole("button", {
          name: "Archivar «Crear proyectos»",
        }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Error archivando tarea",
      );
      expect(
        within(screen.getByRole("region", { name: "Hecho" })).getByText(
          "Crear proyectos",
        ),
      ).toBeInTheDocument();
    });

    test("un proyecto archivado no permite archivar ni restaurar", async () => {
      mockedGetBoard.mockResolvedValue({
        ...boardWithDone,
        project: { ...board.project, is_archived: true },
        archived: [
          { ...doneItem, id: "11", title: "Vieja", is_archived: true },
        ],
      });

      renderPage();

      await userEvent.click(
        await screen.findByRole("button", { name: "Archivadas (1)" }),
      );

      expect(
        screen.queryByRole("button", { name: /^Archivar «/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /^Restaurar «/ }),
      ).not.toBeInTheDocument();
    });
  });

  describe("progreso", () => {
    test("la barra refleja las tareas hechas y se actualiza al mover y archivar", async () => {
      mockedGetBoard.mockResolvedValue(board);
      mockedMoveWorkItem.mockResolvedValue(
        buildItem({
          id: "1",
          item_number: 1,
          title: "Diseñar login",
          status: "DONE",
        }),
      );
      mockedArchiveWorkItem.mockResolvedValue(
        buildItem({
          id: "1",
          item_number: 1,
          title: "Diseñar login",
          status: "DONE",
          is_archived: true,
        }),
      );

      renderPage();

      // 3 tareas, ninguna hecha
      expect(
        await screen.findByText("0 de 3 tareas hechas · 0 %"),
      ).toBeInTheDocument();

      await userEvent.selectOptions(
        screen.getByLabelText("Mover «Diseñar login» a"),
        "Hecho",
      );

      expect(
        await screen.findByText("1 de 3 tareas hechas · 33 %"),
      ).toBeInTheDocument();

      // Archivar no cambia el progreso: sigue contando como hecha
      await userEvent.click(
        screen.getByRole("button", { name: "Archivar «Diseñar login»" }),
      );

      await screen.findByRole("button", { name: "Archivadas (1)" });

      expect(
        screen.getByText("1 de 3 tareas hechas · 33 %"),
      ).toBeInTheDocument();
    });

    test("crear una tarea aumenta el total", async () => {
      mockedGetBoard.mockResolvedValue(board);
      mockedCreateWorkItem.mockResolvedValue(
        buildItem({ id: "99", item_number: 4, title: "Nueva" }),
      );

      renderPage();

      await screen.findByText("0 de 3 tareas hechas · 0 %");

      await userEvent.click(
        within(screen.getByRole("region", { name: "Por hacer" })).getByRole(
          "button",
          { name: /Crear tarea/ },
        ),
      );
      await userEvent.type(screen.getByLabelText(/Título/), "Nueva");
      await userEvent.click(screen.getByRole("button", { name: "Crear" }));

      expect(
        await screen.findByText("0 de 4 tareas hechas · 0 %"),
      ).toBeInTheDocument();
    });
  });

  describe("ficha de la tarea", () => {
    const detail: WorkItemDetail = {
      ...buildItem({
        id: "1",
        item_number: 1,
        title: "Diseñar login",
        priority: "HIGH",
        estimate: 3,
        due_date: "2026-10-31",
      }),
      description: "Pantalla de inicio de sesión.",
      created_by: "u1",
      created_by_name: "Ana Pérez",
      created_at: "2026-10-01T12:00:00Z",
      updated_at: "2026-10-02T12:00:00Z",
    };

    async function openDialog() {
      mockedGetBoard.mockResolvedValue(board);
      mockedGetWorkItem.mockResolvedValue(detail);

      renderPage();

      await userEvent.click(
        await screen.findByRole("button", { name: "Diseñar login" }),
      );

      return screen.findByRole("dialog", { name: "Diseñar login" });
    }

    test("al hacer clic en el título abre la ficha con todos sus datos", async () => {
      const dialog = await openDialog();

      expect(mockedGetWorkItem).toHaveBeenCalledWith(
        PROJECT_ID,
        "1",
        expect.anything(),
      );
      expect(within(dialog).getByText("#1")).toBeInTheDocument();
      expect(
        within(dialog).getByText("Pantalla de inicio de sesión."),
      ).toBeInTheDocument();
      expect(within(dialog).getByText("Por hacer")).toBeInTheDocument();
      expect(within(dialog).getByText("Alta")).toBeInTheDocument();
      expect(within(dialog).getByText("3")).toBeInTheDocument();
      expect(within(dialog).getByText("Sin asignar")).toBeInTheDocument();
      // 31 de octubre: la fecha no se corre de día por la zona horaria
      expect(within(dialog).getByText(/31/)).toBeInTheDocument();
      expect(within(dialog).getByText("Ana Pérez")).toBeInTheDocument();
    });

    test("se cierra con el botón y con Escape, y devuelve el foco a la tarjeta", async () => {
      const dialog = await openDialog();

      await userEvent.click(
        within(dialog).getByRole("button", { name: "Cerrar" }),
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Diseñar login" }),
        ).toHaveFocus(),
      );

      await userEvent.click(
        screen.getByRole("button", { name: "Diseñar login" }),
      );
      await screen.findByRole("dialog");
      await userEvent.keyboard("{Escape}");

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    test("si no se puede cargar muestra el error y permite reintentar", async () => {
      mockedGetBoard.mockResolvedValue(board);
      mockedGetWorkItem.mockRejectedValueOnce(new Error("Fallo de red"));
      mockedGetWorkItem.mockResolvedValueOnce(detail);

      renderPage();

      await userEvent.click(
        await screen.findByRole("button", { name: "Diseñar login" }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Fallo de red",
      );

      await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

      expect(
        await screen.findByRole("dialog", { name: "Diseñar login" }),
      ).toBeInTheDocument();
    });

    test("editar guarda los cambios y actualiza la tarjeta del tablero", async () => {
      const dialog = await openDialog();

      mockedUpdateWorkItem.mockResolvedValue({
        ...detail,
        title: "Rediseñar login",
        priority: "CRITICAL",
        assignee_id: "u2",
        assignee_name: "Beto Soto",
        updated_at: "2026-10-03T12:00:00Z",
      });

      await userEvent.click(
        within(dialog).getByRole("button", { name: "Editar" }),
      );

      const title = within(dialog).getByLabelText(/Título/);

      expect(title).toHaveValue("Diseñar login");
      expect(within(dialog).getByLabelText("Fecha límite")).toHaveValue(
        "2026-10-31",
      );

      await userEvent.clear(title);
      await userEvent.type(title, "Rediseñar login");
      await userEvent.selectOptions(
        within(dialog).getByLabelText("Prioridad"),
        "CRITICAL",
      );
      await userEvent.selectOptions(
        within(dialog).getByLabelText("Responsable"),
        "Beto Soto",
      );
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Guardar cambios" }),
      );

      expect(mockedUpdateWorkItem).toHaveBeenCalledWith(PROJECT_ID, "1", {
        title: "Rediseñar login",
        description: "Pantalla de inicio de sesión.",
        type: "TASK",
        priority: "CRITICAL",
        estimate: 3,
        assigneeId: "u2",
        dueDate: "2026-10-31",
      });

      // Vuelve a la vista de la ficha ya actualizada
      const updatedDialog = await screen.findByRole("dialog", {
        name: "Rediseñar login",
      });

      expect(within(updatedDialog).getByText("Beto Soto")).toBeInTheDocument();

      // El tablero detrás refleja el cambio
      const todo = screen.getByRole("region", { name: "Por hacer" });

      expect(
        within(todo).getByRole("button", { name: "Rediseñar login" }),
      ).toBeInTheDocument();
      expect(
        within(todo).getByLabelText("Asignado a Beto Soto"),
      ).toBeInTheDocument();
    });

    test("quitar el responsable y la fecha los envía vacíos", async () => {
      mockedGetBoard.mockResolvedValue(board);
      mockedGetWorkItem.mockResolvedValue({
        ...detail,
        assignee_id: "u1",
        assignee_name: "Ana Pérez",
      });
      mockedUpdateWorkItem.mockResolvedValue(detail);

      renderPage();

      await userEvent.click(
        await screen.findByRole("button", { name: "Diseñar login" }),
      );
      await userEvent.click(
        await screen.findByRole("button", { name: "Editar" }),
      );
      const editDialog = screen.getByRole("dialog");

      await userEvent.selectOptions(
        within(editDialog).getByLabelText("Responsable"),
        "Sin asignar",
      );
      await userEvent.clear(within(editDialog).getByLabelText("Fecha límite"));
      await userEvent.click(
        screen.getByRole("button", { name: "Guardar cambios" }),
      );

      expect(mockedUpdateWorkItem).toHaveBeenCalledWith(
        PROJECT_ID,
        "1",
        expect.objectContaining({ assigneeId: undefined, dueDate: undefined }),
      );
    });

    test("si guardar falla muestra el error y conserva el formulario", async () => {
      const dialog = await openDialog();

      mockedUpdateWorkItem.mockRejectedValue(
        new Error("Error actualizando tarea"),
      );

      await userEvent.click(
        within(dialog).getByRole("button", { name: "Editar" }),
      );
      await userEvent.type(within(dialog).getByLabelText(/Título/), " v2");
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Guardar cambios" }),
      );

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "Error actualizando tarea",
      );
      expect(within(dialog).getByLabelText(/Título/)).toHaveValue(
        "Diseñar login v2",
      );
    });

    test("cancelar la edición vuelve a la ficha sin guardar", async () => {
      const dialog = await openDialog();

      await userEvent.click(
        within(dialog).getByRole("button", { name: "Editar" }),
      );
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Cancelar" }),
      );

      expect(
        within(dialog).getByRole("button", { name: "Editar" }),
      ).toBeInTheDocument();
      expect(mockedUpdateWorkItem).not.toHaveBeenCalled();
    });

    test("eliminar pide confirmación y quita la tarea del tablero", async () => {
      const dialog = await openDialog();

      mockedDeleteWorkItem.mockResolvedValue(undefined);

      await userEvent.click(
        within(dialog).getByRole("button", { name: "Eliminar" }),
      );

      const confirm = await screen.findByRole("alertdialog", {
        name: "¿Eliminar esta tarea?",
      });

      expect(mockedDeleteWorkItem).not.toHaveBeenCalled();

      await userEvent.click(
        within(confirm).getByRole("button", { name: "Eliminar" }),
      );

      expect(mockedDeleteWorkItem).toHaveBeenCalledWith(PROJECT_ID, "1");

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(screen.queryByText("Diseñar login")).not.toBeInTheDocument();
      expect(screen.getByRole("status", { name: "" })).toHaveTextContent(
        'Tarea "Diseñar login" eliminada.',
      );
    });

    test("cancelar la confirmación no elimina nada", async () => {
      const dialog = await openDialog();

      await userEvent.click(
        within(dialog).getByRole("button", { name: "Eliminar" }),
      );
      await userEvent.click(
        within(await screen.findByRole("alertdialog")).getByRole("button", {
          name: "Cancelar",
        }),
      );

      expect(mockedDeleteWorkItem).not.toHaveBeenCalled();
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    test("si eliminar falla muestra el error y la tarea sigue", async () => {
      const dialog = await openDialog();

      mockedDeleteWorkItem.mockRejectedValue(
        new Error("Error eliminando tarea"),
      );

      await userEvent.click(
        within(dialog).getByRole("button", { name: "Eliminar" }),
      );

      const confirm = await screen.findByRole("alertdialog");

      await userEvent.click(
        within(confirm).getByRole("button", { name: "Eliminar" }),
      );

      expect(await within(confirm).findByRole("alert")).toHaveTextContent(
        "Error eliminando tarea",
      );
      expect(
        within(screen.getByRole("region", { name: "Por hacer" })).getByText(
          "Diseñar login",
        ),
      ).toBeInTheDocument();
    });

    test("en un proyecto archivado la ficha es de solo lectura", async () => {
      mockedGetBoard.mockResolvedValue({
        ...board,
        project: { ...board.project, is_archived: true },
      });
      mockedGetWorkItem.mockResolvedValue(detail);

      renderPage();

      await userEvent.click(
        await screen.findByRole("button", { name: "Diseñar login" }),
      );

      const dialog = await screen.findByRole("dialog", {
        name: "Diseñar login",
      });

      expect(
        within(dialog).queryByRole("button", { name: "Editar" }),
      ).not.toBeInTheDocument();
      expect(
        within(dialog).queryByRole("button", { name: "Eliminar" }),
      ).not.toBeInTheDocument();
    });

    test("también se puede abrir la ficha de una tarea archivada", async () => {
      const archivedItem = {
        ...detail,
        id: "7",
        is_archived: true,
        status: "DONE" as const,
      };

      mockedGetBoard.mockResolvedValue({ ...board, archived: [archivedItem] });
      mockedGetWorkItem.mockResolvedValue(archivedItem);

      renderPage();

      await userEvent.click(
        await screen.findByRole("button", { name: "Archivadas (1)" }),
      );

      const section = screen.getByRole("region", { name: "Tareas archivadas" });

      await userEvent.click(
        within(section).getByRole("button", { name: "Diseñar login" }),
      );

      const dialog = await screen.findByRole("dialog", {
        name: "Diseñar login",
      });

      expect(within(dialog).getByText("Archivada")).toBeInTheDocument();
    });
  });

  describe("filtros y búsqueda", () => {
    // TODO: #1 Diseñar login (alta, tarea), #2 Corregir menú (media, error)
    // IN_PROGRESS: #3 Administrar miembros (historia, asignada a Ana)
    const filterBoard: Board = {
      ...board,
      columns: board.columns.map((column) =>
        column.status === "IN_PROGRESS"
          ? {
              ...column,
              items: column.items.map((item) => ({
                ...item,
                assignee_id: "u1",
              })),
            }
          : column,
      ),
    };

    function titlesIn(name: string) {
      const region = screen.getByRole("region", { name });

      return within(region)
        .queryAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent);
    }

    test("buscar por título deja solo las tareas que coinciden, sin tildes ni mayúsculas", async () => {
      mockedGetBoard.mockResolvedValue(filterBoard);

      renderPage();

      await userEvent.type(
        await screen.findByRole("searchbox", { name: "Buscar tareas" }),
        "DISENAR",
      );

      expect(titlesIn("Por hacer")).toEqual(["Diseñar login"]);
      expect(titlesIn("En progreso")).toEqual([]);
      expect(screen.getByText("Mostrando 1 de 3 tareas")).toBeInTheDocument();
    });

    test("buscar por #número o por el número solo", async () => {
      mockedGetBoard.mockResolvedValue(filterBoard);

      renderPage();

      const search = await screen.findByRole("searchbox", {
        name: "Buscar tareas",
      });

      await userEvent.type(search, "#2");

      expect(titlesIn("Por hacer")).toEqual(["Corregir menú"]);

      await userEvent.clear(search);
      await userEvent.type(search, "3");

      expect(titlesIn("En progreso")).toEqual(["Administrar miembros"]);
      expect(titlesIn("Por hacer")).toEqual([]);
    });

    test("filtra por tipo, prioridad y responsable", async () => {
      mockedGetBoard.mockResolvedValue(filterBoard);

      renderPage();

      await screen.findByRole("search", { name: "Filtrar tareas" });

      await userEvent.selectOptions(screen.getByLabelText("Tipo"), "Error");

      expect(titlesIn("Por hacer")).toEqual(["Corregir menú"]);

      await userEvent.selectOptions(screen.getByLabelText("Tipo"), "Todos");
      await userEvent.selectOptions(screen.getByLabelText("Prioridad"), "Alta");

      expect(titlesIn("Por hacer")).toEqual(["Diseñar login"]);

      await userEvent.selectOptions(
        screen.getByLabelText("Prioridad"),
        "Todas",
      );
      await userEvent.selectOptions(
        screen.getByLabelText("Responsable"),
        "Ana Pérez",
      );

      expect(titlesIn("En progreso")).toEqual(["Administrar miembros"]);
      expect(titlesIn("Por hacer")).toEqual([]);

      await userEvent.selectOptions(
        screen.getByLabelText("Responsable"),
        "Sin asignar",
      );

      expect(titlesIn("Por hacer")).toEqual(["Diseñar login", "Corregir menú"]);
      expect(titlesIn("En progreso")).toEqual([]);
    });

    test("los filtros se combinan y las columnas vacías dicen «Sin resultados»", async () => {
      mockedGetBoard.mockResolvedValue(filterBoard);

      renderPage();

      await screen.findByRole("search", { name: "Filtrar tareas" });
      await userEvent.selectOptions(screen.getByLabelText("Tipo"), "Error");
      await userEvent.selectOptions(screen.getByLabelText("Prioridad"), "Alta");

      expect(screen.getByText("Mostrando 0 de 3 tareas")).toBeInTheDocument();
      expect(screen.getAllByText("Sin resultados")).toHaveLength(2);
      // La columna Hecho está realmente vacía: no es un resultado de filtro
      expect(
        within(screen.getByRole("region", { name: "Hecho" })).getByText(
          "Sin elementos",
        ),
      ).toBeInTheDocument();
    });

    test("los contadores de columna no cambian al filtrar", async () => {
      mockedGetBoard.mockResolvedValue(filterBoard);

      renderPage();

      await userEvent.type(
        await screen.findByRole("searchbox", { name: "Buscar tareas" }),
        "login",
      );

      const todo = screen.getByRole("region", { name: "Por hacer" });

      expect(within(todo).getByText("2 elementos")).toBeInTheDocument();
    });

    test("Limpiar filtros restablece todo", async () => {
      mockedGetBoard.mockResolvedValue(filterBoard);

      renderPage();

      await userEvent.type(
        await screen.findByRole("searchbox", { name: "Buscar tareas" }),
        "login",
      );
      await userEvent.selectOptions(screen.getByLabelText("Tipo"), "Tarea");
      await userEvent.click(
        screen.getByRole("button", { name: "Limpiar filtros" }),
      );

      expect(screen.getByRole("searchbox")).toHaveValue("");
      expect(screen.getByLabelText("Tipo")).toHaveValue("");
      expect(titlesIn("Por hacer")).toEqual(["Diseñar login", "Corregir menú"]);
      expect(
        screen.queryByRole("button", { name: "Limpiar filtros" }),
      ).not.toBeInTheDocument();
    });

    test("los filtros se leen de la URL", async () => {
      mockedGetBoard.mockResolvedValue(filterBoard);

      renderPage("?q=menu&priority=MEDIUM");

      await screen.findByRole("search", { name: "Filtrar tareas" });

      expect(screen.getByRole("searchbox")).toHaveValue("menu");
      expect(screen.getByLabelText("Prioridad")).toHaveValue("MEDIUM");
      expect(titlesIn("Por hacer")).toEqual(["Corregir menú"]);
    });

    test("con filtros activos no se muestran los botones de reordenar", async () => {
      mockedGetBoard.mockResolvedValue(filterBoard);

      renderPage();

      expect(
        await screen.findByRole("button", { name: "Subir «Diseñar login»" }),
      ).toBeInTheDocument();

      await userEvent.type(screen.getByRole("searchbox"), "a");

      expect(
        screen.queryByRole("button", { name: /^Subir «/ }),
      ).not.toBeInTheDocument();
    });
  });

  describe("reordenar dentro de la columna", () => {
    const cardOf = (title: string) =>
      screen.getByRole("button", { name: title }).closest("article")!;
    const itemOf = (title: string) => cardOf(title).closest("li")!;

    test("Subir y Bajar mueven la tarea una posición y se deshabilitan en los extremos", async () => {
      mockedGetBoard.mockResolvedValue(board);
      mockedMoveWorkItem.mockResolvedValue(
        buildItem({ id: "1", item_number: 1, title: "Diseñar login" }),
      );

      renderPage();

      expect(
        await screen.findByRole("button", { name: "Subir «Diseñar login»" }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Bajar «Corregir menú»" }),
      ).toBeDisabled();

      await userEvent.click(
        screen.getByRole("button", { name: "Bajar «Diseñar login»" }),
      );

      expect(mockedMoveWorkItem).toHaveBeenCalledWith(
        PROJECT_ID,
        "1",
        "TODO",
        1,
      );

      await waitFor(() =>
        expect(
          within(screen.getByRole("region", { name: "Por hacer" }))
            .getAllByRole("heading", { level: 3 })
            .map((heading) => heading.textContent),
        ).toEqual(["Corregir menú", "Diseñar login"]),
      );
      expect(screen.getByRole("status", { name: "" })).toHaveTextContent(
        'Tarea "Diseñar login" movida a la posición 2 de 2.',
      );
    });

    test("arrastrar una tarjeta sobre otra la deja delante de ella", async () => {
      mockedGetBoard.mockResolvedValue(board);
      mockedMoveWorkItem.mockResolvedValue(
        buildItem({ id: "2", item_number: 2, title: "Corregir menú" }),
      );

      renderPage();

      await screen.findByRole("button", { name: "Corregir menú" });

      const dataTransfer = { setData: vi.fn() };

      fireEvent.dragStart(cardOf("Corregir menú"), { dataTransfer });
      fireEvent.dragOver(itemOf("Diseñar login"), { dataTransfer });

      // Se marca dónde caería
      expect(itemOf("Diseñar login")).toHaveClass("is-drop-before");

      fireEvent.drop(itemOf("Diseñar login"), { dataTransfer });

      expect(mockedMoveWorkItem).toHaveBeenCalledWith(
        PROJECT_ID,
        "2",
        "TODO",
        0,
      );
    });

    test("arrastrar a una tarjeta de otra columna la inserta en esa posición", async () => {
      mockedGetBoard.mockResolvedValue(board);
      mockedMoveWorkItem.mockResolvedValue(
        buildItem({
          id: "1",
          item_number: 1,
          title: "Diseñar login",
          status: "IN_PROGRESS",
        }),
      );

      renderPage();

      await screen.findByRole("button", { name: "Diseñar login" });

      const dataTransfer = { setData: vi.fn() };

      fireEvent.dragStart(cardOf("Diseñar login"), { dataTransfer });
      fireEvent.dragOver(itemOf("Administrar miembros"), { dataTransfer });
      fireEvent.drop(itemOf("Administrar miembros"), { dataTransfer });

      expect(mockedMoveWorkItem).toHaveBeenCalledWith(
        PROJECT_ID,
        "1",
        "IN_PROGRESS",
        0,
      );
    });

    test("soltar una tarjeta al fondo de su propia columna la deja la última", async () => {
      mockedGetBoard.mockResolvedValue(board);
      mockedMoveWorkItem.mockResolvedValue(
        buildItem({ id: "1", item_number: 1, title: "Diseñar login" }),
      );

      renderPage();

      await screen.findByRole("button", { name: "Diseñar login" });

      const todo = screen.getByRole("region", { name: "Por hacer" });
      const dataTransfer = { setData: vi.fn() };

      fireEvent.dragStart(cardOf("Diseñar login"), { dataTransfer });
      fireEvent.dragOver(todo, { dataTransfer });
      fireEvent.drop(todo, { dataTransfer });

      expect(mockedMoveWorkItem).toHaveBeenCalledWith(
        PROJECT_ID,
        "1",
        "TODO",
        1,
      );
    });

    test("soltar la tarjeta donde ya está no llama a la API", async () => {
      mockedGetBoard.mockResolvedValue(board);

      renderPage();

      await screen.findByRole("button", { name: "Corregir menú" });

      const todo = screen.getByRole("region", { name: "Por hacer" });
      const dataTransfer = { setData: vi.fn() };

      // La última tarjeta soltada al fondo, y la primera sobre la segunda
      fireEvent.dragStart(cardOf("Corregir menú"), { dataTransfer });
      fireEvent.dragOver(todo, { dataTransfer });
      fireEvent.drop(todo, { dataTransfer });

      fireEvent.dragStart(cardOf("Diseñar login"), { dataTransfer });
      fireEvent.dragOver(itemOf("Corregir menú"), { dataTransfer });
      fireEvent.drop(itemOf("Corregir menú"), { dataTransfer });

      expect(mockedMoveWorkItem).not.toHaveBeenCalled();
    });

    test("si la API falla la tarea no cambia de lugar y se muestra el error", async () => {
      mockedGetBoard.mockResolvedValue(board);
      mockedMoveWorkItem.mockRejectedValue(new Error("Error moviendo tarea"));

      renderPage();

      await userEvent.click(
        await screen.findByRole("button", { name: "Bajar «Diseñar login»" }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Error moviendo tarea",
      );
      expect(
        within(screen.getByRole("region", { name: "Por hacer" }))
          .getAllByRole("heading", { level: 3 })
          .map((heading) => heading.textContent),
      ).toEqual(["Diseñar login", "Corregir menú"]);
    });

    test("un proyecto archivado no permite reordenar", async () => {
      mockedGetBoard.mockResolvedValue({
        ...board,
        project: { ...board.project, is_archived: true },
      });

      renderPage();

      await screen.findByRole("button", { name: "Diseñar login" });

      expect(
        screen.queryByRole("button", { name: /^(Subir|Bajar) «/ }),
      ).not.toBeInTheDocument();
    });
  });

  describe("límite de trabajo en curso", () => {
    test("sin límite el contador muestra solo la cantidad", async () => {
      mockedGetBoard.mockResolvedValue(board);

      renderPage();

      const todo = await screen.findByRole("region", { name: "Por hacer" });

      expect(within(todo).getByText("2 elementos")).toBeInTheDocument();
    });

    test("con límite el contador muestra cantidad/límite", async () => {
      mockedGetBoard.mockResolvedValue({
        ...board,
        wip_limits: { TODO: 3, IN_PROGRESS: 1 },
      });

      renderPage();

      const todo = await screen.findByRole("region", { name: "Por hacer" });
      const inProgress = screen.getByRole("region", { name: "En progreso" });

      expect(within(todo).getByText("2/3")).toBeInTheDocument();
      expect(within(todo).getByText("2 de 3 elementos")).toBeInTheDocument();
      expect(within(inProgress).getByText("1/1")).toBeInTheDocument();
      expect(within(inProgress).getByText("1/1")).not.toHaveClass(
        "is-over-limit",
      );
    });

    test("al superar el límite la columna se marca y se avisa a lectores de pantalla", async () => {
      mockedGetBoard.mockResolvedValue({
        ...board,
        wip_limits: { TODO: 1 },
      });

      renderPage();

      const todo = await screen.findByRole("region", { name: "Por hacer" });

      expect(
        within(todo).getByText("2 elementos, supera el límite de 1"),
      ).toBeInTheDocument();
      expect(within(todo).getByText("2/1").parentElement).toHaveClass(
        "is-over-limit",
      );
    });

    test("el filtro no cambia el conteo contra el límite", async () => {
      mockedGetBoard.mockResolvedValue({
        ...board,
        wip_limits: { TODO: 1 },
      });

      renderPage("?q=login");

      const todo = await screen.findByRole("region", { name: "Por hacer" });

      expect(
        within(todo).getByText("2 elementos, supera el límite de 1"),
      ).toBeInTheDocument();
    });

    test("se configuran desde el diálogo «Límites»", async () => {
      mockedGetBoard.mockResolvedValue(board);
      mockedSaveWipLimits.mockResolvedValue({ TODO: 5, IN_PROGRESS: null });

      renderPage();

      await userEvent.click(
        await screen.findByRole("button", { name: "Límites" }),
      );

      const dialog = screen.getByRole("dialog", {
        name: "Límite de trabajo en curso",
      });

      expect(within(dialog).getByLabelText("Por hacer")).toHaveValue(null);

      await userEvent.type(within(dialog).getByLabelText("Por hacer"), "5");
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Guardar" }),
      );

      expect(mockedSaveWipLimits).toHaveBeenCalledWith(PROJECT_ID, {
        TODO: 5,
        IN_PROGRESS: null,
      });

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(
        within(screen.getByRole("region", { name: "Por hacer" })).getByText(
          "2/5",
        ),
      ).toBeInTheDocument();
    });

    test("vaciar un campo quita el límite", async () => {
      mockedGetBoard.mockResolvedValue({
        ...board,
        wip_limits: { TODO: 3, IN_PROGRESS: 2 },
      });
      mockedSaveWipLimits.mockResolvedValue({ TODO: null, IN_PROGRESS: 2 });

      renderPage();

      await userEvent.click(
        await screen.findByRole("button", { name: "Límites" }),
      );
      await userEvent.clear(
        within(screen.getByRole("dialog")).getByLabelText("Por hacer"),
      );
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

      expect(mockedSaveWipLimits).toHaveBeenCalledWith(PROJECT_ID, {
        TODO: null,
        IN_PROGRESS: 2,
      });
    });

    test("si guardar falla muestra el error y mantiene el diálogo", async () => {
      mockedGetBoard.mockResolvedValue(board);
      mockedSaveWipLimits.mockRejectedValue(
        new Error("Error guardando límites"),
      );

      renderPage();

      await userEvent.click(
        await screen.findByRole("button", { name: "Límites" }),
      );
      const limitsDialog = screen.getByRole("dialog");

      await userEvent.type(
        within(limitsDialog).getByLabelText("En progreso"),
        "2",
      );
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Error guardando límites",
      );
      expect(within(limitsDialog).getByLabelText("En progreso")).toHaveValue(2);
    });

    test("Cancelar y Escape cierran el diálogo sin guardar y devuelven el foco", async () => {
      mockedGetBoard.mockResolvedValue(board);

      renderPage();

      const open = await screen.findByRole("button", { name: "Límites" });

      await userEvent.click(open);
      await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await waitFor(() => expect(open).toHaveFocus());

      await userEvent.click(open);
      await userEvent.keyboard("{Escape}");

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(mockedSaveWipLimits).not.toHaveBeenCalled();
    });

    test("un proyecto archivado no puede cambiar los límites", async () => {
      mockedGetBoard.mockResolvedValue({
        ...board,
        project: { ...board.project, is_archived: true },
      });

      renderPage();

      await screen.findByRole("search", { name: "Filtrar tareas" });

      expect(
        screen.queryByRole("button", { name: "Límites" }),
      ).not.toBeInTheDocument();
    });
  });
});
