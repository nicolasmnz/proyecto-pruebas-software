import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import EpicsPage from "./EpicsPage";
import { getBoard } from "../api/board";
import type { Board, BoardItem } from "../api/board";
import { archiveEpic, createEpic, getEpics, updateEpic } from "../api/epics";
import type { Epic } from "../api/epics";
import { ApiError } from "../api/projects";

vi.mock("../api/board", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/board")>()),
  getBoard: vi.fn(),
}));

vi.mock("../api/epics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/epics")>()),
  getEpics: vi.fn(),
  createEpic: vi.fn(),
  updateEpic: vi.fn(),
  archiveEpic: vi.fn(),
}));

const mockedGetBoard = vi.mocked(getBoard);
const mockedGetEpics = vi.mocked(getEpics);
const mockedCreateEpic = vi.mocked(createEpic);
const mockedUpdateEpic = vi.mocked(updateEpic);
const mockedArchiveEpic = vi.mocked(archiveEpic);

const PROJECT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const LOGIN_EPIC_ID = "e0000000-0000-0000-0000-000000000001";
const REPORTS_EPIC_ID = "e0000000-0000-0000-0000-000000000002";

function buildItem(overrides: Partial<BoardItem>): BoardItem {
  return {
    id: "30000000-0000-0000-0000-000000000010",
    item_number: 1,
    is_archived: false,
    parent_id: null,
    sprint_id: null,
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

function buildEpic(overrides: Partial<Epic>): Epic {
  return {
    id: LOGIN_EPIC_ID,
    project_id: PROJECT_ID,
    item_number: 10,
    is_archived: false,
    type: "EPIC",
    title: "Autenticación",
    description: null,
    status: "TODO",
    priority: "MEDIUM",
    estimate: null,
    due_date: null,
    created_by: "11111111-1111-1111-1111-111111111111",
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-01T12:00:00Z",
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
        buildItem({ id: "1", parent_id: LOGIN_EPIC_ID }),
        buildItem({ id: "2" }),
      ],
    },
    { status: "IN_PROGRESS", items: [] },
    {
      status: "DONE",
      items: [buildItem({ id: "3", status: "DONE", parent_id: LOGIN_EPIC_ID })],
    },
  ],
  archived: [
    buildItem({
      id: "4",
      status: "DONE",
      is_archived: true,
      parent_id: LOGIN_EPIC_ID,
    }),
  ],
  members: [],
  wip_limits: {},
};

const epics: Epic[] = [
  buildEpic({
    title: "Autenticación",
    description: "Inicio de sesión y registro",
    priority: "HIGH",
    status: "IN_PROGRESS",
    due_date: "2026-11-30",
    estimate: 13,
  }),
  buildEpic({ id: REPORTS_EPIC_ID, item_number: 11, title: "Reportes" }),
];

