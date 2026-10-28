import pool from "../config/database.js";


export async function findSprintsByProject(
    projectId: string
) {
    const result = await pool.query(
        `
        SELECT
            id,
            project_id,
            name,
            goal,
            status,
            start_date,
            end_date,
            created_at,
            updated_at
        FROM sprints
        WHERE project_id = $1
        ORDER BY created_at DESC
        `,
        [projectId]
    );

    return result.rows;
}


export async function findSprintById(
    projectId: string,
    sprintId: string
) {
    const result = await pool.query(
        `
        SELECT
            id,
            project_id,
            name,
            goal,
            status,
            start_date,
            end_date,
            created_at,
            updated_at
        FROM sprints
        WHERE id = $1
          AND project_id = $2
        `,
        [sprintId, projectId]
    );

    return result.rows[0];
}


export async function createSprint(
    projectId: string,
    name: string,
    goal: string | null,
    startDate: string | null,
    endDate: string | null
) {
    const result = await pool.query(
        `
        INSERT INTO sprints (
            project_id,
            name,
            goal,
            status,
            start_date,
            end_date
        )
        VALUES (
            $1,
            $2,
            $3,
            'PLANNED',
            $4,
            $5
        )
        RETURNING *
        `,
        [
            projectId,
            name,
            goal,
            startDate,
            endDate
        ]
    );

    return result.rows[0];
}


export async function updateSprint(
    projectId: string,
    sprintId: string,
    name: string,
    goal: string | null,
    status: string,
    startDate: string | null,
    endDate: string | null
) {
    const result = await pool.query(
        `
        UPDATE sprints
        SET
            name = $1,
            goal = $2,
            status = $3,
            start_date = $4,
            end_date = $5
        WHERE id = $6
          AND project_id = $7
        RETURNING *
        `,
        [
            name,
            goal,
            status,
            startDate,
            endDate,
            sprintId,
            projectId
        ]
    );

    return result.rows[0];
}


export async function deleteSprint(
    projectId: string,
    sprintId: string
) {
    const result = await pool.query(
        `
        DELETE FROM sprints
        WHERE id = $1
          AND project_id = $2
        RETURNING *
        `,
        [sprintId, projectId]
    );

    return result.rows[0];
}

export async function assignWorkItemToSprint(
    projectId: string,
    itemId: string,
    sprintId: string | null
) {
    const result = await pool.query(
        `
        UPDATE work_items
        SET sprint_id = $1
        WHERE id = $2
          AND project_id = $3
        RETURNING *
        `,
        [
            sprintId,
            itemId,
            projectId
        ]
    );

    return result.rows[0];
}