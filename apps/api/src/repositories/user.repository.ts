import pool from "../config/database.js";

export async function findAllUsers() {
    const result = await pool.query(`
        SELECT
            id,
            name,
            email,
            is_active,
            created_at,
            updated_at
        FROM users
        ORDER BY created_at DESC
    `);

    return result.rows;
}


export async function findUserById(id: string) {
    const result = await pool.query(
        `
        SELECT
            id,
            name,
            email,
            is_active,
            created_at,
            updated_at
        FROM users
        WHERE id = $1
        `,
        [id]
    );

    return result.rows[0];
}


export async function findUserByEmail(email: string) {
    const result = await pool.query(
        `
        SELECT *
        FROM users
        WHERE email = $1
        `,
        [email]
    );

    return result.rows[0];
}


export async function createUser(
    name: string,
    email: string,
    password: string
) {
    const result = await pool.query(
        `
        INSERT INTO users (
            name,
            email,
            password_hash
        )
        VALUES ($1, $2, $3)
        RETURNING
            id,
            name,
            email,
            is_active,
            created_at,
            updated_at
        `,
        [
            name,
            email,
            password
        ]
    );

    return result.rows[0];
}


export async function updateUser(
    id: string,
    name: string,
    email: string
) {
    const result = await pool.query(
        `
        UPDATE users
        SET
            name = $1,
            email = $2
        WHERE id = $3
        RETURNING
            id,
            name,
            email,
            is_active,
            created_at,
            updated_at
        `,
        [
            name,
            email,
            id
        ]
    );

    return result.rows[0];
}


export async function deactivateUser(id: string) {
    const result = await pool.query(
        `
        UPDATE users
        SET is_active = FALSE
        WHERE id = $1
        RETURNING
            id,
            name,
            email,
            is_active,
            created_at,
            updated_at
        `,
        [id]
    );

    return result.rows[0];
}