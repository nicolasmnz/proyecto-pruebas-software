pipeline {
    agent { label 'node24-docker' }

    options {
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        CI = 'true'
        COMPOSE_FILE = 'compose.jenkins.yml'
        PLAYWRIGHT_JUNIT_OUTPUT_FILE = 'reports/e2e.xml'
    }

    stages {
        stage('Preparar') {
            steps {
                script {
                    // Evita compartir contenedores, redes o volumenes con otros jobs.
                    env.COMPOSE_PROJECT_NAME = "jenkins-${env.BUILD_TAG}".toLowerCase().replaceAll('[^a-z0-9_-]', '-')
                }
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
                    def port = sh(script: "docker compose port db-test 5432 | awk -F: '{print \$NF}'", returnStdout: true).trim()
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
                    def apiPort = sh(script: "docker compose port api 3000 | awk -F: '{print \$NF}'", returnStdout: true).trim()
                    env.E2E_API_URL = "http://127.0.0.1:${apiPort}/api"
                }
                sh 'docker compose up -d --no-deps --build --wait --wait-timeout 120 web'
                script {
                    def webPort = sh(script: "docker compose port web 5173 | awk -F: '{print \$NF}'", returnStdout: true).trim()
                    withEnv(["E2E_BASE_URL=http://127.0.0.1:${webPort}"]) {
                        sh 'npm run test:e2e -- --reporter=list,html,junit'
                    }
                }
            }
        }
    }

    post {
        always {
            // Un fallo al publicar reportes no debe impedir la limpieza.
            script {
                try {
                    junit testResults: 'reports/*.xml', allowEmptyResults: true
                    archiveArtifacts artifacts: 'reports/**,playwright-report/**,test-results/**', allowEmptyArchive: true
                } finally {
                    if (env.COMPOSE_PROJECT_NAME) {
                        sh returnStatus: true, script: 'docker compose logs --no-color > reports/containers.log 2>&1'
                        sh 'docker compose down --volumes --remove-orphans --timeout 10'
                        archiveArtifacts artifacts: 'reports/containers.log', allowEmptyArchive: true
                    }
                }
            }
        }
    }
}
