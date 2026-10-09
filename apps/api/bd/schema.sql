BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_users_email UNIQUE (email)
);


CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,
    description TEXT,

    created_by UUID NOT NULL,

    is_archived BOOLEAN NOT NULL DEFAULT FALSE,

    -- Límite de trabajo en curso por columna del tablero, p. ej.
    -- {"IN_PROGRESS": 3}. Una columna sin clave no tiene límite
    wip_limits JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_projects_wip_limits
        CHECK (
            jsonb_typeof(wip_limits) = 'object'
        ),

    CONSTRAINT fk_projects_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
);


CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL,
    user_id UUID NOT NULL,

    role VARCHAR(30) NOT NULL DEFAULT 'MEMBER',

    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_project_members_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_project_members_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_project_members_project_user
        UNIQUE (project_id, user_id),

    CONSTRAINT chk_project_members_role
        CHECK (
            role IN (
                'OWNER',
                'ADMIN',
                'MEMBER',
                'VIEWER'
            )
        )
);


CREATE TABLE sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL,

    name VARCHAR(100) NOT NULL,
    goal TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',

    start_date DATE,
    end_date DATE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sprints_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_sprints_status
        CHECK (
            status IN (
                'PLANNED',
                'ACTIVE',
                'COMPLETED',
                'CANCELLED'
            )
        ),

    CONSTRAINT chk_sprints_dates
        CHECK (
            start_date IS NULL
            OR end_date IS NULL
            OR end_date >= start_date
        )
);


-- work_items representa:
-- EPIC
-- STORY
-- TASK
-- BUG

