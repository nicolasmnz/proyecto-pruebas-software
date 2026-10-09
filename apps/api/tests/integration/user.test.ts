import request from "supertest";
import { describe, expect, test, beforeEach, afterAll } from "@jest/globals";

import app from "../../src/app.js";
import pool from "../../src/config/database.js";
import { resetTestDatabase } from "../helpers/database.js";

describe("Users API", () => {
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

  test("GET /api/users responde 200", async () => {
    const response = await request(app).get("/api/users");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test("GET /api/users/:id obtiene usuario existente", async () => {
    // Preparar un usuario para esta prueba
    const result = await pool.query(
      `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      ["Ana Test", "ana@test.cl", "hash-de-prueba"],
    );

    const userId = result.rows[0].id;

    // Ejecutar petición HTTP
    const response = await request(app).get(`/api/users/${userId}`);

    // Verificar resultado
    expect(response.status).toBe(200);
    expect(response.body.email).toBe("ana@test.cl");
  });

  test("GET /api/users/:id responde 404 si no existe", async () => {
    const response = await request(app).get(
      "/api/users/99999999-9999-9999-9999-999999999999",
    );

    expect(response.status).toBe(404);
  });

  test("POST /api/users crea un usuario", async () => {
    const response = await request(app).post("/api/users").send({
      name: "Usuario Test",
      email: "usuario@test.cl",
      password: "123456",
    });

    expect(response.status).toBe(201);
    expect(response.body.email).toBe("usuario@test.cl");
  });

  test("POST /api/users rechaza email duplicado", async () => {
    // Crear un usuario directamente en PostgreSQL
    await pool.query(
      `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      `,
      ["Usuario Original", "duplicado@test.cl", "hash-de-prueba"],
    );

    // Intentar crear otro con el mismo correo
    const response = await request(app).post("/api/users").send({
      name: "Usuario Duplicado",
      email: "duplicado@test.cl",
      password: "123456",
    });

    expect(response.status).toBe(409);
  });
});
