import pool from '../config/database.js';

// El tablero muestra el trabajo ejecutable; las épicas solo agrupan
export async function findBoardItems(projectId: string) {
    const result = await pool.query(
        `
        SELECT
            w.id,
            w.project_id,
            w.sprint_id,
            w.type,
            w.title,
            w.status,
            w.priority,
            w.estimate,
            w.position,
            w.due_date::text AS due_date,
            w.assignee_id,
            u.name AS assignee_name
        FROM work_items w
        LEFT JOIN users u ON u.id = w.assignee_id
        WHERE w.project_id = $1
          AND w.type <> 'EPIC'
        ORDER BY w.position ASC, w.created_at ASC
        `,
        [projectId]
    );

    return result.rows;
}

interface CreateWorkItemData {
    projectId: string;
    createdBy: string;
    type: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    estimate: number | null;
}

// La tarea nueva queda al final de su columna
export async function createWorkItem(data: CreateWorkItemData) {
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
            position
        )
        VALUES (
            $1, $2, $3, $4, $5, $6::varchar, $7, $8,
            (
                SELECT COALESCE(MAX(position) + 1, 0)
                FROM work_items
                WHERE project_id = $1 AND status = $6::varchar
            )
        )
        RETURNING
            id,
            project_id,
            sprint_id,
            type,
            title,
            status,
            priority,
            estimate,
            position,
            due_date::text AS due_date,
            assignee_id,
            NULL::text AS assignee_name
        `,
        [
            data.projectId,
            data.createdBy,
            data.type,
            data.title,
            data.description,
            data.status,
            data.priority,
            data.estimate
        ]
    );

    return result.rows[0];
}
