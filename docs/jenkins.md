# Guía de Jenkins

Jenkins corre en local con [compose.jenkins-server.yml](../compose.jenkins-server.yml):
un controlador, un agente `node24-docker` (Node 24, Git, Docker CLI y Chromium) y un
motor Docker dedicado (`docker:dind`). Solo el controlador publica un puerto, en
`127.0.0.1:${JENKINS_PORT}` (por defecto <http://localhost:8080>); la configuración
pública está en [jenkins/server.env](../jenkins/server.env).

```bash
bash scripts/jenkins.sh up      # construir y levantar
bash scripts/jenkins.sh status  # estado
bash scripts/jenkins.sh logs    # logs
bash scripts/jenkins.sh down    # detener conservando datos
make jenkins-verify             # validar el checkout local en el job mira-ci-local
```

## Job `mira-ci` (multibranch)

`init.groovy` crea en cada arranque un job **Multibranch Pipeline** sobre el
repositorio de `JENKINS_REPOSITORY_URL`. No fija ninguna rama:

| Requisito | Cómo se cumple |
| --------- | -------------- |
| RF-01 Checkout dinámico | Cada build hace `checkout scm` del commit que lo disparó; el `Jenkinsfile` usado es el de esa rama o PR. |
| RF-02 Multibranch | Se descubren todas las ramas (`main`, `develop`, `feature/*`, …). Una rama con PR abierto se construye como PR para no duplicar builds en el único executor. |
| RF-03 PR | Los PRs se construyen fusionados con su rama de destino. El log y la descripción del build muestran número, rama de origen, rama de destino, URL y autor. Los PRs de forks usan su `Jenkinsfile` solo si el autor tiene permiso de escritura. |
| RF-04 Validación | Se mantienen lint, typecheck, unitarias de API, pruebas de componentes web, build, integración con PostgreSQL y E2E con Chromium. |
| RF-05 Resultado | Cualquier comando con código distinto de cero, un reporte JUnit con fallos, la falta de reportes en un build exitoso o un error de limpieza dejan el build en **FAILURE**. Solo un build sin errores queda en **SUCCESS**. |
| RF-06 Limpieza | `docker compose down --volumes --remove-orphans --rmi local` elimina contenedores, redes, volúmenes e imágenes del build, y `deleteDir()` borra el workspace después de archivar los reportes. |
| RF-07 Trazabilidad | La etapa *Preparar* registra job, número y URL de la ejecución, rama, commit (con sus padres), datos del PR y proyecto Docker. El log tiene timestamps y la descripción del build resume `rama/PR @ commit`. |

Cada build usa un proyecto Docker `jenkins-<job>-<rama>-<número>` con puertos
dinámicos, así que no choca con otros builds ni con la aplicación de desarrollo.

### Disparadores

- **Webhook (recomendado):** en GitHub → *Settings → Webhooks*, URL
  `https://<url-pública>/github-webhook/`, tipo `application/json`, eventos *push* y
  *pull requests*. Requiere que `JENKINS_PUBLIC_URL` sea una URL HTTPS accesible
  desde GitHub (por ejemplo, con un túnel).
- **Sin webhook:** el repositorio se escanea al iniciar Jenkins y cada hora. Para
  construir al momento, usar **Scan Repository Now** en el job.

### Credenciales

Sin credenciales, la API de GitHub limita a 60 peticiones por hora, y eso puede
quedarse corto al escanear muchas ramas y PRs. Jenkins está configurado para
esperar solo cuando la cuota se agota (`ThrottleOnOver`), así que si el escaneo
se detiene con *Sleeping until reset*, es por esa cuota. Para evitarlo, crea en Jenkins una
credencial *Username with password* (usuario de GitHub y un token con permiso de lectura
del repositorio) y define su ID en `JENKINS_SCM_CREDENTIALS_ID`.

### Migración desde el job de rama fija

Antes, `mira-ci` era un pipeline fijado a una sola rama. Al arrancar, si se encuentra
ese job antiguo, se deshabilita y se renombra `mira-ci-rama-fija` para conservar su
historial. Puede borrarse desde la interfaz cuando ya no haga falta.

## Reportes archivados

`reports/api-unit.json`, `reports/api-integration.json`, `reports/web.xml`,
`reports/e2e.xml`, `playwright-report/`, `test-results/` y
`reports/containers.log`. Los XML JUnit se publican en *Test Result*.
