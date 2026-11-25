// Devuelve el puerto publicado por un servicio del compose; falla si no existe.
def composePort(String service, int port) {
    def address = sh(script: "docker compose port ${service} ${port}", returnStdout: true).trim()
    def published = address.substring(address.lastIndexOf(':') + 1)
    if (!published.matches('\\d+')) {
        error("No se pudo obtener el puerto publicado de ${service}:${port} (salida: '${address}')")
    }
    return published
}

// Notifica el resultado en Slack. Es opcional: si Slack no está configurado o el envío
// falla, solo deja un aviso en el log y el resultado del build no cambia.
def notifySlack() {
    def result = currentBuild.currentResult
    def colors = [SUCCESS: 'good', FAILURE: 'danger', UNSTABLE: 'warning', ABORTED: '#808080']
    def message = [
        "*Mira CI - ${result}*",
        '',
        "*Trabajo:* ${env.JOB_NAME}",
        "*Build:* #${env.BUILD_NUMBER}",
        "*Rama:* ${env.BRANCH_NAME}",
        "*PR:* ${env.CHANGE_ID ?: 'No aplica'}",
        "*Origen:* ${env.CHANGE_BRANCH ?: env.BRANCH_NAME}",
        "*Destino:* ${env.CHANGE_TARGET ?: 'No aplica'}",
        "*Commit:* ${env.GIT_COMMIT?.take(12) ?: 'N/A'}",
        "*Duración:* ${currentBuild.durationString}",
        '',
        "<${env.BUILD_URL}|Ver ejecución en Jenkins>",
    ].join('\n')
    try {
        slackSend(color: colors[result] ?: '#808080', failOnError: false, message: message)
    } catch (Exception e) {
        echo "Aviso: no se pudo notificar en Slack: ${e.message}"
    }
}

pipeline {
    agent { label 'node24-docker' }

    options {
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        CI = 'true'
        COMPOSE_FILE = 'compose.jenkins.yml'
        PLAYWRIGHT_JUNIT_OUTPUT_FILE = 'reports/e2e.xml'
    }

    stages {
        // El checkout lo hace Jenkins con la revisión exacta del build (rama o PR),
        // así que el pipeline no fija ninguna rama.
        stage('Preparar') {
            steps {
                script {
                    // Evita compartir contenedores, redes o volumenes con otros jobs.
                    env.COMPOSE_PROJECT_NAME = "jenkins-${env.BUILD_TAG}".toLowerCase().replaceAll('[^a-z0-9_-]', '-')

                    def commit = env.GIT_COMMIT ?: 'desconocido'
                    def shortCommit = commit.length() > 12 ? commit.substring(0, 12) : commit
                    def origin = env.CHANGE_ID ?
                        "PR #${env.CHANGE_ID} (${env.CHANGE_BRANCH ?: '?'} -> ${env.CHANGE_TARGET ?: '?'})" :
                        "rama ${env.BRANCH_NAME ?: 'desconocida'}"
                    currentBuild.description = "${origin} @ ${shortCommit}"
                    echo """Trazabilidad del build
  Job:            ${env.JOB_NAME}
  Ejecucion:      #${env.BUILD_NUMBER} (${env.BUILD_TAG})
  URL:            ${env.BUILD_URL ?: '-'}
  Rama:           ${env.BRANCH_NAME ?: '-'}
  Commit:         ${commit}
  PR:             ${env.CHANGE_ID ?: '-'}
  PR origen:      ${env.CHANGE_BRANCH ?: '-'}
  PR destino:     ${env.CHANGE_TARGET ?: '-'}
  PR URL:         ${env.CHANGE_URL ?: '-'}
  PR autor:       ${env.CHANGE_AUTHOR ?: '-'}
  Proyecto Docker: ${env.COMPOSE_PROJECT_NAME}"""
                }
                sh '''
                    if git rev-parse --git-dir > /dev/null 2>&1; then
                        git --no-pager log -1 --format='HEAD: %H%nPadres: %P%nAutor: %an%nMensaje: %s'
                    fi
                '''
                sh '''
                    node -e "if (process.versions.node.split('.')[0] !== '24') process.exit(1)"
                    docker info > /dev/null
                    docker compose version
                    docker compose config --quiet
                    rm -rf reports playwright-report test-results
                    mkdir -p reports
                    npm ci
                '''
            }
        }

        stage('Calidad') {
            steps {
                sh 'npm run lint'
                sh 'npm run typecheck'
            }
        }

        stage('Unitarias API') {
            steps {
                sh 'npm run test:unit -w apps/api -- --runInBand --json --outputFile=../../reports/api-unit.json'
            }
        }

        stage('Componentes y utilidades web') {
            steps {
                sh 'npm run test -w apps/web -- --reporter=default --reporter=junit --outputFile=../../reports/web.xml'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Integracion API') {
            steps {
                sh 'docker compose up -d --wait --wait-timeout 120 db-test'
                script {
                    def port = composePort('db-test', 5432)
                    withEnv(["DB_HOST=127.0.0.1", "DB_PORT=${port}", 'DB_NAME=proyecto_pruebas_test', 'DB_USER=test_user', 'DB_PASSWORD=test_password', 'NODE_ENV=test']) {
                        sh 'npm run test:integration -w apps/api -- --json --outputFile=../../reports/api-integration.json'
                    }
                }
            }
        }

        stage('E2E Chromium') {
            steps {
                sh 'npx playwright install chromium'
                sh 'docker compose up -d --build --wait --wait-timeout 180 api'
                script {
                    env.E2E_API_URL = "http://127.0.0.1:${composePort('api', 3000)}/api"
                }
                sh 'docker compose up -d --no-deps --build --wait --wait-timeout 120 web'
                script {
                    withEnv(["E2E_BASE_URL=http://127.0.0.1:${composePort('web', 5173)}"]) {
                        sh 'npm run test:e2e -- --reporter=list,html,junit'
                    }
                }
            }
        }
    }

    post {
        always {
            // Un fallo al publicar reportes no debe impedir la limpieza, pero sí falla el build.
            script {
                try {
                    // Si todo pasó, los reportes deben existir: su ausencia es un error.
                    junit testResults: 'reports/*.xml', allowEmptyResults: currentBuild.currentResult != 'SUCCESS'
                    archiveArtifacts artifacts: 'reports/**,playwright-report/**,test-results/**', allowEmptyArchive: true
                } finally {
                    if (env.COMPOSE_PROJECT_NAME) {
                        sh returnStatus: true, script: 'mkdir -p reports && docker compose logs --no-color > reports/containers.log 2>&1'
                        try {
                            // Elimina contenedores, redes, volúmenes e imágenes construidas por este build.
                            sh 'docker compose down --volumes --remove-orphans --rmi local --timeout 10'
                        } finally {
                            archiveArtifacts artifacts: 'reports/containers.log', allowEmptyArchive: true
                        }
                    }
                }
            }
        }
        unstable {
            // Pruebas fallidas en los reportes nunca deben dejar el build como exitoso.
            error('Los reportes JUnit contienen pruebas fallidas')
        }
        success {
            echo "Resultado: SUCCESS - ${currentBuild.description ?: env.BUILD_TAG}"
        }
        failure {
            echo "Resultado: FAILURE - ${currentBuild.description ?: env.BUILD_TAG}"
        }
        cleanup {
            script {
                try {
                    // Elimina el workspace temporal del agente.
                    deleteDir()
                } catch (Exception e) {
                    currentBuild.result = 'FAILURE'
                    throw e
                } finally {
                    notifySlack()
                }
            }
        }
    }
}
