import hudson.model.Node
import hudson.security.HudsonPrivateSecurityRealm
import hudson.security.FullControlOnceLoggedInAuthorizationStrategy
import hudson.slaves.DumbSlave
import hudson.slaves.JNLPLauncher
import hudson.slaves.RetentionStrategy
import com.cloudbees.hudson.plugins.folder.computed.PeriodicFolderTrigger
import jenkins.branch.BranchSource
import jenkins.model.Jenkins
import jenkins.model.JenkinsLocationConfiguration
import org.jenkinsci.plugins.github_branch_source.BranchDiscoveryTrait
import org.jenkinsci.plugins.github_branch_source.ForkPullRequestDiscoveryTrait
import org.jenkinsci.plugins.github_branch_source.GitHubSCMSource
import org.jenkinsci.plugins.github_branch_source.OriginPullRequestDiscoveryTrait
import org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject

def instance = Jenkins.get()
instance.setNumExecutors(0)
instance.setSlaveAgentPort(-1) // El agente usa WebSocket.
if (!(instance.securityRealm instanceof HudsonPrivateSecurityRealm)) {
    instance.setSecurityRealm(new HudsonPrivateSecurityRealm(false))
}
if (!instance.securityRealm.allUsers.any { it.id == 'admin' }) {
    instance.securityRealm.createAccount('admin', new File('/run/secrets/jenkins_admin_password').text.trim())
}
def authorization = new FullControlOnceLoggedInAuthorizationStrategy()
authorization.setAllowAnonymousRead(false)
instance.setAuthorizationStrategy(authorization)
JenkinsLocationConfiguration.get().setUrl(System.getenv('JENKINS_PUBLIC_URL'))

def agentName = 'node24-docker'
if (instance.getNode(agentName) == null) {
    def launcher = new JNLPLauncher()
    launcher.setWebSocket(true)
    def node = new DumbSlave(agentName, '/home/jenkins/agent', launcher)
    node.setNumExecutors(1)
    node.setLabelString(agentName)
    node.setMode(Node.Mode.EXCLUSIVE)
    node.setRetentionStrategy(new RetentionStrategy.Always())
    instance.addNode(node)
}
def secretFile = new File('/var/jenkins_agent/secret')
secretFile.text = instance.getComputer(agentName).getJnlpMac()
secretFile.setReadable(false, false)
secretFile.setReadable(true, true)
secretFile.setWritable(false, false)
secretFile.setWritable(true, true)

// Job multibranch: Jenkins descubre main, develop, ramas de funcionalidades y PRs,
// y cada build hace checkout de su propio commit (sin rama fija).
def repositoryUrl = System.getenv('JENKINS_REPOSITORY_URL')
def repository = repositoryUrl =~ /github\.com[:\/]([^\/]+)\/([^\/]+?)(\.git)?\/?$/
if (!repository.find()) {
    throw new IllegalStateException("JENKINS_REPOSITORY_URL debe apuntar a un repositorio de GitHub: ${repositoryUrl}")
}
def owner = repository.group(1)
def repo = repository.group(2)

def jobName = 'mira-ci'
def existing = instance.getItem(jobName)
if (existing != null && !(existing instanceof WorkflowMultiBranchProject)) {
    // El job anterior estaba fijado a una rama; se conserva deshabilitado con su historial.
    existing.makeDisabled(true)
    existing.renameTo(jobName + '-rama-fija')
    existing = null
}
def job = existing ?: instance.createProject(WorkflowMultiBranchProject, jobName)

def source = new GitHubSCMSource(owner, repo, "https://github.com/${owner}/${repo}", true)
source.setId('mira-github')
source.setCredentialsId(System.getenv('JENKINS_SCM_CREDENTIALS_ID') ?: null)
source.setTraits([
    // 1: ramas sin PR abierto (las que tienen PR se construyen como PR).
    new BranchDiscoveryTrait(1),
    // 1: el PR se construye fusionado con su rama de destino.
    new OriginPullRequestDiscoveryTrait(1),
    // PRs desde forks: solo se confía en el Jenkinsfile de colaboradores con permiso de escritura.
    new ForkPullRequestDiscoveryTrait(1, new ForkPullRequestDiscoveryTrait.TrustPermission()),
])
job.setSourcesList([new BranchSource(source)])
job.getProjectFactory().setScriptPath('Jenkinsfile')
// Respaldo si no hay webhook; los eventos de GitHub disparan builds de inmediato.
job.addTrigger(new PeriodicFolderTrigger('1h'))
job.setDescription('Calidad, unitarias, integración y E2E para ramas y PRs. Pipeline definido en el Jenkinsfile de cada rama.')
job.save()
job.scheduleBuild() // Escanea el repositorio al iniciar.

instance.save()
println("Mira: administrador, agente node24-docker y job multibranch ${jobName} (${owner}/${repo}) configurados.")
