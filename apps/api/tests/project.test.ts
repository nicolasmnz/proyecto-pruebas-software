import request from "supertest";
import { describe, expect, test } from "@jest/globals";
import app from "../src/app.js";

describe("Projects API", () => {

    test("GET /api/projects responde 200", async () => {
        const response = await request(app)
            .get("/api/projects");

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    test("GET /api/projects/:id responde 404 si no existe", async () => {
        const response = await request(app)
            .get(
                "/api/projects/99999999-9999-9999-9999-999999999999"
            );

        expect(response.status).toBe(404);
    });

    test("GET /api/projects/:id obtiene un proyecto existente", async () => {
    const response = await request(app)
        .get(
            "/api/projects/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        );

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Sistema de Gestión de Proyectos");
    });

    test("POST /api/projects crea un proyecto", async () => {
    const response = await request(app)
        .post("/api/projects")
        .send({
            name: "Proyecto Test",
            description: "Proyecto creado desde Jest",
            createdBy:
                "11111111-1111-1111-1111-111111111111"
        });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("Proyecto Test");
    });

});