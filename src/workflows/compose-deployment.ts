/**
 * Docker Compose deployment workflow.
 */

import * as core from '@actions/core'
import type { DokployClient } from '../client/dokploy-client'
import type { ActionInputs } from '../types/dokploy'
import { getDeploymentId } from '../utils/helpers'
import { resolveEnvironment, resolveProject } from './resources'
import { waitForQueuedDeployment } from './wait-and-health'

export async function runComposeDeployment(
  client: DokployClient,
  inputs: ActionInputs
): Promise<void> {
  core.info('📦 Starting Docker Compose deployment...')
  core.info('='.repeat(60))

  const projectId = await resolveProject(client, inputs)
  const environmentId = await resolveEnvironment(client, inputs, projectId)

  core.startGroup('📦 Compose Service')

  const composeName = inputs.composeName || inputs.applicationName
  if (!composeName) {
    throw new Error('compose-name is required for compose deployments')
  }

  const existing = await client.findComposeByName(environmentId, composeName)
  if (!existing) {
    throw new Error(`Compose service "${composeName}" not found. Create it in Dokploy Admin first.`)
  }

  const composeId = existing.composeId || existing.id
  if (!composeId) {
    throw new Error(`Compose service "${composeName}" was found but has no ID`)
  }

  core.info(`✅ Found compose service: ${composeName} (ID: ${composeId})`)
  core.setOutput('application-id', composeId)
  core.setOutput('compose-id', composeId)
  core.endGroup()

  core.startGroup('📝 Compose File Configuration')

  let composeContent = ''

  if (inputs.dokployTemplateBase64) {
    core.info('📥 Loading Dokploy template from Base64...')
    composeContent = Buffer.from(inputs.dokployTemplateBase64, 'base64').toString('utf-8')
    core.info(`✅ Template decoded (${composeContent.split('\n').length} lines)`)
  } else if (inputs.composeRaw) {
    core.info('📥 Using raw compose content...')
    composeContent = inputs.composeRaw
    core.info(`✅ Compose content loaded (${composeContent.split('\n').length} lines)`)
  } else if (inputs.composeFile) {
    const fs = await import('fs/promises')
    const path = await import('path')

    core.info(`📥 Reading compose file: ${inputs.composeFile}`)
    const fullPath = path.resolve(process.cwd(), inputs.composeFile)

    try {
      composeContent = await fs.readFile(fullPath, 'utf-8')
      core.info(`✅ Compose file loaded (${composeContent.split('\n').length} lines)`)
    } catch (error) {
      core.error(`❌ Failed to read compose file: ${inputs.composeFile}`)
      throw error
    }
  }

  if (composeContent) {
    await client.saveComposeFile(composeId, composeContent)
  }

  core.endGroup()

  core.startGroup('🚀 Deployment')
  let previousDeploymentIds: string[] = []
  try {
    const existingDeployments = await client.listComposeDeployments(composeId)
    previousDeploymentIds = existingDeployments
      .map(deployment => getDeploymentId(deployment))
      .filter((id): id is string => Boolean(id))
  } catch {
    core.warning('⚠️ Could not list existing compose deployments before deploy')
  }

  const deployQueuedAt = Date.now()
  try {
    await client.deployCompose(
      composeId,
      inputs.deploymentTitle || `Deploy compose: ${composeName}`,
      inputs.deploymentDescription || 'Automated compose deployment via GitHub Actions'
    )
    core.info('✅ Deployment queued')
  } catch (deployError) {
    core.setOutput('deployment-status', 'failed')
    core.error(`❌ Deployment Failed: ${deployError}`)
    core.endGroup()
    throw deployError
  }
  core.endGroup()

  await waitForQueuedDeployment({
    client,
    inputs,
    kind: 'compose',
    serviceId: composeId,
    previousDeploymentIds,
    startedAfterMs: deployQueuedAt
  })

  core.info('')
  core.info('='.repeat(60))
  core.info('✅ Compose deployment completed successfully!')
  core.info('='.repeat(60))
  core.info(`📦 Compose Service: ${composeId}`)
  core.info(`📁 Project: ${projectId}`)
  core.info('='.repeat(60))
}
