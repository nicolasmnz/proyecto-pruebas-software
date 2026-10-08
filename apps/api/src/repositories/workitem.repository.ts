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
