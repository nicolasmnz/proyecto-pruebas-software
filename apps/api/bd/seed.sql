BEGIN;
-- USERS
-- Contraseña de todos los usuarios de prueba: 123456 (hash scrypt)

INSERT INTO users (
    id,
    name,
    email,
    password_hash,
    is_active
) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'Ana Torres',
    'ana@pruebas.cl',
    'scrypt$63485651aa2b1421306684a7c21c935a$206b8dd091c5de24343f2b16a93342cfe0160b2cc6b26da80be7b6f4fda58068500f920d00b8c966a6a31f40e872c775b27b3b56a2c5c8e1ed9febb39f9a421d',
    TRUE
),
(
    '22222222-2222-2222-2222-222222222222',
    'Carlos Muñoz',
    'carlos@pruebas.cl',
    'scrypt$63485651aa2b1421306684a7c21c935a$206b8dd091c5de24343f2b16a93342cfe0160b2cc6b26da80be7b6f4fda58068500f920d00b8c966a6a31f40e872c775b27b3b56a2c5c8e1ed9febb39f9a421d',
    TRUE
),
(
    '33333333-3333-3333-3333-333333333333',
    'María González',
    'maria@pruebas.cl',
    'scrypt$63485651aa2b1421306684a7c21c935a$206b8dd091c5de24343f2b16a93342cfe0160b2cc6b26da80be7b6f4fda58068500f920d00b8c966a6a31f40e872c775b27b3b56a2c5c8e1ed9febb39f9a421d',
    TRUE
),
(
    '44444444-4444-4444-4444-444444444444',
    'Diego Soto',
    'diego@pruebas.cl',
    'scrypt$63485651aa2b1421306684a7c21c935a$206b8dd091c5de24343f2b16a93342cfe0160b2cc6b26da80be7b6f4fda58068500f920d00b8c966a6a31f40e872c775b27b3b56a2c5c8e1ed9febb39f9a421d',
    TRUE
),
(
    '55555555-5555-5555-5555-555555555555',
    'Sofía Rojas',
    'sofia@pruebas.cl',
    'scrypt$63485651aa2b1421306684a7c21c935a$206b8dd091c5de24343f2b16a93342cfe0160b2cc6b26da80be7b6f4fda58068500f920d00b8c966a6a31f40e872c775b27b3b56a2c5c8e1ed9febb39f9a421d',
    FALSE
);

-- PROJECTS

INSERT INTO projects (
    id,
    name,
    description,
    created_by,
    is_archived
) VALUES
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Sistema de Gestión de Proyectos',
    'Aplicación web para administrar proyectos, sprints y tareas.',
    '11111111-1111-1111-1111-111111111111',
    FALSE
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Portal de Eventos USM',
    'Proyecto para gestionar y visualizar eventos universitarios.',
    '22222222-2222-2222-2222-222222222222',
    FALSE
),
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Proyecto Antiguo',
    'Proyecto archivado utilizado para realizar pruebas.',
    '11111111-1111-1111-1111-111111111111',
    TRUE
);


-- PROJECT MEMBERS

INSERT INTO project_members (
    id,
    project_id,
    user_id,
    role
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'OWNER'
),
(
    '10000000-0000-0000-0000-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'ADMIN'
),
(
    '10000000-0000-0000-0000-000000000003',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '33333333-3333-3333-3333-333333333333',
    'MEMBER'
),
(
    '10000000-0000-0000-0000-000000000004',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '44444444-4444-4444-4444-444444444444',
    'VIEWER'
),
(
    '10000000-0000-0000-0000-000000000005',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'OWNER'
),
(
    '10000000-0000-0000-0000-000000000006',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '33333333-3333-3333-3333-333333333333',
    'MEMBER'
),
(
    '10000000-0000-0000-0000-000000000007',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    'MEMBER'
);


-- SPRINTS

