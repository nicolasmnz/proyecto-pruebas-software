import hudson.model.Node
import hudson.security.HudsonPrivateSecurityRealm
import hudson.security.FullControlOnceLoggedInAuthorizationStrategy
import hudson.slaves.DumbSlave
import hudson.slaves.JNLPLauncher
import hudson.slaves.RetentionStrategy
import hudson.plugins.git.BranchSpec
import hudson.plugins.git.GitSCM
import hudson.plugins.git.UserRemoteConfig
import com.cloudbees.jenkins.GitHubPushTrigger
import jenkins.model.Jenkins
import jenkins.model.JenkinsLocationConfiguration
import org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition
import org.jenkinsci.plugins.workflow.job.WorkflowJob
import org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty

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

def jobName = 'mira-ci'
if (instance.getItem(jobName) == null) {
    def job = instance.createProject(WorkflowJob, jobName)
    def remote = new UserRemoteConfig(System.getenv('JENKINS_REPOSITORY_URL'), null, null,
        System.getenv('JENKINS_SCM_CREDENTIALS_ID') ?: null)
    def scm = new GitSCM([remote], [new BranchSpec('*/' + System.getenv('JENKINS_BRANCH'))],
        false, [], null, null, [])
    def definition = new CpsScmFlowDefinition(scm, 'Jenkinsfile')
    definition.setLightweight(true)
    job.setDefinition(definition)
    job.addProperty(new PipelineTriggersJobProperty([new GitHubPushTrigger()]))
    job.setDescription('PPDS-18: calidad, unitarias, integración y E2E. Pipeline definido en el repositorio.')
    job.save()
}
instance.save()
println('Mira: administrador, agente node24-docker y job mira-ci configurados.')
