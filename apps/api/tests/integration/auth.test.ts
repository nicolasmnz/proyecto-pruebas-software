import request from "supertest";
import { describe, expect, test, beforeEach, afterAll } from "@jest/globals";

import app from "../../src/app.js";
import pool from "../../src/config/database.js";
import { resetTestDatabase } from "../helpers/database.js";
import { hashPassword } from "../../src/utils/password.js";

describe("Auth API", () => {
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

  test("POST /api/users guarda la contraseña hasheada", async () => {
    await request(app).post("/api/users").send({
      name: "Usuario Test",
      email: "hash@test.cl",
      password: "123456",
    });

    const result = await pool.query(
      "SELECT password_hash FROM users WHERE email = $1",
      ["hash@test.cl"],
    );

    expect(result.rows[0].password_hash).not.toBe("123456");
    expect(result.rows[0].password_hash).toMatch(/^scrypt\$/);
  });

  test("POST /api/auth/login responde 200 con credenciales válidas", async () => {
    await request(app).post("/api/users").send({
      name: "Usuario Test",
      email: "login@test.cl",
      password: "123456",
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "login@test.cl",
      password: "123456",
    });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("login@test.cl");
    expect(response.body.user).not.toHaveProperty("password_hash");
  });

  test("POST /api/auth/login responde 401 con contraseña incorrecta", async () => {
    await request(app).post("/api/users").send({
      name: "Usuario Test",
      email: "login@test.cl",
      password: "123456",
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "login@test.cl",
      password: "incorrecta",
    });

    expect(response.status).toBe(401);
  });

  test.each([
    ["en mayúsculas", "LOGIN@Test.cl"],
    ["con espacios alrededor", "  login@test.cl "],
  ])(
    "POST /api/auth/login acepta el correo %s",
    async (_case, email) => {
      await request(app).post("/api/users").send({
        name: "Usuario Test",
        email: "login@test.cl",
        password: "123456",
      });

      const response = await request(app).post("/api/auth/login").send({
        email,
        password: "123456",
      });

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe("login@test.cl");
    },
  );

  test("POST /api/auth/login encuentra cuentas guardadas con mayúsculas", async () => {
    // Una cuenta creada antes de normalizar los correos
    await pool.query(
      `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      `,
      ["Usuario Antiguo", "Antiguo@Test.cl", await hashPassword("123456")],
    );

    const response = await request(app).post("/api/auth/login").send({
      email: "antiguo@test.cl",
      password: "123456",
    });

    expect(response.status).toBe(200);
  });

  test.each([
    ["password numérico", { email: "login@test.cl", password: 123456 }],
    ["email numérico", { email: 123, password: "123456" }],
    ["password como objeto", { email: "login@test.cl", password: {} }],
  ])("POST /api/auth/login responde 400 con %s", async (_case, body) => {
    await request(app).post("/api/users").send({
      name: "Usuario Test",
      email: "login@test.cl",
      password: "123456",
    });

    const response = await request(app).post("/api/auth/login").send(body);

    expect(response.status).toBe(400);
  });

  describe("cuenta desactivada", () => {
    beforeEach(async () => {
      const created = await request(app).post("/api/users").send({
        name: "Usuario Inactivo",
        email: "inactivo@test.cl",
        password: "123456",
      });

      await request(app).delete(`/api/users/${created.body.id}`);
    });

    test("con contraseña incorrecta responde 401 y no revela que está desactivada", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "inactivo@test.cl",
        password: "incorrecta",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Correo o contraseña incorrectos");
    });

    test("con la contraseña correcta responde 403", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "inactivo@test.cl",
        password: "123456",
      });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Usuario desactivado");
    });
  });
});
