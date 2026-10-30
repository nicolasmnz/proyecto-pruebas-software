# Integración de pruebas con Jenkins (PPDS-18)

El `Jenkinsfile` ejecuta las suites existentes. GitHub Actions conserva su workflow
`.github/workflows/ci.yml`, sus disparadores y sus checks de los PR a `develop` y
`main`. Si ambos sistemas reciben el mismo commit, ambos ejecutan las pruebas;
no se invocan entre sí ni comparten bases de datos.

## Qué ejecuta Jenkins

| Etapa | Comando / alcance |
| --- | --- |
| Preparación | Comprueba Node 24 y Docker, valida Compose e instala con `npm ci` |
| Calidad | `npm run lint` y `npm run typecheck` |
| Unitarias API | `npm run test:unit -w apps/api`: contraseñas, UUID y controlador de autenticación |
| Web | `npm run test -w apps/web`: componentes, páginas y utilidades con Vitest y Testing Library |
| Build | `npm run build`: compilación de API y frontend |
| Integración API | `npm run test:integration -w apps/api`: salud, autenticación, usuarios, proyectos y tablero con Jest, Supertest y PostgreSQL real |
| E2E | `npm run test:e2e`: Chromium con Playwright; disponibilidad, creación, búsqueda, edición y archivado de proyectos y operaciones del tablero Kanban |

Las etapas se ejecutan en orden. Un comando fallido detiene las etapas siguientes
y marca el build como fallido. Playwright usa la configuración CI existente:
un worker, dos reintentos y rechazo de `test.only`. Los XML de web y E2E se
publican en la vista de pruebas de Jenkins; los resultados de Jest se archivan
como JSON. También se guardan el informe HTML de Playwright, las trazas que se
generen y los logs de contenedores, incluso si falla una suite.

## Levantar Jenkins con Docker

Requisitos del host: Docker con contenedores Linux y Docker Compose v2,
Bash, OpenSSL y acceso de red a Docker Hub, npm, GitHub y al sitio de plugins
de Jenkins. En Windows, ejecutar desde **WSL** con la integración de Docker
Desktop habilitada. La verificación local también usa Git y Python 3.

```bash
bash scripts/jenkins.sh up
# Equivalente: make jenkins-up
```

La primera construcción descarga Jenkins, plugins y Chromium, por lo que puede
tardar varios minutos. El comando genera una contraseña aleatoria en
`.jenkins/secrets/admin_password`, una ruta ignorada por Git y Docker, sin
imprimirla en los logs. Abrir <http://localhost:8080>, iniciar sesión como
`admin` y consultar la contraseña **localmente**:

```bash
cat .jenkins/secrets/admin_password
```

`compose.jenkins-server.yml` provisiona:

- **jenkins**: controlador con cero ejecutores, autenticación obligatoria y los
  plugins declarados en `jenkins/controller/plugins.txt`.
- **agent**: agente `node24-docker` con un ejecutor, Java 21, Node 24, Git,
  Docker CLI, Compose, Chromium y sus bibliotecas. Se conecta por WebSocket con
  un secreto generado por Jenkins y compartido mediante un volumen privado.
  El proceso de build corre como `jenkins` (UID 1000).
- **docker**: motor Docker-in-Docker dedicado a CI. El agente comparte su
  namespace de red para acceder a los puertos dinámicos en `127.0.0.1`.
  Ambos montan el workspace en `/home/jenkins/agent`, por lo que los bind mounts
  del esquema SQL resuelven al mismo archivo dentro del daemon.

El motor dedicado requiere `privileged: true`; usar este stack para el
repositorio y colaboradores de confianza. No monta `/var/run/docker.sock` del
host y no publica la API del daemon. La interfaz de Jenkins solo se publica en
loopback. Datos de Jenkins, workspace y caché de Docker persisten en volúmenes.

## Job y primer build

El arranque crea automáticamente el job **mira-ci** con `Jenkinsfile` desde SCM
y el disparador de GitHub. Sus valores iniciales están en `jenkins/server.env`:

```dotenv
JENKINS_PORT=8080
JENKINS_PUBLIC_URL=http://localhost:8080/
JENKINS_REPOSITORY_URL=https://github.com/nicolasmnz/proyecto-pruebas-software.git
JENKINS_BRANCH=PPDS-18-integracion-con-jenkins
JENKINS_SCM_CREDENTIALS_ID=
```

Una vez publicados estos archivos en esa rama, abrir **mira-ci → Build Now**.
El job obtiene el código de GitHub; los archivos locales sin commit ni push
no aparecen en ese build. Para validar el checkout actual antes de publicarlo:

```bash
make jenkins-verify
# Equivalente: python3 scripts/jenkins-verify.py
```

