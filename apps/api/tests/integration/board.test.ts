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
      response.body.columns.flatMap((column: { items: unknown[] }) => column.items),
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
        board.body.columns[0].items.map((item: { title: string }) => item.title),
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
        .send({ title: "x", createdBy: "99999999-9999-9999-9999-999999999999" });

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
        .patch(`/api/projects/99999999-9999-9999-9999-999999999999/work-items/${itemId}`)
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
});
