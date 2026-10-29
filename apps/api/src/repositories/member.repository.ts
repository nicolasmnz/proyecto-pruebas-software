import pool from '../config/database.js';

export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

// Integrantes activos del proyecto con su rol. Quien creó el proyecto es su
// dueño aunque no esté en project_members (al crear un proyecto no se
// registra ahí); si está, manda el rol de la tabla
export async function findMembersWithRole(projectId: string) {
    const result = await pool.query(
        `
        SELECT
            u.id,
            u.name,
            u.email,
            COALESCE(pm.role, 'OWNER') AS role
        FROM users u
        LEFT JOIN project_members pm
            ON pm.user_id = u.id
           AND pm.project_id = $1
        WHERE u.is_active
          AND (
              pm.id IS NOT NULL
              OR u.id = (SELECT created_by FROM projects WHERE id = $1)
          )
        ORDER BY
            CASE COALESCE(pm.role, 'OWNER')
                WHEN 'OWNER' THEN 0
                WHEN 'ADMIN' THEN 1
                WHEN 'MEMBER' THEN 2
                ELSE 3
            END,
            u.name ASC,
            u.id ASC
        `,
        [projectId]
    );

    return result.rows as {
        id: string;
        name: string;
        email: string;
        role: ProjectRole;
    }[];
}
