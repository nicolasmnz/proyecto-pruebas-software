import request from "supertest";
import { describe, expect, test, beforeEach, afterAll } from "@jest/globals";

import app from "../../src/app.js";
import pool from "../../src/config/database.js";
import { resetTestDatabase } from "../helpers/database.js";

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
});
