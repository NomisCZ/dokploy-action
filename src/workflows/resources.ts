/**
 * Resolve existing project and environment. Resources are never created.
 */

import * as core from '@actions/core'
import type { DokployClient } from '../client/dokploy-client'
import type { ActionInputs } from '../types/dokploy'

export async function resolveProject(client: DokployClient, inputs: ActionInputs): Promise<string> {
  core.startGroup('📁 Project')
  let projectId = inputs.projectId

  if (!projectId && inputs.projectName) {
    const existing = await client.findProjectByName(inputs.projectName)
    if (!existing) {
      throw new Error(
        `Project "${inputs.projectName}" not found. Create it in Dokploy Admin first.`
      )
    }
    projectId = existing.projectId || existing.id
    core.info(`✅ Found project: ${inputs.projectName} (ID: ${projectId})`)
  }

  if (!projectId) {
    throw new Error('Either project-id or project-name must be provided')
  }

  core.setOutput('project-id', projectId)
  core.endGroup()
  return projectId
}

export async function resolveEnvironment(
  client: DokployClient,
  inputs: ActionInputs,
  projectId: string
): Promise<string> {
  core.startGroup('🌍 Environment')
  let environmentId = inputs.environmentId

  if (!environmentId && inputs.environmentName) {
    const existing = await client.findEnvironmentInProject(projectId, inputs.environmentName)
    if (!existing) {
      throw new Error(
        `Environment "${inputs.environmentName}" not found in project. Create it in Dokploy Admin first.`
      )
    }
    environmentId = existing.environmentId || existing.id
    core.info(`✅ Found environment: ${inputs.environmentName} (ID: ${environmentId})`)
  }

  if (!environmentId) {
    throw new Error('Either environment-id or environment-name must be provided')
  }

  core.setOutput('environment-id', environmentId)
  core.endGroup()
  return environmentId
}
