# Mira — Gestión de Proyectos Scrum y Kanban

Plataforma web para crear proyectos, organizar equipos y administrar el trabajo mediante tableros Scrum y Kanban. Proyecto del curso de Pruebas de Software (Tema 2).

> **Enlaces**
>
> - 🎥 Video Entrega 1: _pendiente_
> - 📚 [Wiki del proyecto](https://github.com/nicolasmnz/proyecto-pruebas-software/wiki)
> - 🏷️ Release Entrega 1: `v1.0-entrega1` _(pendiente)_

## Funcionalidades

**Proyectos**

- Listar, buscar y ver el detalle de proyectos.
- Crear, editar y archivar proyectos; los archivados se consultan en su propia lista y se pueden restaurar.

**Tablero Kanban** (`/projects/:id/board`) — ver [Tablero Kanban](#tablero-kanban)

- Tres columnas (Por hacer, En progreso, Hecho) con identificador `#N`, tipo, prioridad, puntos (SP) y responsable en cada tarjeta.
- Crear, editar, eliminar y asignar tareas desde una ficha de detalle.
- Mover tareas entre columnas y reordenarlas (arrastrando o con botones accesibles por teclado).
- Archivar tareas terminadas, una a una o todas las de Hecho, y restaurarlas.
- Barra de progreso (por puntos y por tareas), puntos por columna y límite de trabajo en curso configurable.
- Búsqueda por título o `#número` y filtros por tipo, prioridad, responsable y épica.

**Épicas** (`/projects/:id/epics`) — ver [Épicas](#épicas)

- Crear, editar (incluido el estado) y archivar épicas, con su barra de avance.
- Asignar o quitar la épica de una tarea desde su ficha; cada tarjeta del tablero muestra su épica.
- Resumen de las épicas más recientes en el detalle del proyecto y acceso al tablero filtrado por cada épica.

## Integrantes

| Nombre        | Rol en el Equipo      | Rol USM | GitHub |
| ------        | ---                   | ------  | ---  |
| Nicolas Muñoz | Testing y Ambiente    | 202104641-0| [nicolasmnz](https://github.com/nicolasmnz)|
| Sergio Rojas  | Desarrollador FrontEnd| 202273619-4| [Mochytk](https://github.com/Mochytk)|
| Hans Toledo   | Desarrollador BackEnd | 201704591-4| [HanstoC](https://github.com/HanstoC)|

## Stack

| Capa | Tecnología | Pruebas |
| ---- | ---------- | ------- |
| Frontend | React 19, Vite, React Router, TypeScript | Vitest + React Testing Library |
| Backend | Node 24, Express 5, TypeScript | Jest (unitarias) + Supertest (integración) |
| Base de datos | PostgreSQL 18 | Base de pruebas aislada (`compose.test.yml`) |
| E2E | — | Playwright |
| CI | GitHub Actions | lint, typecheck, unitarias, integración, E2E |

## Estructura

```text
apps/
  api/          API REST (Express)
    bd/         schema.sql, seed.sql y migrations/
    src/        config, routes, controllers, repositories, utils
    tests/      unit/ e integration/
  web/          Frontend (React + Vite)
    src/        api, components, context, layout, pages, utils
tests/e2e/      Pruebas end-to-end (Playwright)
compose.yml     Aplicación completa (db + api + web)
compose.test.yml  PostgreSQL aislado para las pruebas de integración
```

## Requisitos

- Node.js 24 (ver `.nvmrc`)
- Docker y Docker Compose

## Instalación y ejecución

Todo el proyecto usa **un único `.env` en la raíz**:

```bash
cp .env.example .env
npm install
```

### Opción A — Todo con Docker

```bash
docker compose up -d --build
```

### Opción B — Base de datos en Docker, API y web en local (recomendada para desarrollar)

```bash
npm run db:up       # PostgreSQL en el puerto 5433, con schema y seed
npm run dev:api     # terminal 1 → http://localhost:3000/api/health
npm run dev:web     # terminal 2 → http://localhost:5173
```

Los datos de prueba se cargan solo la primera vez que se crea el volumen. Para reiniciar la base de datos:

```bash
npm run db:reset
```

### Usuarios de prueba

Todos los usuarios del seed usan la contraseña `123456` (almacenada con hash scrypt).

| Correo | Estado |
| ------ | ------ |
| ana@pruebas.cl | activo |
| carlos@pruebas.cl | activo |
| maria@pruebas.cl | activo |
| diego@pruebas.cl | activo |
| sofia@pruebas.cl | desactivado |

## Base de datos

El esquema está en `apps/api/bd/schema.sql` y los datos de ejemplo en `seed.sql`; ambos se cargan solos al crear el volumen de PostgreSQL.

| Tabla | Uso |
| ----- | --- |
| `users` | Usuarios (contraseña con hash scrypt) |
| `projects` | Proyectos; `is_archived` y `wip_limits` (límites del tablero, JSONB) |
| `project_members` | Miembros de cada proyecto y su rol |
| `work_items` | Épicas, historias, tareas y errores; `status`, `position`, `item_number`, `is_archived` y `parent_id` (épica de la tarea) |
| `sprints`, `comments`, `activity_logs` | Definidas en el esquema; aún sin funcionalidad en la aplicación |

### Migraciones

Una base **nueva** (o tras `npm run db:reset`) ya incluye todo. Si tienes una base creada con un esquema anterior y no quieres perder sus datos, aplica en orden los scripts de `apps/api/bd/migrations/` (son idempotentes):

```bash
docker compose exec -T db psql -U proyecto_user -d proyecto_pruebas < apps/api/bd/migrations/001-work-item-number.sql
docker compose exec -T db psql -U proyecto_user -d proyecto_pruebas < apps/api/bd/migrations/002-work-item-archive.sql
docker compose exec -T db psql -U proyecto_user -d proyecto_pruebas < apps/api/bd/migrations/003-project-wip-limits.sql
```

| Script | Agrega |
| ------ | ------ |
| `001-work-item-number.sql` | Identificador `#N` correlativo por proyecto (trigger con bloqueo) |
| `002-work-item-archive.sql` | Archivado de tareas (`work_items.is_archived`) |
| `003-project-wip-limits.sql` | Límite de trabajo en curso por columna (`projects.wip_limits`) |

## Tablero Kanban

Reglas de comportamiento que conviene conocer:

- **Qué se muestra:** todas las tareas del proyecto que no son épicas. Las archivadas salen de las columnas y se ven en la sección plegable *Archivadas*.
- **Orden:** dentro de cada columna se ordena por `position` y, si coincide, por número de tarea. Al mover o reordenar, la columna de destino se renumera de forma consecutiva.
- **Identificador:** `#N`, único dentro del proyecto y asignado al crear la tarea.
- **Archivar:** solo se pueden archivar tareas en *Hecho*; una tarea archivada no se puede mover. Al restaurarla vuelve al final de *Hecho*. *Archivar todas* no está disponible mientras haya filtros activos.
- **Responsable:** se elige entre los miembros del proyecto y quien lo creó. Se puede conservar el responsable actual aunque ya no sea miembro.
- **Límite de trabajo en curso:** configurable por proyecto para *Por hacer* y *En progreso* (vacío = sin límite). Es orientativo: la columna se marca en rojo al superarlo, pero no se bloquea nada.
- **Progreso:** la barra pesa por puntos (SP). Las tareas archivadas cuentan como hechas y las tareas sin estimar valen 0 puntos; si ninguna tarea tiene puntos, se calcula por cantidad de tareas.
- **Filtros:** viven en la URL (`?q=`, `type`, `priority`, `assignee`, `epic`), por lo que se pueden compartir. Los contadores y límites de columna no dependen del filtro, y con filtros activos no se puede reordenar.
- **Proyectos archivados:** su tablero es de solo lectura.

## Épicas

Una épica agrupa tareas relacionadas. Se guarda en `work_items` con `type = 'EPIC'` y sus tareas la referencian con `parent_id`.

- **Dónde se gestionan:** en la página de épicas del proyecto, a la que se llega con *Ver épicas* desde el detalle. El detalle muestra además las tres épicas más recientes con su avance y un enlace para crear una nueva (`/epics?nueva` abre el formulario).
- **Estado:** toda épica nueva empieza en *Por hacer*. Su estado se cambia a mano al editarla y no depende de sus tareas.
- **Avance:** usa la misma regla que la barra del tablero, aplicada solo a las tareas de la épica (las archivadas cuentan como hechas).
- **Asignar tareas:** desde la ficha de la tarea, con el campo *Épica* (o *Sin épica* para quitarla). Si falla el cambio de épica, los demás cambios de la ficha ya quedaron guardados y se avisa.
- **Archivar:** la épica sale de la lista, pero sus tareas siguen en el tablero y conservan la referencia (la ficha la muestra como *Épica archivada*). No se le pueden asignar tareas nuevas.
- **Tablero:** cada tarjeta muestra el nombre de su épica, y el filtro *Épica* permite ver una épica concreta o las tareas sin épica. *Ver en el tablero* abre el tablero ya filtrado (`?epic=`).
- **Proyectos archivados:** sus épicas son de solo lectura.

## Pruebas

| Nivel | Herramienta | Cantidad | Comando |
| ----- | ----------- | -------- | ------- |
| Calidad | ESLint + TypeScript | — | `npm run lint` · `npm run typecheck` |
| Unitarias API | Jest | 30 | `npm run test:unit` |
| Componentes y utilidades web | Vitest + React Testing Library | 174 | `npm run test:unit` |
| Integración API | Jest + Supertest + PostgreSQL | 142 | `npm run test:integration` |
| E2E | Playwright (Chromium) | 21 | `npm run test:e2e` |

### Unitarias, calidad y build

```bash
npm run lint
npm run typecheck
npm run test:unit          # API (Jest) + Web (Vitest)
npm run build
```

### Integración

Usan una base de datos PostgreSQL **aislada** (`proyecto_pruebas_test`, puerto 5434) que se vacía entre pruebas; nunca toca la base de desarrollo.

```bash
npm run db:test:up
npm run test:integration
```

> Si cambió `schema.sql` (por ejemplo tras actualizar la rama), recrea el volumen de pruebas, porque el esquema solo se carga al crearlo:
>
> ```bash
> docker compose -f compose.test.yml down -v
> npm run db:test:up
> ```

### E2E

Necesitan la aplicación levantada (opción A o B) y la base con el **seed original**, porque una prueba usa el proyecto de ejemplo. La primera vez instala el navegador:

```bash
npx playwright install chromium
npm run db:reset           # esquema nuevo + seed original
npm run dev:api            # terminal 1
npm run dev:web            # terminal 2
npm run test:e2e           # terminal 3
```

```bash
npx playwright test tests/e2e/view-kanban-board.spec.ts --headed   # ver el navegador
npx playwright show-report                                         # informe de la última ejecución
```

`npm run test:all` ejecuta unitarias + E2E (no incluye integración).

### Archivos de prueba de la web (`*.test.tsx`)

| Archivo | Cubre |
| ------- | ----- |
| `components/BoardProgress.test.tsx` | Barra de progreso del tablero |
| `components/EpicsSummary.test.tsx` | Resumen de épicas en el detalle del proyecto |
| `layout/Layout.test.tsx` | Layout y barra lateral |
| `pages/BoardPage.test.tsx` | Tablero Kanban: crear, mover, reordenar, archivar, filtros, límites, ficha de tarea y épica de cada tarea |
| `pages/CreateProjectPage.test.tsx` | Crear proyecto |
| `pages/EpicsPage.test.tsx` | Épicas: listado, avance, crear, editar y archivar |
| `pages/ProjectDetailPage.test.tsx` | Detalle, edición, archivado y restauración de proyectos |
| `pages/ProjectsPage.test.tsx` | Listado y búsqueda de proyectos |

Además hay pruebas de utilidades en `utils/*.test.ts`, de la API en `apps/api/tests/` y de extremo a extremo en `tests/e2e/`.

## API

Prefijo `/api`. Los errores devuelven `{ "message": "..." }`.

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/health` | Estado de la API |
| POST | `/auth/login` | Inicio de sesión |
| GET / POST | `/users` | Listar / crear usuarios |
| GET / PUT / DELETE | `/users/:id` | Detalle / editar / desactivar usuario |
| GET / POST | `/projects` | Listar (`?archived=true` para archivados) / crear proyectos |
| GET / PUT / DELETE | `/projects/:id` | Detalle / editar / archivar proyecto |
| PATCH | `/projects/:id/restore` | Restaurar proyecto archivado |
| GET | `/projects/:id/board` | Tablero: proyecto, columnas, archivadas, miembros y límites |
| PUT | `/projects/:id/wip-limits` | Definir límites de trabajo en curso (`TODO`, `IN_PROGRESS`) |
| POST | `/projects/:id/work-items` | Crear tarea |
| GET / PUT / DELETE | `/projects/:id/work-items/:itemId` | Detalle / editar / eliminar tarea |
| PATCH | `/projects/:id/work-items/:itemId` | Mover: `{ "status": "...", "index": 0 }` (`index` opcional) |
| PATCH | `/projects/:id/work-items/:itemId/archive` | Archivar tarea (solo en Hecho) |
| PATCH | `/projects/:id/work-items/:itemId/restore` | Restaurar tarea archivada |
| PATCH | `/projects/:id/work-items/archive-done` | Archivar todas las tareas de Hecho |
| PATCH | `/projects/:id/work-items/:itemId/epic` | Asignar épica: `{ "epicId": "..." }` (`null` la quita) |
| GET / POST | `/projects/:id/epics` | Listar épicas activas / crear épica |
| GET / PUT / DELETE | `/projects/:id/epics/:epicId` | Detalle / editar / archivar épica |

Códigos habituales: `400` datos inválidos, `404` recurso inexistente (o id que no es UUID), `409` proyecto archivado o acción no permitida en el estado actual.

## Solución de problemas

| Síntoma | Causa y solución |
| ------- | ---------------- |
| `Cannot GET /api/projects/:id/board` | La API en ejecución es anterior al cambio: reiníciala (`npm run dev:api`). |
| Errores de columna inexistente (`item_number`, `is_archived`, `wip_limits`) | La base tiene un esquema anterior: aplica las migraciones o ejecuta `npm run db:reset`. |
| Casi todas las pruebas de integración fallan | El volumen de pruebas conserva el esquema viejo: `docker compose -f compose.test.yml down -v && npm run db:test:up`. |
| Un E2E del tablero falla esperando datos de ejemplo | La base de desarrollo perdió el seed (por ejemplo, se archivaron sus tareas): `npm run db:reset`. |
| Playwright indica que falta el navegador | `npx playwright install chromium`. |

## Alcance actual

Fuera del alcance por ahora: historial de actividad (`activity_logs`), comentarios, gestión de miembros del proyecto, sprints y autenticación real en la interfaz (las altas usan un usuario de ejemplo fijo).

## Flujo de trabajo

- GitFlow: `main` (estable), `develop` (integración) y ramas `feature/PPDS-XX-descripcion`.
- Cada rama y PR referencia su ítem de Jira.
- Los PR siguen la plantilla de `.github/PULL_REQUEST_TEMPLATE.md` y deben pasar el CI.
