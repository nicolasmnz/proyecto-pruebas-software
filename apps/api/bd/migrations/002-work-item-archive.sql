-- Agrega el archivado de tareas (work_items.is_archived).
--
-- Para bases de datos ya creadas con un schema.sql anterior. Una base nueva
-- (o tras `npm run db:reset`) ya lo incluye y no necesita este script.
--
--   docker compose exec -T db psql -U <usuario> -d <base> \
--     < apps/api/bd/migrations/002-work-item-archive.sql

BEGIN;

ALTER TABLE work_items
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