function renderPage(search = "") {
  render(
    <MemoryRouter initialEntries={[`/projects/${PROJECT_ID}/epics${search}`]}>
      <Routes>
        <Route path="/projects" element={<h1>Listado</h1>} />
        <Route path="/projects/:projectId" element={<h1>Detalle</h1>} />
        <Route path="/projects/:projectId/epics" element={<EpicsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function renderLoadedPage(
  loadedBoard: Board = board,
  loadedEpics: Epic[] = epics,
  search = "",
) {
  mockedGetBoard.mockResolvedValue(loadedBoard);
  mockedGetEpics.mockResolvedValue(loadedEpics);

  renderPage(search);

  await screen.findByRole("heading", { level: 1, name: "Épicas" });
}

function epicCard(title: string) {
  return screen.getByRole("article", { name: title });
}

describe("EpicsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("muestra un indicador de carga", () => {
    mockedGetBoard.mockReturnValue(new Promise(() => {}));
    mockedGetEpics.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent("Cargando épicas");
  });

  test("lista las épicas del proyecto con sus datos", async () => {
    await renderLoadedPage();

    expect(mockedGetEpics).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.any(AbortSignal),
    );

    const list = screen.getByRole("list", { name: "Épicas del proyecto" });

    expect(within(list).getAllByRole("listitem")).toHaveLength(2);

    const login = epicCard("Autenticación");

    expect(within(login).getByText("#10")).toBeInTheDocument();
    expect(within(login).getByText("En progreso")).toBeInTheDocument();
    expect(within(login).getByText("Alta")).toBeInTheDocument();
    expect(
      within(login).getByText("Inicio de sesión y registro"),
    ).toBeInTheDocument();
    expect(within(login).getByText("13")).toBeInTheDocument();
    expect(within(login).getByText(/2026/)).toBeInTheDocument();

    expect(
      within(login).getByRole("link", { name: /Ver en el tablero/ }),
    ).toHaveAttribute(
      "href",
      `/projects/${PROJECT_ID}/board?epic=${LOGIN_EPIC_ID}`,
    );

    const reports = epicCard("Reportes");

    expect(within(reports).getByText("Sin fecha")).toBeInTheDocument();
    expect(within(reports).getByText("Sin estimar")).toBeInTheDocument();
  });

  test("calcula el avance con las tareas de cada épica, incluidas las archivadas", async () => {
    await renderLoadedPage();

    const login = epicCard("Autenticación");

    expect(
      within(login).getByText("2 de 3 tareas hechas · 67 %"),
    ).toBeInTheDocument();
    expect(
      within(login).getByRole("progressbar", {
        name: "Avance de Autenticación",
      }),
    ).toHaveAttribute("aria-valuenow", "67");

    const reports = epicCard("Reportes");

    expect(
      within(reports).getByText("Aún no tiene tareas"),
    ).toBeInTheDocument();
    expect(within(reports).getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  test("indica cuando el proyecto no tiene épicas", async () => {
    await renderLoadedPage(board, []);

    expect(
      screen.getByText(/Este proyecto aún no tiene épicas/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Épicas del proyecto" }),
    ).not.toBeInTheDocument();
  });

  test("la ruta de navegación lleva al detalle del proyecto", async () => {
    const user = userEvent.setup();

    await renderLoadedPage();

    const breadcrumb = screen.getByRole("navigation", {
      name: "Ruta de navegación",
    });

    await user.click(
      within(breadcrumb).getByRole("link", {
        name: "Sistema de Gestión de Proyectos",
      }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Detalle" }),
    ).toBeInTheDocument();
  });

  test("muestra un mensaje cuando el proyecto no existe", async () => {
    mockedGetBoard.mockRejectedValue(new ApiError("No encontrado", 404));
    mockedGetEpics.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Proyecto no encontrado" }),
    ).toBeInTheDocument();
  });

  test("muestra el error y permite reintentar", async () => {
    const user = userEvent.setup();
    mockedGetBoard.mockResolvedValue(board);
    mockedGetEpics
      .mockRejectedValueOnce(new Error("Error obteniendo épicas"))
      .mockResolvedValueOnce(epics);

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error obteniendo épicas",
    );

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("article", { name: "Autenticación" }),
    ).toBeInTheDocument();
  });

  describe("crear una épica", () => {
    test("la crea con los datos del formulario y la muestra primero", async () => {
      const user = userEvent.setup();
      mockedCreateEpic.mockResolvedValue(
        buildEpic({
          id: "e0000000-0000-0000-0000-000000000003",
          item_number: 12,
          title: "Notificaciones",
          priority: "CRITICAL",
        }),
      );

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Nueva épica" }));

      const form = screen.getByRole("region", { name: "Nueva épica" });

      await user.type(within(form).getByLabelText(/Título/), "Notificaciones");
      await user.selectOptions(
        within(form).getByLabelText("Prioridad"),
        "CRITICAL",
      );
      await user.type(within(form).getByLabelText("Puntos"), "5");
      await user.type(
        within(form).getByLabelText("Fecha límite"),
        "2026-12-15",
      );
      await user.type(
        within(form).getByLabelText("Descripción"),
        "  Correos y avisos  ",
      );
      await user.click(within(form).getByRole("button", { name: "Crear" }));

      expect(mockedCreateEpic).toHaveBeenCalledWith(PROJECT_ID, {
        title: "Notificaciones",
        description: "Correos y avisos",
        priority: "CRITICAL",
        estimate: 5,
        dueDate: "2026-12-15",
        createdBy: "11111111-1111-1111-1111-111111111111",
      });

      expect(
        await screen.findByRole("article", { name: "Notificaciones" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("region", { name: "Nueva épica" }),
      ).not.toBeInTheDocument();
      expect(
        within(
          screen.getByRole("list", { name: "Épicas del proyecto" }),
        ).getAllByRole("listitem")[0],
      ).toHaveTextContent("Notificaciones");
      expect(
        screen.getByText('Épica "Notificaciones" creada.'),
      ).toHaveAttribute("role", "status");
    });

    test("no envía el formulario sin título y no pide estado", async () => {
      const user = userEvent.setup();

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Nueva épica" }));

      const form = screen.getByRole("region", { name: "Nueva épica" });

      expect(within(form).queryByLabelText("Estado")).not.toBeInTheDocument();

      await user.type(within(form).getByLabelText(/Título/), "   ");
      await user.click(within(form).getByRole("button", { name: "Crear" }));

      expect(mockedCreateEpic).not.toHaveBeenCalled();
      expect(within(form).getByRole("alert")).toHaveTextContent(
        "El título es obligatorio.",
      );
    });

    test("muestra el error de la API y mantiene el formulario abierto", async () => {
      const user = userEvent.setup();
      mockedCreateEpic.mockRejectedValue(new Error("Prioridad inválida"));

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Nueva épica" }));

      const form = screen.getByRole("region", { name: "Nueva épica" });

      await user.type(within(form).getByLabelText(/Título/), "Notificaciones");
      await user.click(within(form).getByRole("button", { name: "Crear" }));

      expect(await within(form).findByRole("alert")).toHaveTextContent(
        "Prioridad inválida",
      );
    });

    test("con ?nueva el formulario se abre al cargar la página", async () => {
      const user = userEvent.setup();

      await renderLoadedPage(board, epics, "?nueva");

      const form = screen.getByRole("region", { name: "Nueva épica" });

      expect(within(form).getByLabelText(/Título/)).toHaveFocus();

      await user.click(within(form).getByRole("button", { name: "Cancelar" }));

      expect(
        screen.queryByRole("region", { name: "Nueva épica" }),
      ).not.toBeInTheDocument();
    });

    test("cancelar cierra el formulario y devuelve el foco", async () => {
      const user = userEvent.setup();

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Nueva épica" }));
      await user.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(
        screen.queryByRole("region", { name: "Nueva épica" }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Nueva épica" })).toHaveFocus();
    });
  });

  describe("editar una épica", () => {
    test("el formulario se abre con los datos actuales e incluye el estado", async () => {
      const user = userEvent.setup();

      await renderLoadedPage();

      const login = epicCard("Autenticación");

      await user.click(within(login).getByRole("button", { name: "Editar" }));

      expect(within(login).getByLabelText(/Título/)).toHaveValue(
        "Autenticación",
      );
      expect(within(login).getByLabelText("Estado")).toHaveValue("IN_PROGRESS");
      expect(within(login).getByLabelText("Prioridad")).toHaveValue("HIGH");
      expect(within(login).getByLabelText("Fecha límite")).toHaveValue(
        "2026-11-30",
      );
      expect(within(login).getByLabelText("Puntos")).toHaveValue(13);
    });

    test("guarda los cambios y muestra los datos nuevos", async () => {
      const user = userEvent.setup();
      mockedUpdateEpic.mockResolvedValue(
        buildEpic({ ...epics[0], title: "Acceso", status: "DONE" }),
      );

      await renderLoadedPage();

      const login = epicCard("Autenticación");

      await user.click(within(login).getByRole("button", { name: "Editar" }));

      const title = within(login).getByLabelText(/Título/);

      await user.clear(title);
      await user.type(title, "Acceso");
      await user.selectOptions(within(login).getByLabelText("Estado"), "DONE");
      await user.click(
        within(login).getByRole("button", { name: "Guardar cambios" }),
      );

      expect(mockedUpdateEpic).toHaveBeenCalledWith(PROJECT_ID, LOGIN_EPIC_ID, {
        title: "Acceso",
        description: "Inicio de sesión y registro",
        status: "DONE",
        priority: "HIGH",
        estimate: 13,
        dueDate: "2026-11-30",
      });

      const updated = await screen.findByRole("article", { name: "Acceso" });

      expect(within(updated).getByText("Hecho")).toBeInTheDocument();
      expect(
        within(updated).getByRole("button", { name: "Editar" }),
      ).toHaveFocus();
    });

    test("muestra el error de la API sin cerrar el formulario", async () => {
      const user = userEvent.setup();
      mockedUpdateEpic.mockRejectedValue(new Error("Estado inválido"));

      await renderLoadedPage();

      const login = epicCard("Autenticación");

      await user.click(within(login).getByRole("button", { name: "Editar" }));
      await user.click(
        within(login).getByRole("button", { name: "Guardar cambios" }),
      );

      expect(await within(login).findByRole("alert")).toHaveTextContent(
        "Estado inválido",
      );
      expect(within(login).getByLabelText(/Título/)).toBeInTheDocument();
    });
  });

  describe("archivar una épica", () => {
    test("pide confirmación y no archiva si se cancela", async () => {
      const user = userEvent.setup();

      await renderLoadedPage();

      await user.click(
        within(epicCard("Reportes")).getByRole("button", { name: "Archivar" }),
      );

      const dialog = screen.getByRole("alertdialog", {
        name: "¿Archivar esta épica?",
      });

      expect(dialog).toHaveTextContent("Reportes");
      expect(dialog).toHaveTextContent("Sus tareas seguirán en el tablero.");

      await user.click(
        within(dialog).getByRole("button", { name: "Cancelar" }),
      );

      expect(mockedArchiveEpic).not.toHaveBeenCalled();
      expect(epicCard("Reportes")).toBeInTheDocument();
    });

    test("al confirmar la archiva y la quita de la lista", async () => {
      const user = userEvent.setup();
      mockedArchiveEpic.mockResolvedValue({ ...epics[1], is_archived: true });

      await renderLoadedPage();

      await user.click(
        within(epicCard("Reportes")).getByRole("button", { name: "Archivar" }),
      );
      await user.click(
        within(screen.getByRole("alertdialog")).getByRole("button", {
          name: "Archivar",
        }),
      );

      expect(mockedArchiveEpic).toHaveBeenCalledWith(
        PROJECT_ID,
        REPORTS_EPIC_ID,
      );
      expect(
        screen.queryByRole("article", { name: "Reportes" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(
        screen.getByText('Épica "Reportes" archivada.'),
      ).toBeInTheDocument();
    });

    test("si falla, muestra el error dentro del diálogo", async () => {
      const user = userEvent.setup();
      mockedArchiveEpic.mockRejectedValue(new Error("Error archivando épica"));

      await renderLoadedPage();

      await user.click(
        within(epicCard("Reportes")).getByRole("button", { name: "Archivar" }),
      );

      const dialog = screen.getByRole("alertdialog");

      await user.click(
        within(dialog).getByRole("button", { name: "Archivar" }),
      );

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "Error archivando épica",
      );
      expect(epicCard("Reportes")).toBeInTheDocument();
    });
  });

  test("en un proyecto archivado las épicas son de solo lectura", async () => {
    await renderLoadedPage(
      { ...board, project: { ...board.project, is_archived: true } },
      epics,
      "?nueva",
    );

    expect(
      screen.getByText(/Este proyecto está archivado/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Nueva épica" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Nueva épica" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Editar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Archivar" }),
    ).not.toBeInTheDocument();
    // Las tareas se pueden seguir consultando en el tablero
    expect(
      within(epicCard("Reportes")).getByRole("link", {
        name: /Ver en el tablero/,
      }),
    ).toBeInTheDocument();
  });
});
