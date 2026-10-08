# Mira — Gestión de Proyectos Scrum y Kanban

Plataforma web para crear proyectos, organizar equipos y administrar el trabajo mediante tableros Scrum y Kanban. Proyecto del curso de Pruebas de Software (Tema 2).

> **Enlaces**
>
> - 🎥 Video Entrega 1: _pendiente_
> - 📚 [Wiki del proyecto](https://github.com/nicolasmnz/proyecto-pruebas-software/wiki)
> - 🏷️ Release Entrega 1: `v1.0-entrega1` _(pendiente)_

## Integrantes

| Nombre | Rol | GitHub |
| ------ | --- | ------ |
| _pendiente_ | Líder de equipo | |
| _pendiente_ | | |
| _pendiente_ | | |

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
    bd/         schema.sql y seed.sql
    src/        config, routes, controllers, repositories, utils
    tests/      unit/ e integration/
  web/          Frontend (React + Vite)
    src/        api, components, layout, pages
tests/e2e/      Pruebas end-to-end (Playwright)
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

## Pruebas

```bash
npm run lint
npm run typecheck
npm run test:unit          # API (Jest) + Web (Vitest)

npm run db:test:up         # PostgreSQL de pruebas en el puerto 5434
npm run test:integration   # API contra PostgreSQL real

npm run test:e2e           # Playwright (requiere la aplicación levantada en la opción A)
```

## API

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/health` | Estado de la API |
| POST | `/api/auth/login` | Inicio de sesión |
| GET / POST | `/api/projects` | Listar / crear proyectos |
| GET / PUT / DELETE | `/api/projects/:id` | Detalle / editar / archivar proyecto |
| GET / POST | `/api/users` | Listar / crear usuarios |
| GET / PUT / DELETE | `/api/users/:id` | Detalle / editar / desactivar usuario |

## Flujo de trabajo

- GitFlow: `main` (estable), `develop` (integración) y ramas `feature/PPDS-XX-descripcion`.
- Cada rama y PR referencia su ítem de Jira.
- Los PR siguen la plantilla de `.github/PULL_REQUEST_TEMPLATE.md` y deben pasar el CI.
