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

  describe("correos sin distinguir mayúsculas ni espacios", () => {
    test("POST /api/users guarda el correo normalizado", async () => {
      const response = await request(app).post("/api/users").send({
        name: "Usuario Test",
        email: "  Nuevo@Test.CL ",
        password: "123456",
      });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe("nuevo@test.cl");
    });

    test("POST /api/users rechaza el mismo correo con otras mayúsculas", async () => {
      await request(app).post("/api/users").send({
        name: "Usuario Original",
        email: "repetido@test.cl",
        password: "123456",
      });

      const response = await request(app).post("/api/users").send({
        name: "Usuario Duplicado",
        email: "REPETIDO@test.cl",
        password: "123456",
      });

      expect(response.status).toBe(409);
    });

    test("PUT /api/users/:id normaliza el correo y rechaza el de otro usuario", async () => {
      await request(app).post("/api/users").send({
        name: "Otro",
        email: "otro@test.cl",
        password: "123456",
      });
      const user = await request(app).post("/api/users").send({
        name: "Usuario",
        email: "usuario@test.cl",
        password: "123456",
      });

      const updated = await request(app)
        .put(`/api/users/${user.body.id}`)
        .send({ name: "Usuario", email: " Usuario.Nuevo@Test.cl " });

      expect(updated.status).toBe(200);
      expect(updated.body.email).toBe("usuario.nuevo@test.cl");

      const taken = await request(app)
        .put(`/api/users/${user.body.id}`)
        .send({ name: "Usuario", email: "OTRO@test.cl" });

      expect(taken.status).toBe(409);
    });

    test("PUT /api/users/:id permite conservar el propio correo", async () => {
      const user = await request(app).post("/api/users").send({
        name: "Usuario",
        email: "propio@test.cl",
        password: "123456",
      });

      const response = await request(app)
        .put(`/api/users/${user.body.id}`)
        .send({ name: "Usuario renombrado", email: "PROPIO@test.cl" });

      expect(response.status).toBe(200);
      expect(response.body.email).toBe("propio@test.cl");
    });
  });
});
