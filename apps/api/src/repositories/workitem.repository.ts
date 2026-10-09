import pool from '../config/database.js';

// Forma común de un elemento del tablero en todas las consultas
const BOARD_ITEM_COLUMNS = `
    w.id,
    w.item_number,
    w.is_archived,
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
`;

const BOARD_ITEM_FROM = `
    FROM work_items w
    LEFT JOIN users u ON u.id = w.assignee_id
`;

// El tablero muestra el trabajo ejecutable; las épicas solo agrupan
export async function findBoardItems(projectId: string) {
    const result = await pool.query(
        `
        SELECT
            ${BOARD_ITEM_COLUMNS}
        ${BOARD_ITEM_FROM}
        WHERE w.project_id = $1
          AND w.type <> 'EPIC'
          AND NOT w.is_archived
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
                WHERE project_id = $1 AND status = $6::varchar AND NOT is_archived
            )
        )
        RETURNING
            id,
            item_number,
            is_archived,
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

// Usuarios activos que participan del proyecto: sus miembros y quien lo creó
export async function findProjectMembers(projectId: string) {
    const result = await pool.query(
        `
        SELECT u.id, u.name
        FROM users u
        WHERE u.is_active
          AND (
              u.id IN (
                  SELECT user_id FROM project_members WHERE project_id = $1
              )
              OR u.id = (SELECT created_by FROM projects WHERE id = $1)
          )
        ORDER BY u.name ASC, u.id ASC
        `,
        [projectId]
    );

    return result.rows;
}

export async function findBoardItem(projectId: string, itemId: string) {
    const result = await pool.query(
        `
        SELECT
            ${BOARD_ITEM_COLUMNS}
        ${BOARD_ITEM_FROM}
        WHERE w.id = $1
          AND w.project_id = $2
          AND w.type <> 'EPIC'
        `,
        [itemId, projectId]
    );

    return result.rows[0];
}

// El elemento pasa al final de la columna de destino
export async function moveWorkItem(
    projectId: string,
    itemId: string,
    status: string
) {
    await pool.query(
        `
        UPDATE work_items
        SET
            status = $3::varchar,
            position = (
                SELECT COALESCE(MAX(position) + 1, 0)
                FROM work_items
                WHERE project_id = $1
                  AND status = $3::varchar
                  AND NOT is_archived
                  AND id <> $2
            )
        WHERE id = $2
          AND project_id = $1
        `,
        [projectId, itemId, status]
    );

    return findBoardItem(projectId, itemId);
}

// Las más recientemente archivadas primero
export async function findArchivedItems(projectId: string) {
    const result = await pool.query(
        `
        SELECT
            ${BOARD_ITEM_COLUMNS}
        ${BOARD_ITEM_FROM}
        WHERE w.project_id = $1
          AND w.type <> 'EPIC'
          AND w.is_archived
        ORDER BY w.updated_at DESC, w.item_number DESC
        `,
        [projectId]
    );

    return result.rows;
}

// Al restaurar, la tarea vuelve al final de su columna
export async function setWorkItemArchived(
    projectId: string,
    itemId: string,
    archived: boolean
) {
    await pool.query(
        `
        UPDATE work_items
        SET
            is_archived = $3,
            position = CASE
                WHEN $3 THEN position
                ELSE (
                    SELECT COALESCE(MAX(position) + 1, 0)
                    FROM work_items
                    WHERE project_id = $1
                      AND status = (SELECT status FROM work_items WHERE id = $2)
                      AND NOT is_archived
                )
            END
        WHERE id = $2
          AND project_id = $1
        `,
        [projectId, itemId, archived]
    );

    return findBoardItem(projectId, itemId);
}

// Ficha completa de una tarea: el elemento del tablero más sus datos de detalle
export async function findWorkItemDetail(projectId: string, itemId: string) {
    const result = await pool.query(
        `
        SELECT
            ${BOARD_ITEM_COLUMNS},
            w.description,
            w.created_by,
            c.name AS created_by_name,
            w.created_at,
            w.updated_at
        ${BOARD_ITEM_FROM}
        JOIN users c ON c.id = w.created_by
        WHERE w.id = $1
          AND w.project_id = $2
          AND w.type <> 'EPIC'
        `,
        [itemId, projectId]
    );

    return result.rows[0];
}

interface UpdateWorkItemData {
    title: string;
    description: string | null;
    type: string;
    priority: string;
    estimate: number | null;
    assigneeId: string | null;
    dueDate: string | null;
}

export async function updateWorkItem(
    projectId: string,
    itemId: string,
    data: UpdateWorkItemData
) {
    await pool.query(
        `
        UPDATE work_items
        SET
            title = $3,
            description = $4,
            type = $5,
            priority = $6,
            estimate = $7,
            assignee_id = $8,
            due_date = $9
        WHERE id = $2
          AND project_id = $1
        `,
        [
            projectId,
            itemId,
            data.title,
            data.description,
            data.type,
            data.priority,
            data.estimate,
            data.assigneeId,
            data.dueDate
        ]
    );

    return findWorkItemDetail(projectId, itemId);
}

export async function deleteWorkItem(projectId: string, itemId: string) {
    await pool.query(
        'DELETE FROM work_items WHERE id = $1 AND project_id = $2',
        [itemId, projectId]
    );
}
