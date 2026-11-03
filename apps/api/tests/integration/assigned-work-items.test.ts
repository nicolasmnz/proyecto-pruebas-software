import request from "supertest";
import { describe, expect, test, beforeEach, afterAll } from "@jest/globals";

import app from "../../src/app.js";
import pool from "../../src/config/database.js";
import { resetTestDatabase } from "../helpers/database.js";

describe("Tareas asignadas a un usuario API", () => {
  let anaId: string;
  let betoId: string;

  async function addUser(name: string, email: string) {
    const result = await pool.query(
      `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, 'hash-de-prueba')
      RETURNING id
      `,
      [name, email],
    );

    return result.rows[0].id as string;
  }

  async function addProject(name: string, isArchived = false) {
    const result = await pool.query(
      `
      INSERT INTO projects (name, created_by, is_archived)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [name, anaId, isArchived],
    );

    return result.rows[0].id as string;
  }

  async function addItem(
    projectId: string,
    title: string,
    options: {
      assigneeId?: string | null;
      type?: string;
      status?: string;
      dueDate?: string | null;
      isArchived?: boolean;
    } = {},
  ) {
    await pool.query(
      `
      INSERT INTO work_items
        (project_id, created_by, assignee_id, type, title, status, due_date, is_archived)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        projectId,
        anaId,
        options.assigneeId === undefined ? anaId : options.assigneeId,
        options.type ?? "TASK",
        title,
        options.status ?? "TODO",
        options.dueDate ?? null,
        options.isArchived ?? false,
      ],
    );
  }

  function titles(body: { title: string }[]) {
    return body.map((item) => item.title);
  }

  beforeEach(async () => {
    await resetTestDatabase();

    anaId = await addUser("Ana Pérez", "ana@test.cl");
    betoId = await addUser("Beto Soto", "beto@test.cl");
  });

  afterAll(async () => {
    try {
      await resetTestDatabase();
    } finally {
      await pool.end();
    }
  });

  test("devuelve las tareas del usuario en todos sus proyectos con el nombre del proyecto", async () => {
    const web = await addProject("Web");
    const mobile = await addProject("App móvil");

    await addItem(web, "Login", { dueDate: "2026-11-10" });
    await addItem(mobile, "Notificaciones", { dueDate: "2026-11-05" });
    await addItem(web, "De Beto", { assigneeId: betoId });
    await addItem(web, "Sin asignar", { assigneeId: null });

    const response = await request(app).get(`/api/users/${anaId}/work-items`);

    expect(response.status).toBe(200);
    expect(titles(response.body)).toEqual(["Notificaciones", "Login"]);
    expect(response.body[0]).toMatchObject({
      project_id: mobile,
      project_name: "App móvil",
      type: "TASK",
      status: "TODO",
      priority: "MEDIUM",
      due_date: "2026-11-05",
      assignee_id: anaId,
      assignee_name: "Ana Pérez",
    });
    expect(response.body[0].item_number).toEqual(expect.any(Number));
  });

  test("ordena por fecha límite y deja al final las tareas sin fecha", async () => {
    const web = await addProject("Web");

    await addItem(web, "Sin fecha");
    await addItem(web, "Diciembre", { dueDate: "2026-12-01" });
    await addItem(web, "Octubre", { dueDate: "2026-10-01" });

    const response = await request(app).get(`/api/users/${anaId}/work-items`);

    expect(titles(response.body)).toEqual([
      "Octubre",
      "Diciembre",
      "Sin fecha",
    ]);
  });

  test("incluye las terminadas, pero no épicas, archivadas ni proyectos archivados", async () => {
    const web = await addProject("Web");
    const old = await addProject("Antiguo", true);

    await addItem(web, "Terminada", { status: "DONE" });
    await addItem(web, "Una épica", { type: "EPIC" });
    await addItem(web, "Archivada", { status: "DONE", isArchived: true });
    await addItem(old, "De un proyecto archivado");

    const response = await request(app).get(`/api/users/${anaId}/work-items`);

    expect(titles(response.body)).toEqual(["Terminada"]);
  });

  test("un usuario sin tareas recibe una lista vacía", async () => {
    const response = await request(app).get(`/api/users/${betoId}/work-items`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test("responde 404 si el usuario no existe o el id no es válido", async () => {
    for (const id of ["99999999-9999-9999-9999-999999999999", "abc"]) {
      const response = await request(app).get(`/api/users/${id}/work-items`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Usuario no encontrado");
    }
  });
});
