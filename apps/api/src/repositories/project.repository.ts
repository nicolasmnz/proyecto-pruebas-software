import pool from '../config/database.js';

export async function findAllProjects(archived = false) {
    const result = await pool.query(`
        SELECT
            id,
            name,
            description,
            created_by,
            is_archived,
            created_at,
            updated_at
        FROM projects
        WHERE is_archived = $1
        ORDER BY created_at DESC
    `, [archived]);

    return result.rows;
}

export async function findProjectById(id: string) {
    const result = await pool.query(
        `
        SELECT
            id,
            name,
            description,
            created_by,
            is_archived,
            created_at,
            updated_at
        FROM projects
        WHERE id = $1
        `,
        [id]
    );

    return result.rows[0];
}

interface CreateProjectData {
    name: string;
    description?: string;
    createdBy: string;
}

export async function createProject(
    data: CreateProjectData
) {
    const result = await pool.query(
        `
        INSERT INTO projects (
            name,
            description,
            created_by
        )
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [
            data.name,
            data.description ?? null,
            data.createdBy
        ]
    );

    return result.rows[0];
}

export async function updateProject(
    id: string,
    name: string,
    description: string | null
) {
    const result = await pool.query(
        `
        UPDATE projects
        SET
            name = $1,
            description = $2
        WHERE id = $3
        RETURNING *
        `,
        [
            name,
            description,
            id
        ]
    );

    return result.rows[0];
}

export async function setProjectArchived(id: string, archived: boolean) {
    const result = await pool.query(
        `
        UPDATE projects
        SET is_archived = $2
        WHERE id = $1
        RETURNING *
        `,
        [id, archived]
    );

    return result.rows[0];
}

export function archiveProject(id: string) {
    return setProjectArchived(id, true);
}

export function restoreProject(id: string) {
    return setProjectArchived(id, false);
}