INSERT INTO sprints (
    id,
    project_id,
    name,
    goal,
    status,
    start_date,
    end_date
) VALUES
(
    '20000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Sprint 1',
    'Implementar autenticación y estructura base del sistema.',
    'COMPLETED',
    '2026-09-01',
    '2026-09-14'
),
(
    '20000000-0000-0000-0000-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Sprint 2',
    'Implementar gestión de proyectos y tablero Kanban.',
    'ACTIVE',
    '2026-09-15',
    '2026-10-10'
),
(
    '20000000-0000-0000-0000-000000000003',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Sprint 3',
    'Agregar comentarios, historial y mejoras de interfaz.',
    'PLANNED',
    '2026-10-11',
    '2026-10-25'
),
(
    '20000000-0000-0000-0000-000000000004',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Sprint inicial',
    'Crear estructura del portal de eventos.',
    'ACTIVE',
    '2026-10-01',
    '2026-10-15'
);


-- WORK ITEMS
-- Primero EPICS

INSERT INTO work_items (
    id,
    project_id,
    sprint_id,
    parent_id,
    created_by,
    assignee_id,
    type,
    title,
    description,
    status,
    priority,
    estimate,
    position,
    due_date
) VALUES
(
    '30000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '20000000-0000-0000-0000-000000000002',
    NULL,
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'EPIC',
    'Gestión de proyectos',
    'Implementar las funcionalidades principales relacionadas con proyectos.',
    'IN_PROGRESS',
    'HIGH',
    13,
    0,
    '2026-10-10'
),
(
    '30000000-0000-0000-0000-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    NULL,
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'EPIC',
    'Sistema de notificaciones',
    'Agregar notificaciones para asignaciones y cambios importantes.',
    'TODO',
    'MEDIUM',
    21,
    0,
    NULL
);


-- STORIES

INSERT INTO work_items (
    id,
    project_id,
    sprint_id,
    parent_id,
    created_by,
    assignee_id,
    type,
    title,
    description,
    status,
    priority,
    estimate,
    position,
    due_date
) VALUES
(
    '30000000-0000-0000-0000-000000000010',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '20000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'STORY',
    'Crear proyectos',
    'Como usuario quiero crear proyectos para organizar mi trabajo.',
    'DONE',
    'HIGH',
    5,
    0,
    '2026-09-25'
),
(
    '30000000-0000-0000-0000-000000000011',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '20000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'STORY',
    'Administrar miembros',
    'Como owner quiero agregar miembros al proyecto y definir sus roles.',
    'IN_PROGRESS',
    'HIGH',
    8,
    0,
    '2026-10-05'
),
(
    '30000000-0000-0000-0000-000000000012',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    '30000000-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'STORY',
    'Notificaciones por asignación',
    'Notificar a un usuario cuando se le asigna una tarea.',
    'TODO',
    'MEDIUM',
    5,
    0,
    NULL
);


-- TASKS

INSERT INTO work_items (
    id,
    project_id,
    sprint_id,
    parent_id,
    created_by,
    assignee_id,
    type,
    title,
    description,
    status,
    priority,
    estimate,
    position,
    due_date
) VALUES
(
    '30000000-0000-0000-0000-000000000020',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '20000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000010',
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'TASK',
    'Crear endpoint POST /projects',
    'Implementar endpoint para crear proyectos.',
    'DONE',
    'HIGH',
    3,
    0,
    '2026-09-22'
),
(
    '30000000-0000-0000-0000-000000000021',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '20000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000011',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'TASK',
    'Crear endpoint para agregar miembros',
    'Endpoint POST /projects/:id/members.',
    'IN_PROGRESS',
    'HIGH',
    3,
    0,
    '2026-10-04'
),
(
    '30000000-0000-0000-0000-000000000022',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '20000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000011',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'TASK',
    'Diseñar selector de roles',
    'Crear componente frontend para seleccionar OWNER, ADMIN, MEMBER o VIEWER.',
    'TODO',
    'MEDIUM',
    2,
    0,
    '2026-10-06'
),
(
    '30000000-0000-0000-0000-000000000023',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    NULL,
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'TASK',
    'Agregar filtros al backlog',
    'Permitir filtrar por prioridad, tipo y usuario asignado.',
    'TODO',
    'LOW',
    3,
    1,
    NULL
);


