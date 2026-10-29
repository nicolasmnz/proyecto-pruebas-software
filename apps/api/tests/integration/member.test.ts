import request from "supertest";
import { describe, expect, test, beforeEach, afterAll } from "@jest/globals";

import app from "../../src/app.js";
import pool from "../../src/config/database.js";
import { resetTestDatabase } from "../helpers/database.js";

describe("Integrantes del proyecto API", () => {
  let creatorId: string;
  let projectId: string;

  async function addUser(name: string, email: string, isActive = true) {
    const result = await pool.query(
      `
      INSERT INTO users (name, email, password_hash, is_active)
      VALUES ($1, $2, 'hash-de-prueba', $3)
      RETURNING id
      `,
      [name, email, isActive],
    );

    return result.rows[0].id as string;
  }

  async function addMember(userId: string, role: string) {
    await pool.query(
      `
      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, $3)
      `,
      [projectId, userId, role],
    );
  }

  beforeEach(async () => {
    await resetTestDatabase();

    creatorId = await addUser("Carla Creadora", "carla@test.cl");

    const project = await pool.query(
      `
      INSERT INTO projects (name, created_by)
      VALUES ('Proyecto', $1)
      RETURNING id
      `,
      [creatorId],
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

  test("quien creó el proyecto es su dueño aunque no esté en project_members", async () => {
    const response = await request(app).get(
      `/api/projects/${projectId}/members`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: creatorId,
        name: "Carla Creadora",
        email: "carla@test.cl",
        role: "OWNER",
      },
    ]);
  });

  test("lista a los integrantes con su rol, del dueño al de solo lectura", async () => {
    const viewer = await addUser("Vera", "vera@test.cl");
    const member = await addUser("Mario", "mario@test.cl");
    const admin = await addUser("Andrea", "andrea@test.cl");

    await addMember(viewer, "VIEWER");
    await addMember(member, "MEMBER");
    await addMember(admin, "ADMIN");

    const response = await request(app).get(
      `/api/projects/${projectId}/members`,
    );

    expect(
      response.body.map((user: { name: string; role: string }) => [
        user.name,
        user.role,
      ]),
    ).toEqual([
      ["Carla Creadora", "OWNER"],
      ["Andrea", "ADMIN"],
      ["Mario", "MEMBER"],
      ["Vera", "VIEWER"],
    ]);
  });

  test("si el creador está en project_members, manda el rol de la tabla", async () => {
    await addMember(creatorId, "ADMIN");

    const response = await request(app).get(
      `/api/projects/${projectId}/members`,
    );

    expect(response.body).toHaveLength(1);
    expect(response.body[0].role).toBe("ADMIN");
  });

  test("no incluye usuarios desactivados ni de otros proyectos", async () => {
    const inactive = await addUser("Inés", "ines@test.cl", false);
    const outsider = await addUser("Óscar", "oscar@test.cl");

    await addMember(inactive, "ADMIN");

    const other = await pool.query(
      `
      INSERT INTO projects (name, created_by)
      VALUES ('Otro', $1)
      RETURNING id
      `,
      [outsider],
    );

    await pool.query(
      `
      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, 'OWNER')
      `,
      [other.rows[0].id, outsider],
    );

    const response = await request(app).get(
      `/api/projects/${projectId}/members`,
    );

    expect(response.body.map((user: { name: string }) => user.name)).toEqual([
      "Carla Creadora",
    ]);
  });

  test("responde 404 si el proyecto no existe o el id no es válido", async () => {
    for (const id of ["99999999-9999-9999-9999-999999999999", "abc"]) {
      const response = await request(app).get(`/api/projects/${id}/members`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Proyecto no encontrado");
    }
  });
});
