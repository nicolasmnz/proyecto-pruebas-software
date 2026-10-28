import pool from "../config/database.js";


// Columnas de una épica; due_date como texto (AAAA-MM-DD) igual que en las
// tareas, para que no se convierta a timestamp según la zona horaria
const EPIC_COLUMNS = `
    id,
    project_id,
    sprint_id,
    parent_id,
    created_by,
    assignee_id,
    type,
    title,
    description,
    status,
    priority,
    estimate,
    item_number,
    is_archived,
    position,
    due_date::text AS due_date,
    created_at,
    updated_at
`;


export async function findEpicsByProject(
    projectId: string
) {
    const result = await pool.query(
        `
        SELECT ${EPIC_COLUMNS}
        FROM work_items
        WHERE project_id = $1
          AND type = 'EPIC'
          AND is_archived = FALSE
        ORDER BY created_at DESC
        `,
        [projectId]
    );

    return result.rows;
}


// Las épicas archivadas no se pueden consultar ni recibir tareas
export async function findEpicById(
    projectId: string,
    epicId: string
) {
    const result = await pool.query(
        `
        SELECT ${EPIC_COLUMNS}
        FROM work_items
        WHERE id = $1
          AND project_id = $2
          AND type = 'EPIC'
          AND is_archived = FALSE
        `,
        [
            epicId,
            projectId
        ]
    );

    return result.rows[0];
}


export async function createEpic(
    projectId: string,
    title: string,
    description: string | null,
    priority: string,
    estimate: number | null,
    dueDate: string | null,
    createdBy: string
) {
    const result = await pool.query(
        `
        INSERT INTO work_items (
            project_id,
            created_by,
            type,
            title,
            description,
            status,
            priority,
            estimate,
            position,
            due_date
        )
        VALUES (
            $1,
            $2,
            'EPIC',
            $3,
            $4,
            'TODO',
            $5,
            $6,
            0,
            $7
        )
        RETURNING ${EPIC_COLUMNS}
        `,
        [
            projectId,
            createdBy,
            title,
            description,
            priority,
            estimate,
            dueDate
        ]
    );

    return result.rows[0];
}


export async function updateEpic(
    projectId: string,
    epicId: string,
    title: string,
    description: string | null,
    status: string,
    priority: string,
    estimate: number | null,
    dueDate: string | null
) {
    const result = await pool.query(
        `
        UPDATE work_items
        SET
            title = $1,
            description = $2,
            status = $3,
            priority = $4,
            estimate = $5,
            due_date = $6
        WHERE id = $7
          AND project_id = $8
          AND type = 'EPIC'
        RETURNING ${EPIC_COLUMNS}
        `,
        [
            title,
            description,
            status,
            priority,
            estimate,
            dueDate,
            epicId,
            projectId
        ]
    );

    return result.rows[0];
}


export async function archiveEpic(
    projectId: string,
    epicId: string
) {
    const result = await pool.query(
        `
        UPDATE work_items
        SET is_archived = TRUE
        WHERE id = $1
          AND project_id = $2
          AND type = 'EPIC'
        RETURNING ${EPIC_COLUMNS}
        `,
        [
            epicId,
            projectId
        ]
    );

    return result.rows[0];
}

export async function assignWorkItemToEpic(
    projectId: string,
    itemId: string,
    epicId: string | null
) {
    const result = await pool.query(
        `
        UPDATE work_items
        SET parent_id = $1
        WHERE id = $2
          AND project_id = $3
          AND type <> 'EPIC'
        RETURNING *
        `,
        [
            epicId,
            itemId,
            projectId
        ]
    );

    return result.rows[0];
}