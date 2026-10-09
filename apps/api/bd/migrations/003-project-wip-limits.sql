-- Agrega el límite de trabajo en curso por columna (projects.wip_limits).
--
-- Para bases de datos ya creadas con un schema.sql anterior. Una base nueva
-- (o tras `npm run db:reset`) ya lo incluye y no necesita este script.
--
--   docker compose exec -T db psql -U <usuario> -d <base> \
--     < apps/api/bd/migrations/003-project-wip-limits.sql

BEGIN;

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS wip_limits JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE projects
    DROP CONSTRAINT IF EXISTS chk_projects_wip_limits;

ALTER TABLE projects
    ADD CONSTRAINT chk_projects_wip_limits
        CHECK (jsonb_typeof(wip_limits) = 'object');

COMMIT;
