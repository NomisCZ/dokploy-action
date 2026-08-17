/**
 * Dokploy GitHub Action - Main Entry Point
 * Version: 1.0.0
 * Author: SSanjeevi
 *
 * This action deploys existing Dokploy applications and compose services.
 * Project, environment, and application resources must already exist.
 *
 * Important: If health check is enabled and fails, the deployment will be
 * marked as failed even if the container deployment succeeded. This ensures
 * users are aware when the new version is not functioning correctly.
 */

import * as core from '@actions/core'
import { DokployClient } from './client/dokploy-client'
import { parseInputs } from './inputs'
import { parseDokployUrl } from './utils/helpers'
import { validateAllInputs, ValidationError, formatValidationError } from './validators'
import { runApplicationDeployment } from './workflows/application-deployment'
import { runComposeDeployment } from './workflows/compose-deployment'

export async function run(): Promise<void> {
  try {
    core.info('🚀 Dokploy Deployment Action v1.0')
    core.info('='.repeat(60))

    core.startGroup('📋 Parsing and Validating Inputs')
    const inputs = parseInputs()

    try {
      validateAllInputs({
        dockerImage: inputs.dockerImage,
        deploymentType: inputs.deploymentType,
        applicationName: inputs.applicationName,
        projectName: inputs.projectName,
        environmentName: inputs.environmentName
      })
      core.info('✅ All inputs validated successfully')
    } catch (error) {
      if (error instanceof ValidationError) {
        core.error(formatValidationError(error))
      }
      throw error
    }

    core.info(`✅ Docker Image: ${inputs.dockerImage}`)
    if (inputs.environmentName) core.info(`✅ Environment: ${inputs.environmentName}`)
    core.endGroup()

    core.startGroup('🔌 Connecting to Dokploy')
    const client = new DokployClient({
      url: inputs.dokployUrl,
      apiKey: inputs.apiKey
    })
    core.info(`✅ Connected to: ${parseDokployUrl(inputs.dokployUrl).baseUrl}`)
    core.endGroup()

    if (inputs.deploymentType === 'compose') {
      await runComposeDeployment(client, inputs)
    } else {
      await runApplicationDeployment(client, inputs)
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`❌ Deployment failed: ${error.message}`)
      core.debug(`Error stack trace: ${error.stack}`)
    } else {
      core.setFailed(`❌ Deployment failed: ${String(error)}`)
    }
    throw error
  }
}

if (require.main === module) {
  run()
}
