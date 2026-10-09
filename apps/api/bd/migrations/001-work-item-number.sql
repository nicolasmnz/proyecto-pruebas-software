-- Agrega el identificador correlativo por proyecto a work_items.
--
-- Para bases de datos ya creadas con un schema.sql anterior. Una base nueva
-- (o tras `npm run db:reset`) ya lo incluye y no necesita este script.
--
--   docker compose exec -T db psql -U <usuario> -d <base> \
--     < apps/api/bd/migrations/001-work-item-number.sql

BEGIN;

ALTER TABLE work_items
    ADD COLUMN IF NOT EXISTS item_number INTEGER;

-- Numera lo existente en orden de creación, por proyecto
UPDATE work_items w
SET item_number = numbered.n
FROM (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY project_id
            ORDER BY created_at, id
        ) AS n
    FROM work_items
) numbered
WHERE w.id = numbered.id
  AND w.item_number IS NULL;

ALTER TABLE work_items
    ALTER COLUMN item_number SET NOT NULL;

ALTER TABLE work_items
    DROP CONSTRAINT IF EXISTS uq_work_items_project_number,
    DROP CONSTRAINT IF EXISTS chk_work_items_item_number;

ALTER TABLE work_items
    ADD CONSTRAINT uq_work_items_project_number
        UNIQUE (project_id, item_number),
    ADD CONSTRAINT chk_work_items_item_number
        CHECK (item_number > 0);

CREATE OR REPLACE FUNCTION assign_work_item_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.item_number IS NULL THEN
        PERFORM pg_advisory_xact_lock(hashtext(NEW.project_id::text));

        SELECT COALESCE(MAX(item_number), 0) + 1
        INTO NEW.item_number
        FROM work_items
        WHERE project_id = NEW.project_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_work_items_item_number ON work_items;

CREATE TRIGGER trg_work_items_item_number
BEFORE INSERT ON work_items
FOR EACH ROW
EXECUTE FUNCTION assign_work_item_number();

COMMIT;