La verificación comprueba que el agente está conectado, valida el Jenkinsfile
con el compilador Declarative de Jenkins y crea/actualiza **mira-ci-local**.
Ese job ejecuta el mismo pipeline con una etapa inicial que copia una instantánea
de los archivos actuales, incluidos los cambios sin commit, respetando
`.gitignore`. No usa el webhook ni altera el job SCM. Guarda el resultado y la
consola en `reports/jenkins-validation.json` y `reports/jenkins-console.log`.
Ejecutar una sola verificación local a la vez.

Si el repositorio es privado, añadir una credencial de lectura en Jenkins y
asignarla en **mira-ci → Configure → Pipeline → SCM → Credentials**. El ID de
`jenkins/server.env` solo selecciona una credencial existente; no contiene tokens.
El aprovisionamiento conserva el job y el usuario existentes en los reinicios;
los cambios posteriores de rama, URL o credenciales se realizan en la
configuración del job. `JENKINS_PUBLIC_URL` sí se aplica al reiniciar.

Si se cambia la versión de Playwright del lockfile, actualizar también
`PLAYWRIGHT_VERSION` en `jenkins/agent/Dockerfile` y reconstruir con `up`.

## Ejecución automática desde GitHub

El job tiene el disparador habilitado. Para recibir eventos desde Internet hace
falta un servidor accesible mediante HTTPS o un túnel administrado por el equipo:

1. Configurar el acceso HTTPS y `JENKINS_PUBLIC_URL` con la URL pública real.
   El puerto de Compose permanece en loopback para servirlo mediante un proxy.
2. En GitHub, **Settings → Webhooks → Add webhook**, indicar
   `https://<dominio-de-jenkins>/github-webhook/`, contenido `application/json`
   y eventos **push**. GitHub no puede acceder a `localhost`.
3. Comprobar una entrega con respuesta satisfactoria y un push a la rama
   configurada. El job actual sigue una sola rama; los PR continúan cubiertos
   por Actions.

El repositorio no puede proporcionar el dominio público, las credenciales de
GitHub ni crear el webhook sin acceso a esa cuenta. Tampoco agrega Jenkins
como check obligatorio en la protección de ramas. Esas configuraciones son
externas al stack; el build manual y la verificación local funcionan sin webhook.

## Operación

```bash
bash scripts/jenkins.sh status
bash scripts/jenkins.sh logs
bash scripts/jenkins.sh down   # Detiene Jenkins sin eliminar volúmenes
bash scripts/jenkins.sh up     # Reconstruye si cambió una imagen y vuelve a iniciar
```

También están disponibles `make jenkins-status`, `jenkins-logs` y `jenkins-down`.
No eliminar los volúmenes al detener el servidor: contienen usuarios, configuración,
historial y reportes. Respaldar el volumen `jenkins_home` y la contraseña local.
Si se cambia la contraseña de `admin` desde la UI, actualizar el archivo local
para que la herramienta de verificación pueda autenticarse.

## Aislamiento y limpieza

`compose.jenkins.yml` crea una base solo con el esquema para integración y otra
con esquema y seed para E2E. Así, el truncado de las pruebas de integración no
borra los datos de ejemplo que necesita Playwright.

Los puertos se asignan dinámicamente en loopback. Jenkins consulta los puertos y
los pasa como `DB_PORT`, `E2E_API_URL` y `E2E_BASE_URL`. Las dos últimas variables
son opcionales: localmente y en Actions se conservan los valores `localhost`
originales. El CORS abierto se limita a la API del Compose de Jenkins.

Cada build usa un proyecto Compose basado en `BUILD_TAG`, con volúmenes y redes
propios, sin nombres de contenedor globales. El bloque `post/always` elimina los
contenedores y volúmenes de ese proyecto incluso si falla una etapa. No utiliza
`compose.yml`, `.env` ni la base de desarrollo. `disableConcurrentBuilds()` evita
dos ejecuciones simultáneas del mismo job y el timeout global es de 30 minutos.
Se conservan hasta 20 builds con sus reportes; `reports/` está ignorado por Git.

Si el agente pierde la conexión o Jenkins se apaga abruptamente, comprobar si
quedó un proyecto `jenkins-*` antes de eliminarlo manualmente; `post` requiere
que el agente y Docker sigan disponibles.

Referencias: [Jenkins con Docker](https://www.jenkins.io/doc/book/installing/docker/),
[Pipeline de Jenkins](https://www.jenkins.io/doc/book/pipeline/syntax/),
[reportes de Playwright](https://playwright.dev/docs/test-reporters) y
[salida JSON de Jest](https://jestjs.io/docs/cli#--outputfilefilename).
