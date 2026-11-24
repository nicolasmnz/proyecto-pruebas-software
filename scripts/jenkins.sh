#!/usr/bin/env bash
set -euo pipefail
export COMPOSE_PROGRESS=plain
export COMPOSE_ANSI=never

cd "$(dirname "$0")/.."
compose=(docker compose --env-file jenkins/server.env -f compose.jenkins-server.yml)

case "${1:-up}" in
  up)
    mkdir -p .jenkins/secrets
    if [[ ! -s .jenkins/secrets/admin_password ]]; then
      (umask 077; openssl rand -hex 32 > .jenkins/secrets/admin_password)
    fi
    "${compose[@]}" up -d --build --wait --wait-timeout 600
    port="${JENKINS_PORT:-$(sed -n 's/^JENKINS_PORT=//p' jenkins/server.env)}"
    echo "Jenkins iniciado en http://localhost:${port:-9090}/ (usuario admin; contraseña en .jenkins/secrets/admin_password)."
    ;;
  down) "${compose[@]}" down ;;
  logs) "${compose[@]}" logs --tail=100 -f ;;
  status) "${compose[@]}" ps ;;
  *) echo 'Uso: bash scripts/jenkins.sh {up|down|logs|status}' >&2; exit 2 ;;
esac