CREATE TABLE work_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL,

    -- NULL = elemento ubicado en backlog
    sprint_id UUID,

    -- Permite EPIC -> STORY -> TASK
    parent_id UUID,

    created_by UUID NOT NULL,

    -- Puede estar sin asignar
    assignee_id UUID,

    type VARCHAR(20) NOT NULL,

    title VARCHAR(200) NOT NULL,
    description TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'TODO',

    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',

    -- Story Points / estimación
    estimate INTEGER,

    -- Identificador legible, correlativo por proyecto (#1, #2, ...).
    -- Lo asigna el trigger trg_work_items_item_number al insertar
    item_number INTEGER NOT NULL,

    -- Las tareas terminadas se archivan para despejar el tablero
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,

    -- Orden dentro de una columna Kanban
    position INTEGER NOT NULL DEFAULT 0,

    due_date DATE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_work_items_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_work_items_sprint
        FOREIGN KEY (sprint_id)
        REFERENCES sprints(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_work_items_parent
        FOREIGN KEY (parent_id)
        REFERENCES work_items(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_work_items_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_work_items_assignee
        FOREIGN KEY (assignee_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_work_items_type
        CHECK (
            type IN (
                'EPIC',
                'STORY',
                'TASK',
                'BUG'
            )
        ),

    CONSTRAINT chk_work_items_status
        CHECK (
            status IN (
                'TODO',
                'IN_PROGRESS',
                'DONE'
            )
        ),

    CONSTRAINT chk_work_items_priority
        CHECK (
            priority IN (
                'LOW',
                'MEDIUM',
                'HIGH',
                'CRITICAL'
            )
        ),

    CONSTRAINT chk_work_items_estimate
        CHECK (
            estimate IS NULL
            OR estimate >= 0
        ),

    CONSTRAINT chk_work_items_position
        CHECK (
            position >= 0
        ),

    CONSTRAINT uq_work_items_project_number
        UNIQUE (project_id, item_number),

    CONSTRAINT chk_work_items_item_number
        CHECK (
            item_number > 0
        ),

    -- Evita que un elemento sea padre de sí mismo
    CONSTRAINT chk_work_items_parent_self
        CHECK (
            parent_id IS NULL
            OR parent_id <> id
        )
);


-- 6. COMMENTS

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    work_item_id UUID NOT NULL,
    user_id UUID NOT NULL,

    content TEXT NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_comments_work_item
        FOREIGN KEY (work_item_id)
        REFERENCES work_items(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_comments_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_comments_content
        CHECK (
            length(trim(content)) > 0
        )
);


-- 7. ACTIVITY LOGS
-- Historial / trazabilidad

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL,

    -- Puede ser NULL cuando la actividad corresponde al proyecto
    work_item_id UUID,

    user_id UUID NOT NULL,

    action VARCHAR(50) NOT NULL,

    field_name VARCHAR(100),

    old_value TEXT,
    new_value TEXT,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_activity_logs_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_activity_logs_work_item
        FOREIGN KEY (work_item_id)
        REFERENCES work_items(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_activity_logs_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
);



-- INDICES

-- USERS
-- email ya tiene índice por UNIQUE


-- PROJECTS

CREATE INDEX idx_projects_created_by
    ON projects(created_by);

CREATE INDEX idx_projects_is_archived
    ON projects(is_archived);


-- PROJECT MEMBERS

CREATE INDEX idx_project_members_project_id
    ON project_members(project_id);

CREATE INDEX idx_project_members_user_id
    ON project_members(user_id);


-- SPRINTS

CREATE INDEX idx_sprints_project_id
    ON sprints(project_id);

CREATE INDEX idx_sprints_status
    ON sprints(status);


-- WORK ITEMS

CREATE INDEX idx_work_items_project_id
    ON work_items(project_id);

CREATE INDEX idx_work_items_sprint_id
    ON work_items(sprint_id);

CREATE INDEX idx_work_items_parent_id
    ON work_items(parent_id);

CREATE INDEX idx_work_items_created_by
    ON work_items(created_by);

CREATE INDEX idx_work_items_assignee_id
    ON work_items(assignee_id);

CREATE INDEX idx_work_items_status
    ON work_items(status);

CREATE INDEX idx_work_items_type
    ON work_items(type);

CREATE INDEX idx_work_items_priority
    ON work_items(priority);

-- Muy útil para cargar el tablero Kanban
CREATE INDEX idx_work_items_project_status_position
    ON work_items(project_id, status, position);

-- Muy útil para cargar el backlog
CREATE INDEX idx_work_items_backlog
    ON work_items(project_id)
    WHERE sprint_id IS NULL;


-- COMMENTS

CREATE INDEX idx_comments_work_item_id
    ON comments(work_item_id);

CREATE INDEX idx_comments_user_id
    ON comments(user_id);


-- ACTIVITY LOGS

CREATE INDEX idx_activity_logs_project_id
    ON activity_logs(project_id);

CREATE INDEX idx_activity_logs_work_item_id
    ON activity_logs(work_item_id);

CREATE INDEX idx_activity_logs_user_id
    ON activity_logs(user_id);

CREATE INDEX idx_activity_logs_created_at
    ON activity_logs(created_at DESC);


-- FUNCION PARA ACTUALIZAR updated_at AUTOMATICAMENTE

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- TRIGGERS updated_at

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE TRIGGER trg_sprints_updated_at
BEFORE UPDATE ON sprints
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE TRIGGER trg_work_items_updated_at
BEFORE UPDATE ON work_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE TRIGGER trg_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- FUNCION PARA NUMERAR work_items POR PROYECTO

CREATE OR REPLACE FUNCTION assign_work_item_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.item_number IS NULL THEN
        -- Serializa las altas del mismo proyecto para no repetir números
        PERFORM pg_advisory_xact_lock(hashtext(NEW.project_id::text));

        SELECT COALESCE(MAX(item_number), 0) + 1
        INTO NEW.item_number
        FROM work_items
        WHERE project_id = NEW.project_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_work_items_item_number
BEFORE INSERT ON work_items
FOR EACH ROW
EXECUTE FUNCTION assign_work_item_number();


COMMIT;