-- BUGS

INSERT INTO work_items (
    id,
    project_id,
    sprint_id,
    parent_id,
    created_by,
    assignee_id,
    type,
    title,
    description,
    status,
    priority,
    estimate,
    position,
    due_date
) VALUES
(
    '30000000-0000-0000-0000-000000000030',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '20000000-0000-0000-0000-000000000002',
    NULL,
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'BUG',
    'El tablero no actualiza al mover una tarjeta',
    'Las tarjetas cambian visualmente pero el nuevo estado no se persiste.',
    'IN_PROGRESS',
    'CRITICAL',
    5,
    1,
    '2026-10-07'
),
(
    '30000000-0000-0000-0000-000000000031',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '20000000-0000-0000-0000-000000000002',
    NULL,
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'BUG',
    'El modal de proyecto no se cierra',
    'Al guardar un proyecto correctamente el modal permanece abierto.',
    'TODO',
    'MEDIUM',
    2,
    2,
    NULL
);


-- SEGUNDO PROYECTO

INSERT INTO work_items (
    id,
    project_id,
    sprint_id,
    parent_id,
    created_by,
    assignee_id,
    type,
    title,
    description,
    status,
    priority,
    estimate,
    position,
    due_date
) VALUES
(
    '30000000-0000-0000-0000-000000000040',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '20000000-0000-0000-0000-000000000004',
    NULL,
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'STORY',
    'Visualizar eventos',
    'Como estudiante quiero visualizar los eventos disponibles.',
    'IN_PROGRESS',
    'HIGH',
    5,
    0,
    '2026-10-12'
),
(
    '30000000-0000-0000-0000-000000000041',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '20000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000040',
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'TASK',
    'Crear tarjetas de eventos',
    'Crear componente reutilizable EventCard.',
    'DONE',
    'MEDIUM',
    3,
    0,
    '2026-10-05'
);


-- COMMENTS

INSERT INTO comments (
    id,
    work_item_id,
    user_id,
    content
) VALUES
(
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000030',
    '33333333-3333-3333-3333-333333333333',
    'El problema ocurre principalmente al mover una tarjeta de TODO a IN_PROGRESS.'
),
(
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000030',
    '22222222-2222-2222-2222-222222222222',
    'Estoy revisando el endpoint que actualiza el estado del work item.'
),
(
    '40000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000021',
    '11111111-1111-1111-1111-111111111111',
    'Recordar validar que el usuario no esté agregado previamente al proyecto.'
),
(
    '40000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000041',
    '22222222-2222-2222-2222-222222222222',
    'La tarjeta quedó bien. Falta conectar los datos reales de la API.'
);


-- ACTIVITY LOGS

INSERT INTO activity_logs (
    id,
    project_id,
    work_item_id,
    user_id,
    action,
    field_name,
    old_value,
    new_value
) VALUES
(
    '50000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    '11111111-1111-1111-1111-111111111111',
    'PROJECT_CREATED',
    NULL,
    NULL,
    NULL
),
(
    '50000000-0000-0000-0000-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '30000000-0000-0000-0000-000000000030',
    '22222222-2222-2222-2222-222222222222',
    'STATUS_CHANGED',
    'status',
    'TODO',
    'IN_PROGRESS'
),
(
    '50000000-0000-0000-0000-000000000003',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '30000000-0000-0000-0000-000000000021',
    '11111111-1111-1111-1111-111111111111',
    'ASSIGNEE_CHANGED',
    'assignee_id',
    NULL,
    '22222222-2222-2222-2222-222222222222'
),
(
    '50000000-0000-0000-0000-000000000004',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '30000000-0000-0000-0000-000000000010',
    '33333333-3333-3333-3333-333333333333',
    'STATUS_CHANGED',
    'status',
    'IN_PROGRESS',
    'DONE'
),
(
    '50000000-0000-0000-0000-000000000005',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    NULL,
    '22222222-2222-2222-2222-222222222222',
    'PROJECT_CREATED',
    NULL,
    NULL,
    NULL
);


COMMIT;