import request from "supertest";
import { describe, expect, test, beforeEach, afterAll } from "@jest/globals";

import app from "../../src/app.js";
import pool from "../../src/config/database.js";
import { resetTestDatabase } from "../helpers/database.js";

describe("Projects API", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    try {
      await resetTestDatabase();
    } finally {
      await pool.end();
    }
  });

  test("GET /api/projects responde 200", async () => {
    const response = await request(app).get("/api/projects");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test("GET /api/projects/:id responde 404 si no existe", async () => {
    const response = await request(app).get(
      "/api/projects/99999999-9999-9999-9999-999999999999",
    );

    expect(response.status).toBe(404);
  });

  test("GET /api/projects/:id obtiene un proyecto existente", async () => {
    // Crear un usuario para asociarlo al proyecto
    const user = await pool.query(
      `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      ["Usuario Test", "usuario@test.cl", "hash-de-prueba"],
    );

    const userId = user.rows[0].id;

    // Crear un proyecto directamente en PostgreSQL
    const project = await pool.query(
      `
      INSERT INTO projects (name, description, created_by)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      ["Proyecto Existente", "Proyecto creado para el test", userId],
    );

    const projectId = project.rows[0].id;

    // Consultar el proyecto desde la API
    const response = await request(app).get(`/api/projects/${projectId}`);

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Proyecto Existente");
  });

  test("POST /api/projects crea un proyecto", async () => {
    // Crear previamente el usuario propietario
    const user = await pool.query(
      `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      ["Usuario Creador", "creador@test.cl", "hash-de-prueba"],
    );

    const userId = user.rows[0].id;

    // Crear proyecto mediante la API
    const response = await request(app).post("/api/projects").send({
      name: "Proyecto Test",
      description: "Proyecto creado desde Jest",
      createdBy: userId,
    });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("Proyecto Test");

    // Comprobar que realmente quedó guardado
    const savedProject = await pool.query(
      "SELECT * FROM projects WHERE id = $1",
      [response.body.id],
    );

    expect(savedProject.rowCount).toBe(1);
    expect(savedProject.rows[0].created_by).toBe(userId);
  });
});
