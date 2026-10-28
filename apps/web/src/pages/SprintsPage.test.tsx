import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import SprintsPage from "./SprintsPage";
import { getBoard } from "../api/board";
import type { Board, BoardItem } from "../api/board";
import { ApiError } from "../api/projects";
import { createSprint, getSprints, updateSprint } from "../api/sprints";
import type { Sprint } from "../api/sprints";

vi.mock("../api/board", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/board")>()),
  getBoard: vi.fn(),
}));

vi.mock("../api/sprints", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/sprints")>()),
  getSprints: vi.fn(),
  createSprint: vi.fn(),
  updateSprint: vi.fn(),
}));

const mockedGetBoard = vi.mocked(getBoard);
const mockedGetSprints = vi.mocked(getSprints);
const mockedCreateSprint = vi.mocked(createSprint);
const mockedUpdateSprint = vi.mocked(updateSprint);

const PROJECT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ACTIVE_ID = "50000000-0000-0000-0000-000000000001";
const PLANNED_ID = "50000000-0000-0000-0000-000000000002";
const COMPLETED_ID = "50000000-0000-0000-0000-000000000003";

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

function buildSprint(overrides: Partial<Sprint>): Sprint {
  return {
    id: PLANNED_ID,
    project_id: PROJECT_ID,
    name: "Sprint",
    goal: null,
    status: "PLANNED",
    start_date: null,
    end_date: null,
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
        buildItem({
          id: "1",
          item_number: 1,
          title: "Diseñar login",
          estimate: 3,
          sprint_id: ACTIVE_ID,
        }),
        buildItem({ id: "2", item_number: 2, title: "Corregir menú" }),
      ],
    },
    {
      status: "IN_PROGRESS",
      items: [
        buildItem({
          id: "3",
          item_number: 3,
          title: "Administrar miembros",
          status: "IN_PROGRESS",
          estimate: 5,
          sprint_id: ACTIVE_ID,
        }),
      ],
    },
    { status: "DONE", items: [] },
  ],
  archived: [
    buildItem({
      id: "4",
      item_number: 4,
      title: "Configurar entorno",
      status: "DONE",
      is_archived: true,
      sprint_id: COMPLETED_ID,
    }),
    buildItem({
      id: "5",
      item_number: 5,
      title: "Tarea vieja",
      status: "DONE",
      is_archived: true,
    }),
  ],
  members: [],
  wip_limits: {},
};

// La API los entrega del más reciente al más antiguo
const sprints: Sprint[] = [
  buildSprint({ id: PLANNED_ID, name: "Sprint 3" }),
  buildSprint({
    id: ACTIVE_ID,
    name: "Sprint 2",
    status: "ACTIVE",
    goal: "Tablero Kanban",
    start_date: "2026-10-01",
    end_date: "2026-10-14",
  }),
  buildSprint({ id: COMPLETED_ID, name: "Sprint 1", status: "COMPLETED" }),
];

