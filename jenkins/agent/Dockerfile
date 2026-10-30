FROM eclipse-temurin:21-jre-jammy AS java
FROM jenkins/inbound-agent:jdk21 AS remoting
FROM docker:29.1.3-cli AS docker
FROM node:24-bookworm-slim

COPY --from=java /opt/java/openjdk /opt/java/openjdk
COPY --from=remoting /usr/share/jenkins/agent.jar /usr/share/jenkins/agent.jar
COPY --from=docker /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker /usr/local/libexec/docker/cli-plugins/docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose

ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="/opt/java/openjdk/bin:${PATH}"
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers
ARG PLAYWRIGHT_VERSION=1.63.0

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates curl fontconfig gosu \
    && npx --yes --package=playwright@${PLAYWRIGHT_VERSION} playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/* /root/.npm \
    && usermod --login jenkins --home /home/jenkins --move-home node \
    && groupmod --new-name jenkins node \
    && mkdir -p /home/jenkins/agent \
    && chown -R jenkins:jenkins /home/jenkins \
    && chmod -R a+rX /opt/playwright-browsers

# Playwright registra cada checkout y bloquea esta cache incluso si el navegador ya existe.
RUN chown -R jenkins:jenkins /opt/playwright-browsers
ENV HOME=/home/jenkins USER=jenkins

COPY --chmod=755 jenkins/agent/entrypoint.sh /usr/local/bin/mira-agent
WORKDIR /home/jenkins/agent
ENTRYPOINT ["/usr/local/bin/mira-agent"]
