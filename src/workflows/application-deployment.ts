/**
 * Application deployment workflow.
 */

import * as core from '@actions/core'
import type { DokployClient } from '../client/dokploy-client'
import type { ActionInputs } from '../types/dokploy'
import { getDeploymentId, sleep } from '../utils/helpers'
import { resolveEnvironment, resolveProject } from './resources'
import { waitForQueuedDeployment } from './wait-and-health'

export async function runApplicationDeployment(
  client: DokployClient,
  inputs: ActionInputs
): Promise<void> {
  core.info('🚀 Starting application deployment...')
  core.info('='.repeat(60))

  let projectId: string | undefined
  let environmentId: string | undefined
  let applicationId = inputs.applicationId

  if (!applicationId) {
    projectId = await resolveProject(client, inputs)
    environmentId = await resolveEnvironment(client, inputs, projectId)

    if (!inputs.applicationName) {
      throw new Error('Either application-id or application-name must be provided')
    }

    core.startGroup('📦 Application')
    const project = await client.getProject(projectId)
    const environment = project.environments?.find(
      env => (env.environmentId || env.id) === environmentId
    )
    const existing = environment?.applications?.find(app => app.name === inputs.applicationName)

    if (!existing) {
      throw new Error(
        `Application "${inputs.applicationName}" not found. Create it in Dokploy Admin first.`
      )
    }

    applicationId = existing.applicationId || existing.id
    core.info(`✅ Found application: ${inputs.applicationName} (ID: ${applicationId})`)
    core.endGroup()
  } else {
    core.info(`📦 Using application ID: ${applicationId}`)
  }

  if (!applicationId) {
    throw new Error('Either application-id or application-name must be provided')
  }

  core.setOutput('application-id', applicationId)

  core.startGroup('🐳 Docker Provider Configuration')
  await client.saveDockerProvider(
    applicationId,
    inputs.dockerImage,
    inputs.registryUrl,
    inputs.registryUsername,
    inputs.registryPassword
  )
  core.endGroup()

  if (inputs.cleanupOldContainers) {
    core.startGroup('🧹 Cleanup Old Containers')
    await client.stopApplication(applicationId)
    core.info('⏳ Waiting 15 seconds for containers to stop...')
    await sleep(15000)
    core.endGroup()
  }

  core.startGroup('🚀 Deployment')
  let previousDeploymentIds: string[] = []
  try {
    const existingDeployments = await client.listApplicationDeployments(applicationId)
    previousDeploymentIds = existingDeployments
      .map(deployment => getDeploymentId(deployment))
      .filter((id): id is string => Boolean(id))
  } catch {
    core.warning('⚠️ Could not list existing deployments before deploy')
  }

  const deployQueuedAt = Date.now()
  try {
    await client.deployApplication(
      applicationId,
      inputs.deploymentTitle || `Deploy ${inputs.dockerImage}`,
      inputs.deploymentDescription || 'Automated deployment via GitHub Actions'
    )
    core.info('✅ Deployment queued (application.deploy does not return a deployment ID)')
  } catch (deployError) {
    core.setOutput('deployment-status', 'failed')
    logApplicationDeployError(deployError, inputs)
    core.endGroup()
    throw deployError
  }
  core.endGroup()

  await waitForQueuedDeployment({
    client,
    inputs,
    kind: 'application',
    serviceId: applicationId,
    previousDeploymentIds,
    startedAfterMs: deployQueuedAt,
    logDuration: true
  })

  core.info('')
  core.info('='.repeat(60))
  core.info('✅ Deployment completed successfully!')
  core.info('='.repeat(60))
  core.info(`📦 Application: ${applicationId}`)
  if (projectId) core.info(`📁 Project: ${projectId}`)
  if (environmentId) core.info(`🌍 Environment: ${environmentId}`)
  core.info('='.repeat(60))
}

function logApplicationDeployError(deployError: unknown, inputs: ActionInputs): void {
  const errorMessage = deployError instanceof Error ? deployError.message : String(deployError)

  core.error('❌ Deployment Failed')
  core.error('='.repeat(60))
  core.error('')

  if (errorMessage.includes('name must be valid as a DNS name component')) {
    core.error(`DNS Name Validation Error:`)
    core.error(`  One or more names (application, project, or environment) are invalid.`)
    core.error('')
    core.error(`DNS names must:`)
    core.error(`  • Contain only lowercase letters, numbers, and hyphens`)
    core.error(`  • Start and end with a letter or number`)
    core.error(`  • Be 63 characters or less`)
    core.error('')
    core.error(`💡 Fix: Check your application-name, project-name, and environment-name inputs`)
    if (inputs.applicationName) {
      core.error(`   Application: "${inputs.applicationName}"`)
    }
    if (inputs.projectName) {
      core.error(`   Project: "${inputs.projectName}"`)
    }
    if (inputs.environmentName) {
      core.error(`   Environment: "${inputs.environmentName}"`)
    }
  } else {
    core.error(`Error: ${errorMessage}`)
  }

  core.error('')
  core.error('='.repeat(60))
}
