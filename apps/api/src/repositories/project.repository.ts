import pool from '../config/database.js';

export async function findAllProjects() {
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
        WHERE is_archived = FALSE
        ORDER BY created_at DESC
    `);

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

export async function archiveProject(id: string) {
    const result = await pool.query(
        `
        UPDATE projects
        SET is_archived = TRUE
        WHERE id = $1
        RETURNING *
        `,
        [id]
    );

    return result.rows[0];
}