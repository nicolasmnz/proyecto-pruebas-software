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
    }
);