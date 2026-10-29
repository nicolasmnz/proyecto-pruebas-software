# Mira — Gestión de Proyectos Scrum y Kanban

Plataforma web para crear proyectos, organizar equipos y administrar el trabajo mediante tableros Scrum y Kanban. Proyecto del curso de Pruebas de Software (Tema 2).

> **Enlaces**
>
> - 🎥 Video Entrega 1: _pendiente_
> - 📚 [Wiki del proyecto](https://github.com/nicolasmnz/proyecto-pruebas-software/wiki)
> - 🏷️ Release Entrega 1: `v1.0-entrega1` _(pendiente)_

## Funcionalidades

**Sesión** (`/login`) — ver [Inicio de sesión](#inicio-de-sesión)

- Iniciar sesión con correo y contraseña; las páginas internas piden sesión y, al entrar, se vuelve a la página pedida.
- La barra lateral muestra al usuario conectado y el botón *Cerrar sesión*.
- Los proyectos, tareas y épicas se crean a nombre del usuario conectado.

**Mis tareas** (`/my-tasks`) — ver [Mis tareas](#mis-tareas)

- Las tareas asignadas al usuario conectado en todos sus proyectos, agrupadas por proyecto y ordenadas por fecha límite.
- Marca las vencidas y permite mostrar u ocultar las terminadas.
- Cada tarea abre su ficha en el tablero de su proyecto.

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

**Sprints** (`/projects/:id/sprints`) — ver [Sprints](#sprints)

- Crear, editar (incluido el estado) y eliminar sprints con nombre, objetivo y fechas.
- Backlog con las tareas sin sprint y movimiento de tareas entre el backlog y los sprints.
- Cantidad de tareas y puntos por sprint, y aviso cuando hay más de un sprint activo.

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
| `sprints` | Iteraciones del proyecto con `status` y fechas; las tareas los referencian con `work_items.sprint_id` (`NULL` = backlog) |
| `comments`, `activity_logs` | Definidas en el esquema; aún sin funcionalidad en la aplicación |

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
- **Enlace a una tarea:** `?task=<id>` abre la ficha de esa tarea al cargar el tablero; al abrir o cerrar una ficha la URL se actualiza sin perder los filtros.
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
- **Tareas de una historia:** `parent_id` también puede apuntar a una historia (épica → historia → tarea). Esas tareas heredan la épica de su historia en la tarjeta, la ficha y el filtro; su épica no se cambia desde la ficha, para no romper el vínculo con la historia. El avance de la épica cuenta solo sus hijos directos, para no sumar dos veces los puntos de una historia y de sus tareas.
- **Proyectos archivados:** sus épicas son de solo lectura.

## Sprints

Un sprint es una iteración del proyecto. Las tareas sin sprint forman el *Backlog*.

- **Dónde se gestionan:** en la página de sprints del proyecto, a la que se llega con *Ver sprints* desde el detalle.
- **Orden:** primero el sprint activo, luego los planificados (por fecha de inicio) y al final los completados y cancelados.
- **Estado:** todo sprint nuevo empieza *Planificado*; se cambia a mano al editarlo (*Activo*, *Completado* o *Cancelado*). La fecha de término no puede ser anterior a la de inicio.
- **Varios sprints activos:** se permite, pero la página muestra un aviso porque lo habitual es trabajar en uno a la vez.
- **Mover tareas:** cada tarea tiene un selector *Mover a* que solo ofrece el *Backlog* y los sprints *Planificados* o *Activos*. Las tareas archivadas no se replanifican, pero siguen contando en su sprint.
- **Carga:** cada sprint y el backlog muestran su cantidad de tareas y la suma de sus puntos.
- **Eliminar:** pide confirmación; las tareas del sprint vuelven al backlog.
- **Épicas:** no se asignan a sprints, porque agrupan trabajo de varias iteraciones.
- **Proyectos archivados:** sus sprints son de solo lectura.

## Inicio de sesión

La interfaz pide iniciar sesión con un [usuario de prueba](#usuarios-de-prueba) (por ejemplo, `ana@pruebas.cl` / `123456`).

- **Validación:** los campos vacíos se indican sin llamar a la API. Con credenciales incorrectas se muestra *Correo o contraseña incorrectos*, y con una cuenta desactivada, *Usuario desactivado*.
- **Páginas internas:** sin sesión redirigen a `/login?redirect=…` y, al entrar, se vuelve a esa página. Solo se aceptan rutas internas como destino.
- **Sesión:** se guarda en `localStorage` (`mira.session`), así que sigue al recargar o cerrar el navegador. *Cerrar sesión* la borra y vuelve al login.
- **Autoría:** `createdBy` de proyectos, tareas y épicas es el usuario conectado.
- **Limitación:** `POST /api/auth/login` no entrega un token, así que la sesión controla la navegación, pero la API sigue abierta. Una sesión segura con token sería una historia de backend aparte.

## Mis tareas

Página con las tareas asignadas al usuario conectado, a la que se llega desde *Mis tareas* en la barra lateral.

- **Qué se muestra:** tareas, historias y errores asignados en todos los proyectos activos. No incluye épicas, tareas archivadas ni proyectos archivados.
- **Orden:** los proyectos aparecen según su tarea más urgente, y dentro de cada uno las tareas van de la fecha límite más cercana a la más lejana; las que no tienen fecha van al final.
- **Vencidas:** una tarea no terminada cuya fecha límite es anterior a hoy se marca *Vencida*.
- **Terminadas:** se ocultan por defecto; *Mostrar terminadas* las incluye y queda en la URL (`?done=1`).
- **Abrir una tarea:** lleva al tablero de su proyecto con la ficha abierta (`/projects/:id/board?task=<id>`).

## Pruebas

| Nivel | Herramienta | Cantidad | Comando |
| ----- | ----------- | -------- | ------- |
| Calidad | ESLint + TypeScript | — | `npm run lint` · `npm run typecheck` |
| Unitarias API | Jest | 34 | `npm run test:unit` |
| Componentes y utilidades web | Vitest + React Testing Library | 265 | `npm run test:unit` |
| Integración API | Jest + Supertest + PostgreSQL | 177 | `npm run test:integration` |
| E2E | Playwright (Chromium) | 30 | `npm run test:e2e` |

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

Antes de los specs, `tests/e2e/auth.setup.ts` inicia sesión con `ana@pruebas.cl` y guarda la sesión en `playwright/.auth/user.json` (ignorado por git); los demás specs la reutilizan. `login.spec.ts` parte sin sesión.

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
| `context/AuthProvider.test.tsx` | Sesión: iniciar, recuperar al recargar y cerrar |
| `context/authContext.test.tsx` | Usuario de la sesión en las páginas internas |
| `layout/Layout.test.tsx` | Layout, barra lateral, usuario conectado y cierre de sesión |
| `layout/RequireAuth.test.tsx` | Redirección al login de las páginas internas |
| `pages/BoardPage.test.tsx` | Tablero Kanban: crear, mover, reordenar, archivar, filtros, límites, ficha de tarea (también desde `?task=`) y épica de cada tarea |
| `pages/CreateProjectPage.test.tsx` | Crear proyecto |
| `pages/EpicsPage.test.tsx` | Épicas: listado, avance, crear, editar y archivar |
| `pages/LoginPage.test.tsx` | Inicio de sesión: validación, errores de la API y vuelta a la página pedida |
| `pages/MyTasksPage.test.tsx` | Mis tareas: agrupación, orden, vencidas, terminadas, estados vacíos y error |
| `pages/SprintsPage.test.tsx` | Sprints: listado, backlog, crear, editar, mover tareas, eliminar y aviso de varios activos |
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
| GET | `/users/:id/work-items` | Tareas asignadas al usuario en los proyectos activos (sin épicas ni archivadas), por fecha límite |
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
| PATCH | `/projects/:id/work-items/:itemId/sprint` | Asignar sprint: `{ "sprintId": "..." }` (`null` la devuelve al backlog) |
| GET / POST | `/projects/:id/sprints` | Listar / crear sprints |
| GET / PUT / DELETE | `/projects/:id/sprints/:sprintId` | Detalle / editar / eliminar sprint |

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

Fuera del alcance por ahora: historial de actividad (`activity_logs`), comentarios, gestión de miembros del proyecto y protección de la API con token (la sesión de la interfaz solo controla la navegación).

## Flujo de trabajo

- GitFlow: `main` (estable), `develop` (integración) y ramas `feature/PPDS-XX-descripcion`.
- Cada rama y PR referencia su ítem de Jira.
- Los PR siguen la plantilla de `.github/PULL_REQUEST_TEMPLATE.md` y deben pasar el CI.
