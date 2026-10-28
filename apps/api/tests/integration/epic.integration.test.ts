import request from "supertest";
import { describe, expect, test, beforeEach, afterAll } from "@jest/globals";
import app from "../../src/app.js";
import pool from "../../src/config/database.js";

const USER_ID =
    "91000000-0000-0000-0000-000000000001";

const PROJECT_ID =
    "91000000-0000-0000-0000-000000000002";

const ITEM_ID =
    "91000000-0000-0000-0000-000000000003";


async function prepareData() {

    await pool.query(
        `
        DELETE FROM projects
        WHERE id = $1
        `,
        [PROJECT_ID]
    );

    await pool.query(
        `
        DELETE FROM users
        WHERE id = $1
        `,
        [USER_ID]
    );


    await pool.query(
        `
        INSERT INTO users (
            id,
            name,
            email,
            password_hash
        )
        VALUES (
            $1,
            'Usuario Epic Test',
            'epic@test.cl',
            '123456'
        )
        `,
        [USER_ID]
    );


    await pool.query(
        `
        INSERT INTO projects (
            id,
            name,
            description,
            created_by
        )
        VALUES (
            $1,
            'Proyecto Epic Test',
            'Proyecto integración épicas',
            $2
        )
        `,
        [
            PROJECT_ID,
            USER_ID
        ]
    );


    await pool.query(
        `
        INSERT INTO work_items (
            id,
            project_id,
            created_by,
            type,
            title,
            status,
            priority,
            position
        )
        VALUES (
            $1,
            $2,
            $3,
            'TASK',
            'Tarea sin épica',
            'TODO',
            'MEDIUM',
            0
        )
        `,
        [
            ITEM_ID,
            PROJECT_ID,
            USER_ID
        ]
    );
}


async function createTestEpic(title: string) {

    const response =
        await request(app)
            .post(
                `/api/projects/${PROJECT_ID}/epics`
            )
            .send({
                title,
                createdBy:
                    USER_ID
            });

    return response.body;
}


