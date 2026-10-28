import request from "supertest";
import { describe, expect, test, beforeEach, afterAll } from "@jest/globals";
import app from "../../src/app.js";
import pool from "../../src/config/database.js";


const USER_ID =
    "90000000-0000-0000-0000-000000000001";

const PROJECT_ID =
    "90000000-0000-0000-0000-000000000002";

const ITEM_ID =
    "20000000-0000-0000-0000-000000000001";


async function prepareData() {

    /*
     * Limpiamos desde el padre.
     * Los CASCADE eliminan work_items y sprints.
     */
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
            'Usuario Sprint Test',
            'sprint@test.cl',
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
            'Proyecto Sprint Test',
            'Proyecto de integración',
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
            'Tarea integración',
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
    "Sprints API - integración",
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
            "POST crea un sprint",
            async () => {

                const response =
                    await request(app)

                    .post(
                        `/api/projects/${PROJECT_ID}/sprints`
                    )

                    .send({
                        name:"Sprint Integración",
                        goal:"Probar API",
                        startDate:"2026-11-01",
                        endDate:"2026-11-14"
                    });


                expect(
                    response.status
                ).toBe(201);


                expect(
                    response.body.name
                ).toBe(
                    "Sprint Integración"
                );


                expect(
                    response.body.status
                ).toBe(
                    "PLANNED"
                );
            }
        );


        test(
            "POST rechaza fechas inválidas",
            async () => {

                const response =
                    await request(app)

                    .post(
                        `/api/projects/${PROJECT_ID}/sprints`
                    )

                    .send({
                        name:
                            "Sprint inválido",

                        startDate:
                            "2026-11-15",

                        endDate:
                            "2026-11-01"
                    });


                expect(
                    response.status
                ).toBe(400);
            }
        );


        test(
            "GET lista los sprints del proyecto",
            async () => {

                await request(app)
                    .post(
                        `/api/projects/${PROJECT_ID}/sprints`
                    )
                    .send({
                        name:
                            "Sprint 1"
                    });


                const response =
                    await request(app)
                        .get(
                            `/api/projects/${PROJECT_ID}/sprints`
                        );


                expect(
                    response.status
                ).toBe(200);


                expect(
                    Array.isArray(
                        response.body
                    )
                ).toBe(true);


                expect(
                    response.body.length
                ).toBeGreaterThan(0);
            }
        );


        test(
            "asigna una tarea a un sprint",
            async () => {

                const sprintResponse =
                    await request(app)

                    .post(
                        `/api/projects/${PROJECT_ID}/sprints`
                    )

                    .send({
                        name:
                            "Sprint asignación"
                    });


                const sprintId =
                    sprintResponse.body.id;


                const response =
                    await request(app)

                    .patch(
                        `/api/projects/${PROJECT_ID}/work-items/${ITEM_ID}/sprint`
                    )

                    .send({
                        sprintId
                    });


                expect(
                    response.status
                ).toBe(200);


                expect(
                    response.body.sprint_id
                ).toBe(sprintId);
            }
        );


        test(
            "puede devolver una tarea al backlog",
            async () => {

                const response =
                    await request(app)

                    .patch(
                        `/api/projects/${PROJECT_ID}/work-items/${ITEM_ID}/sprint`
                    )

                    .send({
                        sprintId: null
                    });


                expect(
                    response.status
                ).toBe(200);


                expect(
                    response.body.sprint_id
                ).toBeNull();
            }
        );
    }
);