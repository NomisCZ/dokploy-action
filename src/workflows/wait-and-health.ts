/**
 * Shared wait-for-deployment step.
 */

import * as core from '@actions/core'
import type { DokployClient } from '../client/dokploy-client'
import type { ActionInputs } from '../types/dokploy'
import { getDeploymentId } from '../utils/helpers'

export async function waitForQueuedDeployment(options: {
  client: DokployClient
  inputs: ActionInputs
  kind: 'application' | 'compose'
  serviceId: string
  previousDeploymentIds: string[]
  startedAfterMs: number
  logDuration?: boolean
}): Promise<boolean> {
  const { client, inputs, kind, serviceId, previousDeploymentIds, startedAfterMs, logDuration } =
    options

  if (!inputs.waitForDeployment) {
    core.setOutput('deployment-status', 'success')
    core.setOutput('health-check-status', 'skipped')
    return false
  }

  core.startGroup('⏳ Waiting for Deployment')

  try {
    const timeout = inputs.deploymentTimeout || 300
    const finalDeployment = await client.waitForServiceDeployment({
      kind,
      serviceId,
      previousDeploymentIds,
      startedAfterMs,
      timeoutSeconds: timeout
    })
    const deploymentId = getDeploymentId(finalDeployment)
    if (deploymentId) {
      core.setOutput('deployment-id', deploymentId)
    }
    core.setOutput('deployment-status', finalDeployment.status || 'done')
    if (logDuration) {
      const startedAt = Date.parse(finalDeployment.startedAt || '')
      if (!Number.isNaN(startedAt)) {
        core.info(`✅ Deployment completed in ${Math.round((Date.now() - startedAt) / 1000)}s`)
      } else {
        core.info('✅ Deployment completed')
      }
    } else {
      core.info(`✅ Deployment completed`)
    }
  } catch (waitError) {
    core.setOutput('deployment-status', 'failed')
    const errorMessage = waitError instanceof Error ? waitError.message : String(waitError)
    core.error(`❌ Deployment wait failed: ${errorMessage}`)
    core.endGroup()
    throw waitError
  }

  core.endGroup()
  core.setOutput('health-check-status', 'skipped')
  return true
}
