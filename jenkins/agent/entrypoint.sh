#!/bin/sh
set -eu

# El volumen compartido puede haber sido creado primero por Docker-in-Docker.
chown jenkins:jenkins /home/jenkins/agent
export HOME=/home/jenkins
export USER=jenkins

attempt=0
until [ -s /var/jenkins_agent/secret ]; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 120 ]; then
        echo 'El controlador no generó el secreto del agente.' >&2
        exit 1
    fi
    sleep 2
done

exec gosu jenkins java -jar /usr/share/jenkins/agent.jar \
    -url "$JENKINS_URL" \
    -secret @/var/jenkins_agent/secret \
    -name node24-docker \
    -webSocket \
    -workDir /home/jenkins/agent
