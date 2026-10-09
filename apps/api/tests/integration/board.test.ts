import request from "supertest";
import { describe, expect, test, beforeEach, afterAll } from "@jest/globals";

import app from "../../src/app.js";
import pool from "../../src/config/database.js";
import { resetTestDatabase } from "../helpers/database.js";

describe("Tablero Kanban API", () => {
  let userId: string;
  let projectId: string;

  async function addItem(
    title: string,
    status: string,
    position: number,
    type = "TASK",
    assigneeId: string | null = null,
  ) {
    await pool.query(
      `
      INSERT INTO work_items
        (project_id, created_by, assignee_id, type, title, status, position)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [projectId, userId, assigneeId, type, title, status, position],
    );
  }

  beforeEach(async () => {
    await resetTestDatabase();

    const user = await pool.query(
      `
      INSERT INTO users (name, email, password_hash)
      VALUES ('Ana Pérez', 'ana@test.cl', 'hash-de-prueba')
      RETURNING id
      `,
    );
    userId = user.rows[0].id;

    const project = await pool.query(
      `
      INSERT INTO projects (name, created_by)
      VALUES ('Proyecto Kanban', $1)
      RETURNING id
      `,
      [userId],
    );
    projectId = project.rows[0].id;
  });

  afterAll(async () => {
    try {
      await resetTestDatabase();
    } finally {
      await pool.end();
    }
  });

  test("GET /api/projects/:id/board devuelve las tres columnas aunque estén vacías", async () => {
    const response = await request(app).get(`/api/projects/${projectId}/board`);

    expect(response.status).toBe(200);
    expect(response.body.project.name).toBe("Proyecto Kanban");
    expect(response.body.columns).toEqual([
      { status: "TODO", items: [] },
      { status: "IN_PROGRESS", items: [] },
      { status: "DONE", items: [] },
    ]);
  });

  test("agrupa por estado, ordena por posición y excluye épicas", async () => {
    await addItem("Segunda", "TODO", 1);
    await addItem("Primera", "TODO", 0, "BUG");
    await addItem("En curso", "IN_PROGRESS", 0, "STORY", userId);
    await addItem("Terminada", "DONE", 0);
    await addItem("Una épica", "TODO", 2, "EPIC");

    const response = await request(app).get(`/api/projects/${projectId}/board`);

    expect(response.status).toBe(200);

    const [todo, inProgress, done] = response.body.columns;

    expect(todo.items.map((item: { title: string }) => item.title)).toEqual([
      "Primera",
      "Segunda",
    ]);
    expect(inProgress.items).toHaveLength(1);
    expect(inProgress.items[0].assignee_name).toBe("Ana Pérez");
    expect(todo.items[0].assignee_name).toBeNull();
    expect(done.items).toHaveLength(1);
  });

  test("numera los elementos por proyecto en orden de creación", async () => {
    await addItem("Uno", "TODO", 0);
    await addItem("Dos", "DONE", 0);

    const other = await pool.query(
      `INSERT INTO projects (name, created_by) VALUES ('Otro', $1) RETURNING id`,
      [userId],
    );
    await pool.query(
      `INSERT INTO work_items (project_id, created_by, type, title)
       VALUES ($1, $2, 'TASK', 'Primera de otro')`,
      [other.rows[0].id, userId],
    );

    const created = await request(app)
      .post(`/api/projects/${projectId}/work-items`)
      .send({ title: "Tres", createdBy: userId });
    const otherBoard = await request(app).get(
      `/api/projects/${other.rows[0].id}/board`,
    );
    const board = await request(app).get(`/api/projects/${projectId}/board`);

    const numbers = Object.fromEntries(
      board.body.columns
        .flatMap((column: { items: unknown[] }) => column.items)
        .map((item: { title: string; item_number: number }) => [
          item.title,
          item.item_number,
        ]),
    );

    expect(numbers).toEqual({ Uno: 1, Dos: 2, Tres: 3 });
    expect(created.body.item_number).toBe(3);
    expect(otherBoard.body.columns[0].items[0].item_number).toBe(1);
  });

  test("no repite números en altas simultáneas", async () => {
    const responses = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        request(app)
          .post(`/api/projects/${projectId}/work-items`)
          .send({ title: `Tarea ${index}`, createdBy: userId }),
      ),
    );

    expect(responses.every((response) => response.status === 201)).toBe(true);
    expect(
      responses.map((response) => response.body.item_number).sort(),
    ).toEqual([1, 2, 3, 4, 5]);
  });

  test("no mezcla elementos de otros proyectos", async () => {
    const other = await pool.query(
      `INSERT INTO projects (name, created_by) VALUES ('Otro', $1) RETURNING id`,
      [userId],
    );
    await pool.query(
      `INSERT INTO work_items (project_id, created_by, type, title)
       VALUES ($1, $2, 'TASK', 'Ajena')`,
      [other.rows[0].id, userId],
    );

    const response = await request(app).get(`/api/projects/${projectId}/board`);

    expect(
      response.body.columns.flatMap(
        (column: { items: unknown[] }) => column.items,
      ),
    ).toHaveLength(0);
  });

  test("responde 404 si el proyecto no existe o el id es inválido", async () => {
    const missing = await request(app).get(
      "/api/projects/99999999-9999-9999-9999-999999999999/board",
    );
    const invalid = await request(app).get("/api/projects/1/board");

    expect(missing.status).toBe(404);
    expect(invalid.status).toBe(404);
  });

  describe("POST /api/projects/:id/work-items", () => {
    const url = () => `/api/projects/${projectId}/work-items`;

    test("crea una tarea con valores por defecto al final de la columna", async () => {
      await addItem("Existente", "TODO", 4);

      const response = await request(app)
        .post(url())
        .send({ title: "  Nueva tarea  ", createdBy: userId });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: "Nueva tarea",
        type: "TASK",
        status: "TODO",
        priority: "MEDIUM",
        estimate: null,
        position: 5,
        assignee_name: null,
      });

      const board = await request(app).get(`/api/projects/${projectId}/board`);

      expect(
        board.body.columns[0].items.map(
          (item: { title: string }) => item.title,
        ),
      ).toEqual(["Existente", "Nueva tarea"]);
    });

    test("acepta tipo, prioridad, estado, estimación y descripción", async () => {
      const response = await request(app).post(url()).send({
        title: "Error al iniciar sesión",
        description: "Falla con correos en mayúsculas",
        type: "BUG",
        priority: "CRITICAL",
        status: "IN_PROGRESS",
        estimate: 3,
        createdBy: userId,
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        type: "BUG",
        priority: "CRITICAL",
        status: "IN_PROGRESS",
        estimate: 3,
        position: 0,
      });

      const saved = await pool.query(
        "SELECT description FROM work_items WHERE id = $1",
        [response.body.id],
      );

      expect(saved.rows[0].description).toBe("Falla con correos en mayúsculas");
    });

    test.each([
      ["sin título", { title: "   " }],
      ["título demasiado largo", { title: "a".repeat(201) }],
      ["tipo inválido", { title: "x", type: "EPIC" }],
      ["prioridad inválida", { title: "x", priority: "URGENT" }],
      ["estado inválido", { title: "x", status: "BLOCKED" }],
      ["estimación negativa", { title: "x", estimate: -1 }],
      ["estimación no entera", { title: "x", estimate: 1.5 }],
    ])("responde 400 con %s", async (_name, body) => {
      const response = await request(app)
        .post(url())
        .send({ ...body, createdBy: userId });

      expect(response.status).toBe(400);
    });

    test("responde 400 si createdBy falta o no es un usuario existente", async () => {
      const missing = await request(app).post(url()).send({ title: "x" });
      const unknown = await request(app)
        .post(url())
        .send({
          title: "x",
          createdBy: "99999999-9999-9999-9999-999999999999",
        });

      expect(missing.status).toBe(400);
      expect(unknown.status).toBe(400);
    });

    test("responde 404 si el proyecto no existe", async () => {
      const response = await request(app)
        .post("/api/projects/99999999-9999-9999-9999-999999999999/work-items")
        .send({ title: "x", createdBy: userId });

      expect(response.status).toBe(404);
    });

    test("responde 409 si el proyecto está archivado", async () => {
      await pool.query("UPDATE projects SET is_archived = TRUE WHERE id = $1", [
        projectId,
      ]);

      const response = await request(app)
        .post(url())
        .send({ title: "x", createdBy: userId });

      expect(response.status).toBe(409);
    });
  });

  describe("PATCH /api/projects/:id/work-items/:itemId", () => {
    async function createItem(title: string, status: string, position: number) {
      const result = await pool.query(
        `
        INSERT INTO work_items
          (project_id, created_by, type, title, status, position)
        VALUES ($1, $2, 'TASK', $3, $4, $5)
        RETURNING id
        `,
        [projectId, userId, title, status, position],
      );

      return result.rows[0].id as string;
    }

    const url = (itemId: string) =>
      `/api/projects/${projectId}/work-items/${itemId}`;

    test("mueve la tarea al final de la columna de destino", async () => {
      const itemId = await createItem("A mover", "TODO", 0);
      await createItem("En curso 1", "IN_PROGRESS", 0);
      await createItem("En curso 2", "IN_PROGRESS", 3);

      const response = await request(app)
        .patch(url(itemId))
        .send({ status: "IN_PROGRESS" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: itemId,
        status: "IN_PROGRESS",
        position: 4,
      });

      const board = await request(app).get(`/api/projects/${projectId}/board`);
      const [todo, inProgress] = board.body.columns;

      expect(todo.items).toHaveLength(0);
      expect(
        inProgress.items.map((item: { title: string }) => item.title),
      ).toEqual(["En curso 1", "En curso 2", "A mover"]);
    });

    test("mover a una columna vacía deja la tarea en la posición 0", async () => {
      const itemId = await createItem("Sola", "TODO", 7);

      const response = await request(app)
        .patch(url(itemId))
        .send({ status: "DONE" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: "DONE", position: 0 });
    });

    test("soltar la tarea en su propia columna no cambia nada", async () => {
      const itemId = await createItem("Quieta", "TODO", 2);

      const response = await request(app)
        .patch(url(itemId))
        .send({ status: "TODO" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: "TODO", position: 2 });
    });

    test("responde 400 con un estado inválido", async () => {
      const itemId = await createItem("Tarea", "TODO", 0);

      const invalid = await request(app)
        .patch(url(itemId))
        .send({ status: "BLOCKED" });
      const missing = await request(app).patch(url(itemId)).send({});

      expect(invalid.status).toBe(400);
      expect(missing.status).toBe(400);
    });

    test("responde 404 si la tarea o el proyecto no existen", async () => {
      const itemId = await createItem("Tarea", "TODO", 0);

      const missingItem = await request(app)
        .patch(url("99999999-9999-9999-9999-999999999999"))
        .send({ status: "DONE" });
      const invalidItem = await request(app)
        .patch(url("no-es-uuid"))
        .send({ status: "DONE" });
      const missingProject = await request(app)
        .patch(
          `/api/projects/99999999-9999-9999-9999-999999999999/work-items/${itemId}`,
        )
        .send({ status: "DONE" });

      expect(missingItem.status).toBe(404);
      expect(invalidItem.status).toBe(404);
      expect(missingProject.status).toBe(404);
    });

    test("responde 404 si la tarea pertenece a otro proyecto o es una épica", async () => {
      const other = await pool.query(
        `INSERT INTO projects (name, created_by) VALUES ('Otro', $1) RETURNING id`,
        [userId],
      );
      const foreign = await pool.query(
        `INSERT INTO work_items (project_id, created_by, type, title)
         VALUES ($1, $2, 'TASK', 'Ajena') RETURNING id`,
        [other.rows[0].id, userId],
      );
      const epic = await pool.query(
        `INSERT INTO work_items (project_id, created_by, type, title)
         VALUES ($1, $2, 'EPIC', 'Épica') RETURNING id`,
        [projectId, userId],
      );

      const foreignResponse = await request(app)
        .patch(url(foreign.rows[0].id))
        .send({ status: "DONE" });
      const epicResponse = await request(app)
        .patch(url(epic.rows[0].id))
        .send({ status: "DONE" });

      expect(foreignResponse.status).toBe(404);
      expect(epicResponse.status).toBe(404);
    });

    test("responde 409 si el proyecto está archivado", async () => {
      const itemId = await createItem("Tarea", "TODO", 0);

      await pool.query("UPDATE projects SET is_archived = TRUE WHERE id = $1", [
        projectId,
      ]);

      const response = await request(app)
        .patch(url(itemId))
        .send({ status: "DONE" });

      expect(response.status).toBe(409);
    });
  });

  describe("archivado de tareas", () => {
    async function createItem(title: string, status: string, position = 0) {
      const result = await pool.query(
        `
        INSERT INTO work_items
          (project_id, created_by, type, title, status, position)
        VALUES ($1, $2, 'TASK', $3, $4, $5)
        RETURNING id
        `,
        [projectId, userId, title, status, position],
      );

      return result.rows[0].id as string;
    }

    const base = (itemId: string) =>
      `/api/projects/${projectId}/work-items/${itemId}`;

    test("archivar saca la tarea de las columnas y la lista como archivada", async () => {
      const done = await createItem("Terminada", "DONE");
      await createItem("Pendiente", "TODO");

      const response = await request(app).patch(`${base(done)}/archive`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: done, is_archived: true });

      const board = await request(app).get(`/api/projects/${projectId}/board`);

      expect(board.body.columns[2].items).toEqual([]);
      expect(board.body.columns[0].items).toHaveLength(1);
      expect(
        board.body.archived.map((item: { title: string }) => item.title),
      ).toEqual(["Terminada"]);
    });

    test("solo se pueden archivar tareas en Hecho", async () => {
      const todo = await createItem("Pendiente", "TODO");

      const response = await request(app).patch(`${base(todo)}/archive`);

      expect(response.status).toBe(409);
    });

    test("restaurar devuelve la tarea al final de Hecho", async () => {
      const first = await createItem("Primera", "DONE", 0);
      await request(app).patch(`${base(first)}/archive`);
      await createItem("Segunda", "DONE", 0);

      const response = await request(app).patch(`${base(first)}/restore`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        is_archived: false,
        status: "DONE",
        position: 1,
      });

      const board = await request(app).get(`/api/projects/${projectId}/board`);

      expect(
        board.body.columns[2].items.map(
          (item: { title: string }) => item.title,
        ),
      ).toEqual(["Segunda", "Primera"]);
      expect(board.body.archived).toEqual([]);
    });

    test("archivar y restaurar dos veces es inocuo", async () => {
      const done = await createItem("Terminada", "DONE");

      const archive = await request(app).patch(`${base(done)}/archive`);
      const archiveAgain = await request(app).patch(`${base(done)}/archive`);
      const restore = await request(app).patch(`${base(done)}/restore`);
      const restoreAgain = await request(app).patch(`${base(done)}/restore`);

      expect(archive.status).toBe(200);
      expect(archiveAgain.status).toBe(200);
      expect(restore.status).toBe(200);
      expect(restoreAgain.status).toBe(200);
      expect(restoreAgain.body.is_archived).toBe(false);
    });

    test("una tarea archivada no se puede mover", async () => {
      const done = await createItem("Terminada", "DONE");
      await request(app).patch(`${base(done)}/archive`);

      const response = await request(app)
        .patch(base(done))
        .send({ status: "TODO" });

      expect(response.status).toBe(409);
    });

    test("responde 404 si la tarea o el proyecto no existen", async () => {
      const done = await createItem("Terminada", "DONE");

      const missingItem = await request(app).patch(
        `${base("99999999-9999-9999-9999-999999999999")}/archive`,
      );
      const invalidItem = await request(app).patch(`${base("nope")}/restore`);
      const missingProject = await request(app).patch(
        `/api/projects/99999999-9999-9999-9999-999999999999/work-items/${done}/archive`,
      );

      expect(missingItem.status).toBe(404);
      expect(invalidItem.status).toBe(404);
      expect(missingProject.status).toBe(404);
    });

    test("responde 409 si el proyecto está archivado", async () => {
      const done = await createItem("Terminada", "DONE");

      await pool.query("UPDATE projects SET is_archived = TRUE WHERE id = $1", [
        projectId,
      ]);

      const response = await request(app).patch(`${base(done)}/archive`);

      expect(response.status).toBe(409);
    });
  });

  describe("detalle, edición y eliminación de tareas", () => {
    let memberId: string;
    let outsiderId: string;

    async function createItem(title = "Original") {
      const result = await pool.query(
        `
        INSERT INTO work_items
          (project_id, created_by, type, title, description, priority)
        VALUES ($1, $2, 'TASK', $3, 'Descripción original', 'LOW')
        RETURNING id
        `,
        [projectId, userId, title],
      );

      return result.rows[0].id as string;
    }

    const url = (itemId: string) =>
      `/api/projects/${projectId}/work-items/${itemId}`;

    const validBody = {
      title: "Editada",
      description: "Nueva descripción",
      type: "BUG",
      priority: "HIGH",
      estimate: 5,
      assigneeId: null as string | null,
      dueDate: "2026-12-31",
    };

    beforeEach(async () => {
      const member = await pool.query(
        `
        INSERT INTO users (name, email, password_hash)
        VALUES ('Beto Miembro', 'beto@test.cl', 'hash-de-prueba')
        RETURNING id
        `,
      );
      const outsider = await pool.query(
        `
        INSERT INTO users (name, email, password_hash)
        VALUES ('Carla Externa', 'carla@test.cl', 'hash-de-prueba')
        RETURNING id
        `,
      );

      memberId = member.rows[0].id;
      outsiderId = outsider.rows[0].id;

      await pool.query(
        "INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'MEMBER')",
        [projectId, memberId],
      );
    });

    test("el tablero lista a los miembros asignables: miembros y creador", async () => {
      const response = await request(app).get(
        `/api/projects/${projectId}/board`,
      );

      expect(response.body.members).toEqual([
        { id: userId, name: "Ana Pérez" },
        { id: memberId, name: "Beto Miembro" },
      ]);
    });

    test("GET devuelve la ficha completa de la tarea", async () => {
      const itemId = await createItem();

      const response = await request(app).get(url(itemId));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: itemId,
        title: "Original",
        description: "Descripción original",
        created_by: userId,
        created_by_name: "Ana Pérez",
        assignee_name: null,
      });
      expect(response.body.created_at).toBeDefined();
      expect(response.body.updated_at).toBeDefined();
    });

    test("GET responde 404 si la tarea no existe, es de otro proyecto o es una épica", async () => {
      const other = await pool.query(
        `INSERT INTO projects (name, created_by) VALUES ('Otro', $1) RETURNING id`,
        [userId],
      );
      const foreign = await pool.query(
        `INSERT INTO work_items (project_id, created_by, type, title)
         VALUES ($1, $2, 'TASK', 'Ajena') RETURNING id`,
        [other.rows[0].id, userId],
      );
      const epic = await pool.query(
        `INSERT INTO work_items (project_id, created_by, type, title)
         VALUES ($1, $2, 'EPIC', 'Épica') RETURNING id`,
        [projectId, userId],
      );

      for (const itemId of [
        "99999999-9999-9999-9999-999999999999",
        "no-es-uuid",
        foreign.rows[0].id,
        epic.rows[0].id,
      ]) {
        expect((await request(app).get(url(itemId))).status).toBe(404);
      }
    });

    test("PUT edita los campos y asigna a un miembro", async () => {
      const itemId = await createItem();

      const response = await request(app)
        .put(url(itemId))
        .send({ ...validBody, title: "  Editada  ", assigneeId: memberId });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        title: "Editada",
        description: "Nueva descripción",
        type: "BUG",
        priority: "HIGH",
        estimate: 5,
        assignee_id: memberId,
        assignee_name: "Beto Miembro",
        due_date: "2026-12-31",
      });
    });

    test("PUT permite quitar responsable, estimación, fecha y descripción", async () => {
      const itemId = await createItem();

      await request(app)
        .put(url(itemId))
        .send({ ...validBody, assigneeId: memberId });

      const response = await request(app).put(url(itemId)).send({
        title: "Sin extras",
        type: "TASK",
        priority: "MEDIUM",
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        description: null,
        estimate: null,
        assignee_id: null,
        assignee_name: null,
        due_date: null,
      });
    });

    test("PUT no cambia el estado ni la posición de la tarea", async () => {
      const itemId = await createItem();

      await pool.query(
        "UPDATE work_items SET status = 'IN_PROGRESS', position = 4 WHERE id = $1",
        [itemId],
      );

      const response = await request(app).put(url(itemId)).send(validBody);

      expect(response.body).toMatchObject({
        status: "IN_PROGRESS",
        position: 4,
      });
    });

    test.each([
      ["sin título", { title: " " }],
      ["título demasiado largo", { title: "a".repeat(201) }],
      ["tipo inválido", { type: "EPIC" }],
      ["sin tipo", { type: undefined }],
      ["prioridad inválida", { priority: "URGENT" }],
      ["estimación negativa", { estimate: -2 }],
      ["estimación no entera", { estimate: 1.5 }],
      ["responsable que no es un id", { assigneeId: "pepe" }],
      ["fecha con otro formato", { dueDate: "31/12/2026" }],
      ["fecha imposible", { dueDate: "2026-02-30" }],
    ])("PUT responde 400 con %s", async (_name, change) => {
      const itemId = await createItem();

      const response = await request(app)
        .put(url(itemId))
        .send({ ...validBody, ...change });

      expect(response.status).toBe(400);
    });

    test("PUT rechaza asignar a quien no es miembro del proyecto", async () => {
      const itemId = await createItem();

      const response = await request(app)
        .put(url(itemId))
        .send({ ...validBody, assigneeId: outsiderId });

      expect(response.status).toBe(400);

      const saved = await pool.query(
        "SELECT assignee_id FROM work_items WHERE id = $1",
        [itemId],
      );

      expect(saved.rows[0].assignee_id).toBeNull();
    });

    test("PUT conserva al responsable actual aunque ya no sea miembro", async () => {
      const itemId = await createItem();

      await pool.query("UPDATE work_items SET assignee_id = $2 WHERE id = $1", [
        itemId,
        outsiderId,
      ]);

      const response = await request(app)
        .put(url(itemId))
        .send({ ...validBody, assigneeId: outsiderId });

      expect(response.status).toBe(200);
      expect(response.body.assignee_id).toBe(outsiderId);
    });

    test("PUT responde 404 si la tarea o el proyecto no existen", async () => {
      const itemId = await createItem();

      const missingItem = await request(app)
        .put(url("99999999-9999-9999-9999-999999999999"))
        .send(validBody);
      const missingProject = await request(app)
        .put(
          `/api/projects/99999999-9999-9999-9999-999999999999/work-items/${itemId}`,
        )
        .send(validBody);

      expect(missingItem.status).toBe(404);
      expect(missingProject.status).toBe(404);
    });

    test("PUT y DELETE responden 409 si el proyecto está archivado", async () => {
      const itemId = await createItem();

      await pool.query("UPDATE projects SET is_archived = TRUE WHERE id = $1", [
        projectId,
      ]);

      const put = await request(app).put(url(itemId)).send(validBody);
      const del = await request(app).delete(url(itemId));

      expect(put.status).toBe(409);
      expect(del.status).toBe(409);
    });

    test("DELETE elimina la tarea", async () => {
      const itemId = await createItem();

      const response = await request(app).delete(url(itemId));

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(itemId);

      const saved = await pool.query("SELECT 1 FROM work_items WHERE id = $1", [
        itemId,
      ]);

      expect(saved.rowCount).toBe(0);
      expect((await request(app).get(url(itemId))).status).toBe(404);
    });

    test("DELETE responde 404 si la tarea no existe o es de otro proyecto", async () => {
      const other = await pool.query(
        `INSERT INTO projects (name, created_by) VALUES ('Otro', $1) RETURNING id`,
        [userId],
      );
      const foreign = await pool.query(
        `INSERT INTO work_items (project_id, created_by, type, title)
         VALUES ($1, $2, 'TASK', 'Ajena') RETURNING id`,
        [other.rows[0].id, userId],
      );

      const missing = await request(app).delete(
        url("99999999-9999-9999-9999-999999999999"),
      );
      const crossProject = await request(app).delete(url(foreign.rows[0].id));

      expect(missing.status).toBe(404);
      expect(crossProject.status).toBe(404);

      const still = await pool.query("SELECT 1 FROM work_items WHERE id = $1", [
        foreign.rows[0].id,
      ]);

      expect(still.rowCount).toBe(1);
    });
  });
});