function renderPage() {
  render(
    <MemoryRouter initialEntries={[`/projects/${PROJECT_ID}/sprints`]}>
      <Routes>
        <Route path="/projects" element={<h1>Listado</h1>} />
        <Route path="/projects/:projectId" element={<h1>Detalle</h1>} />
        <Route path="/projects/:projectId/sprints" element={<SprintsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function renderLoadedPage(
  loadedBoard: Board = board,
  loadedSprints: Sprint[] = sprints,
) {
  mockedGetBoard.mockResolvedValue(loadedBoard);
  mockedGetSprints.mockResolvedValue(loadedSprints);

  renderPage();

  await screen.findByRole("heading", { level: 1, name: "Sprints" });
}

function sprintCard(name: string) {
  return screen.getByRole("article", { name });
}

function backlog() {
  return screen.getByRole("region", { name: "Backlog" });
}

describe("SprintsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("muestra un indicador de carga", () => {
    mockedGetBoard.mockReturnValue(new Promise(() => {}));
    mockedGetSprints.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent("Cargando sprints");
  });

  test("lista los sprints con el activo primero y los cerrados al final", async () => {
    await renderLoadedPage();

    expect(mockedGetSprints).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.any(AbortSignal),
    );

    const list = screen.getByRole("list", { name: "Sprints del proyecto" });

    expect(
      within(list)
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(["Sprint 2", "Sprint 3", "Sprint 1"]);
  });

  test("cada sprint muestra su estado, fechas, objetivo, tareas y puntos", async () => {
    await renderLoadedPage();

    const active = sprintCard("Sprint 2");

    expect(within(active).getByText("Activo")).toBeInTheDocument();
    expect(
      within(active).getByText(/1 oct 2026 – 14 oct 2026/),
    ).toBeInTheDocument();
    expect(within(active).getByText("Tablero Kanban")).toBeInTheDocument();
    expect(within(active).getByText("2 tareas · 8 pts")).toBeInTheDocument();
    expect(within(active).getByText("Diseñar login")).toBeInTheDocument();
    expect(
      within(active).getByText("Administrar miembros"),
    ).toBeInTheDocument();

    const planned = sprintCard("Sprint 3");

    expect(within(planned).getByText("Planificado")).toBeInTheDocument();
    expect(within(planned).getByText("Sin fechas")).toBeInTheDocument();
    expect(
      within(planned).getByText("Este sprint aún no tiene tareas."),
    ).toBeInTheDocument();

    // Las tareas archivadas siguen contando en su sprint
    const completed = sprintCard("Sprint 1");

    expect(within(completed).getByText("1 tarea · 0 pts")).toBeInTheDocument();
    expect(within(completed).getByText("Archivada")).toBeInTheDocument();
  });

  test("el backlog tiene las tareas sin sprint que no están archivadas", async () => {
    await renderLoadedPage();

    expect(within(backlog()).getByText("Corregir menú")).toBeInTheDocument();
    expect(within(backlog()).getByText("1 tarea · 0 pts")).toBeInTheDocument();
    expect(
      within(backlog()).queryByText("Tarea vieja"),
    ).not.toBeInTheDocument();
    expect(
      within(backlog()).queryByText("Diseñar login"),
    ).not.toBeInTheDocument();
  });

  test("indica cuando no hay sprints ni tareas en el backlog", async () => {
    await renderLoadedPage(
      { ...board, columns: [{ status: "TODO", items: [] }], archived: [] },
      [],
    );

    expect(screen.getByText(/aún no tiene sprints/)).toBeInTheDocument();
    expect(
      within(backlog()).getByText(/No hay tareas en el backlog/),
    ).toBeInTheDocument();
  });

  describe("aviso de varios sprints activos", () => {
    test("avisa sin impedir nada cuando hay más de un sprint activo", async () => {
      await renderLoadedPage(board, [
        ...sprints,
        buildSprint({
          id: "50000000-0000-0000-0000-000000000004",
          name: "Sprint paralelo",
          status: "ACTIVE",
        }),
      ]);

      expect(
        screen.getByText(/Hay 2 sprints activos al mismo tiempo/),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Nuevo sprint" }),
      ).toBeEnabled();
    });

    test("no avisa con un solo sprint activo", async () => {
      await renderLoadedPage();

      expect(screen.queryByText(/sprints activos/)).not.toBeInTheDocument();
    });
  });

  test("la ruta de navegación lleva al detalle del proyecto", async () => {
    const user = userEvent.setup();

    await renderLoadedPage();

    await user.click(
      within(
        screen.getByRole("navigation", { name: "Ruta de navegación" }),
      ).getByRole("link", { name: "Sistema de Gestión de Proyectos" }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Detalle" }),
    ).toBeInTheDocument();
  });

  test("muestra un mensaje cuando el proyecto no existe", async () => {
    mockedGetBoard.mockRejectedValue(new ApiError("No encontrado", 404));
    mockedGetSprints.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Proyecto no encontrado" }),
    ).toBeInTheDocument();
  });

  test("muestra el error y permite reintentar", async () => {
    const user = userEvent.setup();
    mockedGetBoard.mockResolvedValue(board);
    mockedGetSprints
      .mockRejectedValueOnce(new Error("Error obteniendo sprints"))
      .mockResolvedValueOnce(sprints);

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error obteniendo sprints",
    );

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("article", { name: "Sprint 2" }),
    ).toBeInTheDocument();
  });

  describe("crear un sprint", () => {
    test("lo crea con los datos del formulario y queda Planificado", async () => {
      const user = userEvent.setup();
      mockedCreateSprint.mockResolvedValue(
        buildSprint({
          id: "50000000-0000-0000-0000-000000000005",
          name: "Sprint 4",
          goal: "Épicas",
          start_date: "2026-11-01",
          end_date: "2026-11-14",
        }),
      );

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Nuevo sprint" }));

      const form = screen.getByRole("region", { name: "Nuevo sprint" });

      expect(within(form).queryByLabelText("Estado")).not.toBeInTheDocument();

      await user.type(within(form).getByLabelText(/Nombre/), "Sprint 4");
      await user.type(
        within(form).getByLabelText("Fecha de inicio"),
        "2026-11-01",
      );
      await user.type(
        within(form).getByLabelText("Fecha de término"),
        "2026-11-14",
      );
      await user.type(within(form).getByLabelText("Objetivo"), "  Épicas  ");
      await user.click(within(form).getByRole("button", { name: "Crear" }));

      expect(mockedCreateSprint).toHaveBeenCalledWith(PROJECT_ID, {
        name: "Sprint 4",
        goal: "Épicas",
        startDate: "2026-11-01",
        endDate: "2026-11-14",
      });

      const created = await screen.findByRole("article", { name: "Sprint 4" });

      expect(within(created).getByText("Planificado")).toBeInTheDocument();
      expect(
        screen.queryByRole("region", { name: "Nuevo sprint" }),
      ).not.toBeInTheDocument();
      expect(screen.getByText('Sprint "Sprint 4" creado.')).toBeInTheDocument();
    });

    test("no lo guarda si la fecha de término es anterior a la de inicio", async () => {
      const user = userEvent.setup();

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Nuevo sprint" }));

      const form = screen.getByRole("region", { name: "Nuevo sprint" });

      await user.type(within(form).getByLabelText(/Nombre/), "Sprint 4");
      await user.type(
        within(form).getByLabelText("Fecha de inicio"),
        "2026-11-14",
      );
      await user.type(
        within(form).getByLabelText("Fecha de término"),
        "2026-11-01",
      );
      await user.click(within(form).getByRole("button", { name: "Crear" }));

      expect(mockedCreateSprint).not.toHaveBeenCalled();
      expect(within(form).getByRole("alert")).toHaveTextContent(
        "La fecha de término no puede ser anterior a la de inicio.",
      );
    });

    test("no lo guarda sin nombre", async () => {
      const user = userEvent.setup();

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Nuevo sprint" }));

      const form = screen.getByRole("region", { name: "Nuevo sprint" });

      await user.type(within(form).getByLabelText(/Nombre/), "   ");
      await user.click(within(form).getByRole("button", { name: "Crear" }));

      expect(mockedCreateSprint).not.toHaveBeenCalled();
      expect(within(form).getByRole("alert")).toHaveTextContent(
        "El nombre es obligatorio.",
      );
    });

    test("muestra el error de la API y mantiene el formulario abierto", async () => {
      const user = userEvent.setup();
      mockedCreateSprint.mockRejectedValue(new Error("Error creando sprint"));

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Nuevo sprint" }));

      const form = screen.getByRole("region", { name: "Nuevo sprint" });

      await user.type(within(form).getByLabelText(/Nombre/), "Sprint 4");
      await user.click(within(form).getByRole("button", { name: "Crear" }));

      expect(await within(form).findByRole("alert")).toHaveTextContent(
        "Error creando sprint",
      );
    });

    test("cancelar cierra el formulario y devuelve el foco", async () => {
      const user = userEvent.setup();

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Nuevo sprint" }));
      await user.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(
        screen.queryByRole("region", { name: "Nuevo sprint" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Nuevo sprint" }),
      ).toHaveFocus();
    });
  });

  describe("editar un sprint", () => {
    test("guarda los datos y el estado, y los muestra sin recargar", async () => {
      const user = userEvent.setup();
      mockedUpdateSprint.mockResolvedValue(
        buildSprint({
          ...sprints[0],
          name: "Sprint 3 bis",
          status: "ACTIVE",
        }),
      );

      await renderLoadedPage();

      const planned = sprintCard("Sprint 3");

      await user.click(within(planned).getByRole("button", { name: "Editar" }));

      expect(within(planned).getByLabelText("Estado")).toHaveValue("PLANNED");

      const name = within(planned).getByLabelText(/Nombre/);

      await user.clear(name);
      await user.type(name, "Sprint 3 bis");
      await user.selectOptions(
        within(planned).getByLabelText("Estado"),
        "ACTIVE",
      );
      await user.click(
        within(planned).getByRole("button", { name: "Guardar cambios" }),
      );

      expect(mockedUpdateSprint).toHaveBeenCalledWith(PROJECT_ID, PLANNED_ID, {
        name: "Sprint 3 bis",
        goal: undefined,
        status: "ACTIVE",
        startDate: undefined,
        endDate: undefined,
      });

      const updated = await screen.findByRole("article", {
        name: "Sprint 3 bis",
      });

      expect(within(updated).getByText("Activo")).toBeInTheDocument();
      expect(
        within(updated).getByRole("button", { name: "Editar" }),
      ).toHaveFocus();
      // Ahora hay dos sprints activos: aparece el aviso
      expect(
        screen.getByText(/Hay 2 sprints activos al mismo tiempo/),
      ).toBeInTheDocument();
    });

    test("valida las fechas también al editar", async () => {
      const user = userEvent.setup();

      await renderLoadedPage();

      const active = sprintCard("Sprint 2");

      await user.click(within(active).getByRole("button", { name: "Editar" }));

      const end = within(active).getByLabelText("Fecha de término");

      await user.clear(end);
      await user.type(end, "2026-09-01");
      await user.click(
        within(active).getByRole("button", { name: "Guardar cambios" }),
      );

      expect(mockedUpdateSprint).not.toHaveBeenCalled();
      expect(within(active).getByRole("alert")).toHaveTextContent(
        "La fecha de término no puede ser anterior a la de inicio.",
      );
    });
  });

  test("en un proyecto archivado los sprints son de solo lectura", async () => {
    await renderLoadedPage({
      ...board,
      project: { ...board.project, is_archived: true },
    });

    expect(
      screen.getByText(/Este proyecto está archivado/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Nuevo sprint" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Editar" }),
    ).not.toBeInTheDocument();
  });
});
