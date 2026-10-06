import request from "supertest";
import { describe, expect, test, beforeEach } from "@jest/globals";
import app from "../src/app.js";
import pool from "../src/config/database.js";

const TEST_EMAIL = "usuario.test@pruebas.cl";

describe("Users API", () => {

    beforeEach(async () => {
        await pool.query(
            `
            DELETE FROM users
            WHERE email = $1
            `,
            [TEST_EMAIL]
        );
    });

    test("GET /api/users responde 200", async () => {
        const response = await request(app)
            .get("/api/users");

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    test("GET /api/users/:id obtiene usuario existente", async () => {
        const response = await request(app)
            .get(
                "/api/users/11111111-1111-1111-1111-111111111111"
            );

        expect(response.status).toBe(200);
        expect(response.body.email).toBe(
            "ana@pruebas.cl"
        );
    });

    test("GET /api/users/:id responde 404 si no existe", async () => {
        const response = await request(app)
            .get(
                "/api/users/99999999-9999-9999-9999-999999999999"
            );

        expect(response.status).toBe(404);
    });

    test("POST /api/users crea un usuario", async () => {
    const response = await request(app)
        .post("/api/users")
        .send({
            name: "Usuario Test",
            email: "usuario.test@pruebas.cl",
            password: "123456"
        });

    expect(response.status).toBe(201);
    expect(response.body.email).toBe("usuario.test@pruebas.cl");
    });
    test("POST /api/users rechaza email duplicado", async () => {
    const response = await request(app)
        .post("/api/users")
        .send({
            name: "Ana duplicada",
            email: "ana@pruebas.cl",
            password: "123456"
        });

    expect(response.status).toBe(409);
    });

});