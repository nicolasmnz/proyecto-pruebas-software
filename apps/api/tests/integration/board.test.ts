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
});
