FROM jenkins/jenkins:lts-jdk21

COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

USER root
RUN mkdir -p /var/jenkins_agent && chown jenkins:jenkins /var/jenkins_agent
USER jenkins

COPY --chown=jenkins:jenkins init.groovy /usr/share/jenkins/ref/init.groovy.d/01-mira.groovy.override
