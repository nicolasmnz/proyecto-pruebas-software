#!/usr/bin/env python3
"""Valida el Jenkinsfile y ejecuta el checkout actual en un job local de Jenkins."""
import base64
import http.cookiejar
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import time
import urllib.error
import urllib.request
import uuid
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
COMPOSE = ["docker", "compose", "--env-file", "jenkins/server.env", "-f", "compose.jenkins-server.yml"]


def main():
    config = dict(line.split("=", 1) for line in (ROOT / "jenkins/server.env").read_text().splitlines()
                  if line and not line.startswith("#"))
    port = os.environ.get("JENKINS_PORT", config["JENKINS_PORT"])
    base = f"http://127.0.0.1:{int(port)}/"
    password = (ROOT / ".jenkins/secrets/admin_password").read_text().strip()
    auth = base64.b64encode(f"admin:{password}".encode()).decode()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    crumb = {}

    def request(path, data=None, content_type="application/json"):
        headers = {"Authorization": f"Basic {auth}", "Content-Type": content_type, **crumb}
        return opener.open(urllib.request.Request(base + path, data=data, headers=headers), timeout=30)

    csrf = json.load(request("crumbIssuer/api/json"))
    crumb[csrf["crumbRequestField"]] = csrf["crumb"]
    for _ in range(120):
        agent = json.load(request("computer/node24-docker/api/json"))
        if not agent["offline"]:
            break
        time.sleep(2)
    else:
        raise RuntimeError("El agente node24-docker no está conectado")

    pipeline = (ROOT / "Jenkinsfile").read_text()
    boundary = uuid.uuid4().hex
    payload = (f'--{boundary}\r\nContent-Disposition: form-data; name="jenkinsfile"'
               f'\r\nContent-Type: text/plain\r\n\r\n{pipeline}\r\n--{boundary}--\r\n').encode()
    validation = request("pipeline-model-converter/validate", payload,
                         f"multipart/form-data; boundary={boundary}").read().decode()
    print(validation.strip(), flush=True)
    if "Jenkinsfile successfully validated" not in validation:
        raise RuntimeError("Jenkins rechazó el Jenkinsfile")

    # Incluye cambios sin commit, pero respeta .gitignore y excluye credenciales/reportes.
    paths = subprocess.check_output(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"])
    reports = ROOT / "reports"
    reports.mkdir(exist_ok=True)
    archive = reports / "jenkins-source.tar"
    with tarfile.open(archive, "w") as target:
        for raw in paths.split(b"\0"):
            if raw:
                path = Path(os.fsdecode(raw))
                if path.is_file() or path.is_symlink():
                    target.add(path, arcname=path.as_posix(), recursive=False)
    # El volumen del agente conserva la copia al recrear el contenedor.
    # Debe quedar fuera del workspace que borra deleteDir().
    subprocess.run(COMPOSE + ["cp", str(archive), "agent:/home/jenkins/agent/mira-source.tar"], check=True)

    # Solo el job de comprobación recibe una etapa de copia; mira-ci sigue usando SCM.
    pipeline = pipeline.replace("options {", "options {\n        skipDefaultCheckout()", 1)
    pipeline = pipeline.replace("stages {", '''stages {
        stage('Checkout local para validacion') {
            steps {
                sh 'test -r /home/jenkins/agent/mira-source.tar || { echo "Falta la copia local del codigo. Ejecuta make jenkins-verify desde WSL en el repositorio." >&2; exit 1; }'
                deleteDir()
                sh 'tar --no-same-owner -xf /home/jenkins/agent/mira-source.tar -C "$WORKSPACE"'
            }
        }
    ''', 1)
    xml = f'''<flow-definition plugin="workflow-job">
      <description>Validación local del checkout, incluidos cambios sin commit. No usa el webhook.</description>
      <keepDependencies>false</keepDependencies>
      <properties><org.jenkinsci.plugins.workflow.job.properties.DisableConcurrentBuildsJobProperty/></properties>
      <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps">
        <script>{escape(pipeline)}</script><sandbox>true</sandbox>
      </definition><disabled>false</disabled></flow-definition>'''.encode()
    job = "mira-ci-local"
    try:
        request(f"job/{job}/api/json").close()
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
        request(f"createItem?name={job}", xml, "application/xml").close()
    else:
        state = json.load(request(f"job/{job}/api/json"))
        if state["inQueue"] or (state.get("lastBuild") and
                json.load(request(f'job/{job}/{state["lastBuild"]["number"]}/api/json'))["building"]):
            raise RuntimeError("Ya hay una validación local en ejecución")
        request(f"job/{job}/config.xml", xml, "application/xml").close()
    number = json.load(request(f"job/{job}/api/json"))["nextBuildNumber"]
    request(f"job/{job}/build", b"").close()
    print(f"Build local: {base}job/{job}/{number}/", flush=True)
    deadline = time.monotonic() + 35 * 60
    last_stage = None
    while time.monotonic() < deadline:
        try:
            build = json.load(request(f"job/{job}/{number}/api/json"))
        except urllib.error.HTTPError as error:
            if error.code != 404:
                raise
        else:
            if not build["building"]:
                result = {"url": f"{base}job/{job}/{number}/", "result": build["result"],
                          "source": "checkout local, con cambios sin commit"}
                (reports / "jenkins-validation.json").write_text(json.dumps(result, indent=2) + "\n")
                print(f'Resultado Jenkins: {build["result"]}', flush=True)
                log = request(f"job/{job}/{number}/consoleText").read().decode()
                (reports / "jenkins-console.log").write_text(log)
                if build["result"] != "SUCCESS":
                    print(log[-12000:], file=sys.stderr)
                    return 1
                unit = json.load(request(f"job/{job}/{number}/artifact/reports/api-unit.json"))
                integration = json.load(request(f"job/{job}/{number}/artifact/reports/api-integration.json"))
                junit = json.load(request(f"job/{job}/{number}/testReport/api/json"))
                if not unit["success"] or not integration["success"] or junit["failCount"]:
                    raise RuntimeError("Los reportes archivados contienen fallos")
                result["tests_passed"] = unit["numPassedTests"] + integration["numPassedTests"] + junit["passCount"]
                project = f"jenkins-jenkins-{job}-{number}"
                for command in (["ps", "-aq"], ["volume", "ls", "-q"]):
                    remaining = subprocess.check_output(COMPOSE + ["exec", "-T", "agent", "docker"] + command +
                        ["--filter", f"label=com.docker.compose.project={project}"]).strip()
                    if remaining:
                        raise RuntimeError("Quedaron recursos Docker del build después de la limpieza")
                result["cleanup_verified"] = True
                (reports / "jenkins-validation.json").write_text(json.dumps(result, indent=2) + "\n")
                print(f'Pruebas aprobadas: {result["tests_passed"]}; limpieza verificada.', flush=True)
                return 0
            try:
                stages = json.load(request(f"job/{job}/{number}/wfapi/describe")).get("stages", [])
            except urllib.error.HTTPError as error:
                if error.code != 404:
                    raise
                stages = []
            if stages:
                current = (stages[-1]["name"], stages[-1]["status"])
                if current != last_stage:
                    print(f"Etapa: {current[0]} ({current[1]})", flush=True)
                    last_stage = current
        time.sleep(5)
    raise RuntimeError("Se agotó la espera; revisar el build en Jenkins")


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"Error de validación: {error}", file=sys.stderr)
        sys.exit(1)
