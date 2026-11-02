# Ejecución

El pipeline definido en `Jenkinsfile` se ejecuta en el agente `node24-docker`, con Node.js 24 y Docker Compose. Instala las dependencias mediante `npm ci` y ejecuta las etapas de calidad, pruebas y compilación.

Se dispone de dos jobs:

- **`mira-ci`**: obtiene el código desde el repositorio configurado en Jenkins.
- **`mira-ci-local`**: valida una copia del código local, incluidos cambios sin commit. Se inicia desde WSL con:

```bash
make jenkins-verify
```

El comando actualiza la copia local, valida el Jenkinsfile y lanza el build. **Build Now** en `mira-ci-local` reutiliza la última copia generada.

Si una etapa falla, las siguientes se omiten. Al finalizar, se publican los reportes disponibles y se eliminan los contenedores y volúmenes creados para el build.

# Pruebas incluidas en Jenkins

| Etapa | Alcance | Comando principal |
|---|---|---|
| Calidad | Análisis estático con ESLint y comprobación de tipos TypeScript. | `npm run lint` y `npm run typecheck` |
| Unitarias API | Contraseñas, UUID y controladores de autenticación, épicas y sprints mediante Jest. | `npm run test:unit -w apps/api` |
| Componentes y utilidades web | Páginas, componentes, autenticación y utilidades mediante Vitest y Testing Library. | `npm run test -w apps/web` |
| Build | Compilación de la API y del frontend. | `npm run build` |
| Integración API | Endpoints de salud, autenticación, usuarios, proyectos, miembros, tablero, tareas asignadas, épicas y sprints, con Supertest y PostgreSQL real. | `npm run test:integration -w apps/api` |
| E2E Chromium | Flujos de usuario en navegador: inicio de sesión, proyectos, tablero Kanban, dashboard, tareas, épicas, sprints, temas y ruleta. | `npm run test:e2e -- --reporter=list,html,junit` |

Las pruebas de integración y E2E utilizan bases de datos separadas. Cada build dispone de recursos Docker propios para evitar interferencias entre ejecuciones.

# Evidencia

La ejecución local verificada corresponde al [build #4 de `mira-ci-local`](http://localhost:8080/job/mira-ci-local/4/), accesible desde el equipo donde se ejecuta Jenkins.

| Indicador | Resultado |
|---|---|
| Estado final | **SUCCESS** |
| Pruebas aprobadas | **280** |
| Código utilizado | Copia local con cambios sin commit |
| Limpieza de recursos Docker | Verificada |

La evidencia se conserva en:

- `reports/jenkins-validation.json`: resultado, enlace al build, total de pruebas y verificación de limpieza.
- `reports/jenkins-console.log`: salida de la ejecución.
- **Artifacts** del build: resultados JSON de la API, reportes JUnit de web y E2E, informe HTML de Playwright y logs de contenedores.

El total de 280 pruebas corresponde a esa ejecución; puede variar al incorporar nuevas pruebas.

# Observación: GitHub Actions

GitHub Actions mantiene su pipeline independiente en `.github/workflows/ci.yml`, ejecutado ante **push** y **pull requests** hacia `develop` y `main`.

El workflow incluye tres jobs:

1. **Quality checks**: lint, tipos, pruebas unitarias y de componentes, y compilación.
2. **Integration tests**: pruebas de API con PostgreSQL, después de calidad.
3. **E2E tests**: pruebas con Chromium, después de calidad e integración.

Jenkins y GitHub Actions no se invocan entre sí ni comparten bases de datos. Si ambos reciben el mismo código, ambos ejecutan sus pruebas. El resultado de `mira-ci-local` valida la copia local utilizada y no acredita por sí solo una ejecución satisfactoria en GitHub Actions.