describe(
    "Epics API - integración",
    () => {

        beforeEach(async () => {
            await prepareData();
        });


        afterAll(async () => {

            await pool.query(
                `
                DELETE FROM projects
                WHERE id = $1
                `,
                [PROJECT_ID]
            );

            await pool.query(
                `
                DELETE FROM users
                WHERE id = $1
                `,
                [USER_ID]
            );

            await pool.end();
        });


        test(
            "POST crea una épica",
            async () => {

                const response =
                    await request(app)

                    .post(
                        `/api/projects/${PROJECT_ID}/epics`
                    )

                    .send({
                        title:
                            "Autenticación",

                        description:
                            "Implementar autenticación",

                        priority:
                            "HIGH",

                        estimate: 13,

                        createdBy:
                            USER_ID
                    });


                expect(
                    response.status
                ).toBe(201);


                expect(
                    response.body.type
                ).toBe("EPIC");


                expect(
                    response.body.title
                ).toBe(
                    "Autenticación"
                );
            }
        );


        test(
            "GET lista solamente épicas",
            async () => {

                await request(app)
                    .post(
                        `/api/projects/${PROJECT_ID}/epics`
                    )
                    .send({
                        title:
                            "Epic test",

                        createdBy:
                            USER_ID
                    });


                const response =
                    await request(app)
                        .get(
                            `/api/projects/${PROJECT_ID}/epics`
                        );


                expect(
                    response.status
                ).toBe(200);


                for (
                    const item of
                    response.body
                ) {
                    expect(
                        item.type
                    ).toBe("EPIC");
                }
            }
        );


        test(
            "asigna una tarea a una épica",
            async () => {

                const epicResponse =
                    await request(app)

                    .post(
                        `/api/projects/${PROJECT_ID}/epics`
                    )

                    .send({
                        title:
                            "Epic asociación",

                        createdBy:
                            USER_ID
                    });


                const epicId =
                    epicResponse.body.id;


                const response =
                    await request(app)

                    .patch(
                        `/api/projects/${PROJECT_ID}/work-items/${ITEM_ID}/epic`
                    )

                    .send({
                        epicId
                    });


                expect(
                    response.status
                ).toBe(200);


                expect(
                    response.body.parent_id
                ).toBe(epicId);
            }
        );


        test(
            "quita una tarea de una épica",
            async () => {

                const response =
                    await request(app)

                    .patch(
                        `/api/projects/${PROJECT_ID}/work-items/${ITEM_ID}/epic`
                    )

                    .send({
                        epicId: null
                    });


                expect(
                    response.status
                ).toBe(200);


                expect(
                    response.body.parent_id
                ).toBeNull();
            }
        );


        test(
            "rechaza una épica inexistente",
            async () => {

                const response =
                    await request(app)

                    .patch(
                        `/api/projects/${PROJECT_ID}/work-items/${ITEM_ID}/epic`
                    )

                    .send({
                        epicId:
                            "99999999-9999-9999-9999-999999999999"
                    });


                expect(
                    response.status
                ).toBe(400);
            }
        );


        test(
            "GET obtiene una épica por id",
            async () => {

                const epic =
                    await createTestEpic(
                        "Epic detalle"
                    );


                const response =
                    await request(app)
                        .get(
                            `/api/projects/${PROJECT_ID}/epics/${epic.id}`
                        );


                expect(
                    response.status
                ).toBe(200);


                expect(
                    response.body.id
                ).toBe(epic.id);
            }
        );


        test(
            "GET responde 404 si la épica no existe",
            async () => {

                const response =
                    await request(app)
                        .get(
                            `/api/projects/${PROJECT_ID}/epics/99999999-9999-9999-9999-999999999999`
                        );


                expect(
                    response.status
                ).toBe(404);
            }
        );


        test(
            "PUT actualiza una épica",
            async () => {

                const epic =
                    await createTestEpic(
                        "Epic original"
                    );


                const response =
                    await request(app)

                    .put(
                        `/api/projects/${PROJECT_ID}/epics/${epic.id}`
                    )

                    .send({
                        title:
                            "Epic editada",

                        status:
                            "IN_PROGRESS",

                        priority:
                            "CRITICAL",

                        estimate: 8
                    });


                expect(
                    response.status
                ).toBe(200);


                expect(
                    response.body
                ).toMatchObject({
                    id: epic.id,
                    title: "Epic editada",
                    status: "IN_PROGRESS",
                    priority: "CRITICAL",
                    estimate: 8
                });
            }
        );


        test(
            "DELETE archiva una épica y la saca del listado",
            async () => {

                const epic =
                    await createTestEpic(
                        "Epic a archivar"
                    );


                const response =
                    await request(app)
                        .delete(
                            `/api/projects/${PROJECT_ID}/epics/${epic.id}`
                        );


                expect(
                    response.status
                ).toBe(200);


                expect(
                    response.body.epic.is_archived
                ).toBe(true);


                const list =
                    await request(app)
                        .get(
                            `/api/projects/${PROJECT_ID}/epics`
                        );


                expect(
                    list.body.map(
                        (item: { id: string }) => item.id
                    )
                ).not.toContain(epic.id);
            }
        );


        test(
            "rechaza asignar una tarea a una épica archivada",
            async () => {

                const epic =
                    await createTestEpic(
                        "Epic archivada"
                    );


                await request(app)
                    .delete(
                        `/api/projects/${PROJECT_ID}/epics/${epic.id}`
                    );


                const response =
                    await request(app)

                    .patch(
                        `/api/projects/${PROJECT_ID}/work-items/${ITEM_ID}/epic`
                    )

                    .send({
                        epicId:
                            epic.id
                    });


                expect(
                    response.status
                ).toBe(400);
            }
        );


        test(
            "GET responde 404 si la épica está archivada",
            async () => {

                const epic =
                    await createTestEpic(
                        "Epic archivada"
                    );


                await request(app)
                    .delete(
                        `/api/projects/${PROJECT_ID}/epics/${epic.id}`
                    );


                const response =
                    await request(app)
                        .get(
                            `/api/projects/${PROJECT_ID}/epics/${epic.id}`
                        );


                expect(
                    response.status
                ).toBe(404);
            }
        );


        test.each([
            ["GET", `/api/projects/abc/epics`],
            ["GET", `/api/projects/${PROJECT_ID}/epics/abc`],
            ["PUT", `/api/projects/${PROJECT_ID}/epics/abc`],
            ["DELETE", `/api/projects/${PROJECT_ID}/epics/abc`]
        ])(
            "%s %s con un id inválido responde 404",
            async (method, url) => {

                const response =
                    await request(app)
                        [method.toLowerCase() as "get" | "put" | "delete"](url)
                        .send({
                            title:
                                "Epic",

                            status:
                                "TODO",

                            priority:
                                "MEDIUM"
                        });


                expect(
                    response.status
                ).toBe(404);
            }
        );


        test(
            "POST rechaza un createdBy con formato inválido",
            async () => {

                const response =
                    await request(app)

                    .post(
                        `/api/projects/${PROJECT_ID}/epics`
                    )

                    .send({
                        title:
                            "Epic",

                        createdBy:
                            "abc"
                    });


                expect(
                    response.status
                ).toBe(400);
            }
        );


        test(
            "rechaza asignar una épica con id inválido",
            async () => {

                const response =
                    await request(app)

                    .patch(
                        `/api/projects/${PROJECT_ID}/work-items/${ITEM_ID}/epic`
                    )

                    .send({
                        epicId:
                            "abc"
                    });


                expect(
                    response.status
                ).toBe(400);
            }
        );


        test(
            "responde 404 al asignar épica a una tarea con id inválido",
            async () => {

                const response =
                    await request(app)

                    .patch(
                        `/api/projects/${PROJECT_ID}/work-items/abc/epic`
                    )

                    .send({
                        epicId: null
                    });


                expect(
                    response.status
                ).toBe(404);
            }
        );


        test.each([
            ["estimate negativo", { estimate: -1 }],
            ["estimate decimal", { estimate: 1.5 }],
            ["dueDate inválida", { dueDate: "2026-13-45" }],
            ["title demasiado largo", { title: "a".repeat(201) }]
        ])(
            "POST rechaza %s",
            async (_case, fields) => {

                const response =
                    await request(app)

                    .post(
                        `/api/projects/${PROJECT_ID}/epics`
                    )

                    .send({
                        title:
                            "Epic",

                        createdBy:
                            USER_ID,

                        ...fields
                    });


                expect(
                    response.status
                ).toBe(400);
            }
        );


        test.each([
            ["estimate negativo", { estimate: -1 }],
            ["dueDate inválida", { dueDate: "mañana" }]
        ])(
            "PUT rechaza %s",
            async (_case, fields) => {

                const epic =
                    await createTestEpic(
                        "Epic a validar"
                    );


                const response =
                    await request(app)

                    .put(
                        `/api/projects/${PROJECT_ID}/epics/${epic.id}`
                    )

                    .send({
                        title:
                            "Epic",

                        status:
                            "TODO",

                        priority:
                            "MEDIUM",

                        ...fields
                    });


                expect(
                    response.status
                ).toBe(400);
            }
        );


        test(
            "POST responde 404 si el proyecto no existe",
            async () => {

                const response =
                    await request(app)

                    .post(
                        `/api/projects/99999999-9999-9999-9999-999999999999/epics`
                    )

                    .send({
                        title:
                            "Epic",

                        createdBy:
                            USER_ID
                    });


                expect(
                    response.status
                ).toBe(404);
            }
        );


        test(
            "POST rechaza un createdBy que no existe",
            async () => {

                const response =
                    await request(app)

                    .post(
                        `/api/projects/${PROJECT_ID}/epics`
                    )

                    .send({
                        title:
                            "Epic",

                        createdBy:
                            "99999999-9999-9999-9999-999999999999"
                    });


                expect(
                    response.status
                ).toBe(400);
            }
        );
    }
);
