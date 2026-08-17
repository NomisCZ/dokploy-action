/**
 * Dokploy API Client
 * Comprehensive wrapper for all Dokploy API endpoints
 */

import * as core from '@actions/core'
import * as httpm from '@actions/http-client'
import type {
  DokployConfig,
  Project,
  Environment,
  Application,
  Container,
  Deployment,
  Compose
} from '../types/dokploy'
import {
  debugLog,
  logApiRequest,
  logApiResponse,
  parseDokployUrl,
  sleep,
  getDeploymentId,
  isDeploymentSuccessful,
  isDeploymentFailed
} from '../utils/helpers'

export class DokployClient {
  private baseUrl: string
  private apiKey: string
  private client: httpm.HttpClient
  private config: DokployConfig

  constructor(config: DokployConfig) {
    this.config = config
    const { baseUrl, basicAuthHeader } = parseDokployUrl(config.url)
    this.baseUrl = baseUrl
    this.apiKey = config.apiKey

    const headers: Record<string, string> = {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-api-key': config.apiKey
    }
    if (basicAuthHeader) {
      headers.Authorization = basicAuthHeader
    }

    this.client = new httpm.HttpClient('dokploy-github-action', undefined, {
      headers
    })
  }

  /**
   * Make a GET request to Dokploy API
   */
  async get<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    logApiRequest('GET', url)

    try {
      const response = await this.client.getJson<T>(url)
      logApiResponse(response.statusCode ?? 0, response.result)

      if (response.statusCode !== 200) {
        throw new Error(`GET ${endpoint} failed with status ${response.statusCode}`)
      }

      return response.result as T
    } catch (error) {
      core.error(`❌ GET request failed: ${endpoint}`)
      throw error
    }
  }

  /**
   * Make a POST request to Dokploy API
   */
  async post<T, B = unknown>(endpoint: string, body: B = {} as B): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    logApiRequest('POST', url, body)

    try {
      const response = await this.client.postJson<T>(url, body)
      logApiResponse(response.statusCode ?? 0, response.result)

      if (response.statusCode !== 200 && response.statusCode !== 201) {
        const errorMessage =
          (response.result as { message?: string })?.message ||
          (response.result as { error?: string })?.error ||
          'Unknown error'
        throw new Error(
          `POST ${endpoint} failed with status ${response.statusCode}: ${errorMessage}`
        )
      }

      return response.result as T
    } catch (error) {
      core.error(`❌ POST request failed: ${endpoint}`)
      throw error
    }
  }

  // ========================================================================
  // Project Management
  // ========================================================================

  async getAllProjects(): Promise<Project[]> {
    debugLog('Fetching all projects')
    return await this.get<Project[]>('/api/project.all')
  }

  async getProject(projectId: string): Promise<Project> {
    debugLog(`Fetching project: ${projectId}`)
    return await this.get<Project>(`/api/project.one?projectId=${projectId}`)
  }

  async findProjectByName(projectName: string): Promise<Project | undefined> {
    debugLog(`Finding project by name: ${projectName}`)
    const projects = await this.getAllProjects()
    return projects.find(p => p.name === projectName)
  }

  // ========================================================================
  // Environment Management
  // ========================================================================

  async findEnvironmentInProject(
    projectId: string,
    environmentName: string
  ): Promise<Environment | undefined> {
    debugLog(`Finding environment "${environmentName}" in project ${projectId}`)
    const project = await this.getProject(projectId)
    const environments = project.environments || []
    return environments.find(env => env.name === environmentName)
  }

  // ========================================================================
  // Application Management
  // ========================================================================

  async getApplication(applicationId: string): Promise<Application> {
    debugLog(`Fetching application: ${applicationId}`)
    return await this.get<Application>(`/api/application.one?applicationId=${applicationId}`)
  }

  // ========================================================================
  // Docker Provider Configuration
  // ========================================================================

  async saveDockerProvider(
    applicationId: string,
    dockerImage: string,
    registryUrl?: string,
    username?: string,
    password?: string
  ): Promise<void> {
    core.info(`🐳 Configuring Docker provider for application: ${applicationId}`)

    debugLog('Docker provider config', {
      applicationId,
      dockerImage,
      registryUrl,
      username: username ? '[SET]' : '[NOT SET]'
    })

    await this.post('/api/application.saveDockerProvider', {
      applicationId,
      dockerImage,
      registryUrl: registryUrl || '',
      username: username || '',
      password: password || ''
    })
    core.info(`✅ Docker provider configured: ${dockerImage}`)
  }

  // ========================================================================
  // Deployment
  // ========================================================================

  async stopApplication(applicationId: string): Promise<void> {
    core.info(`⏹️ Stopping application: ${applicationId}`)
    await this.post('/api/application.stop', { applicationId })
    core.info(`✅ Application stopped: ${applicationId}`)
  }

  async deployApplication(
    applicationId: string,
    title?: string,
    description?: string
  ): Promise<void> {
    core.info(`🚀 Deploying application: ${applicationId}`)
    debugLog('Deployment params', { applicationId, title, description })

    await this.post('/api/application.deploy', {
      applicationId,
      title,
      description
    })
    // Dokploy queues the job and returns true — the deployment row is created by the worker.
    core.info(`✅ Deployment queued: ${applicationId}`)
  }

  async listApplicationDeployments(applicationId: string): Promise<Deployment[]> {
    debugLog(`Fetching deployments for application: ${applicationId}`)
    const result = await this.get<unknown>(
      `/api/deployment.all?applicationId=${encodeURIComponent(applicationId)}`
    )
    return Array.isArray(result) ? (result as Deployment[]) : []
  }

  async listComposeDeployments(composeId: string): Promise<Deployment[]> {
    debugLog(`Fetching deployments for compose: ${composeId}`)
    const result = await this.get<unknown>(
      `/api/deployment.allByCompose?composeId=${encodeURIComponent(composeId)}`
    )
    return Array.isArray(result) ? (result as Deployment[]) : []
  }

  async waitForServiceDeployment(options: {
    kind: 'application' | 'compose'
    serviceId: string
    previousDeploymentIds?: string[]
    startedAfterMs?: number
    timeoutSeconds?: number
    pollIntervalSeconds?: number
  }): Promise<Deployment> {
    const timeoutSeconds = options.timeoutSeconds ?? 300
    const pollIntervalSeconds = options.pollIntervalSeconds ?? 5
    const previousIds = new Set(options.previousDeploymentIds || [])

    core.info(`⏳ Waiting for deployment to complete (timeout: ${timeoutSeconds}s)`)
    const startTime = Date.now()
    const timeoutMs = timeoutSeconds * 1000
    const pollIntervalMs = pollIntervalSeconds * 1000
    let resolvedId: string | undefined

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const deployments =
        options.kind === 'compose'
          ? await this.listComposeDeployments(options.serviceId)
          : await this.listApplicationDeployments(options.serviceId)

      let current: Deployment | undefined
      if (resolvedId) {
        current = deployments.find(deployment => getDeploymentId(deployment) === resolvedId)
      } else {
        current = deployments.find(deployment => {
          const id = getDeploymentId(deployment)
          if (!id || previousIds.has(id)) {
            return false
          }
          if (options.startedAfterMs) {
            const created = Date.parse(deployment.createdAt || deployment.startedAt || '')
            if (!Number.isNaN(created) && created < options.startedAfterMs - 2000) {
              return false
            }
          }
          return true
        })
        resolvedId = getDeploymentId(current)
        if (resolvedId) {
          core.info(`✅ Deployment ID: ${resolvedId}`)
        }
      }

      if (current) {
        const status = current.status
        if (isDeploymentSuccessful(status)) {
          core.info(`✅ Deployment completed successfully`)
          return current
        }
        if (isDeploymentFailed(status)) {
          const detail = current.errorMessage || current.logs || status
          core.error(`❌ Deployment failed`)
          if (detail) {
            core.error(String(detail))
          }
          throw new Error(`Deployment failed - check logs above for details`)
        }
        core.info(
          `  Status: ${status || 'unknown'} (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`
        )
      } else {
        core.info(
          `  Waiting for deployment record (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`
        )
      }

      if (Date.now() - startTime >= timeoutMs) {
        throw new Error(
          `Deployment timeout after ${timeoutSeconds}s (status: ${current?.status || 'not created yet'})`
        )
      }

      await sleep(pollIntervalMs)
    }
  }

  // ========================================================================
  // Container Operations
  // ========================================================================

  async getContainers(applicationId: string): Promise<Container[]> {
    debugLog(`Fetching containers for application: ${applicationId}`)
    return await this.get<Container[]>(`/api/container.all?applicationId=${applicationId}`)
  }

  async removeContainer(containerName: string): Promise<void> {
    core.info(`🗑️ Removing container: ${containerName}`)
    await this.post('/api/container.remove', { containerName })
    core.info(`✅ Container removed: ${containerName}`)
  }

  // ========================================================================
  // Docker Compose Operations
  // ========================================================================

  /**
   * Get environments for a project
   */
  async getEnvironmentsByProjectId(projectId: string): Promise<Environment[]> {
    debugLog(`Fetching environments for project: ${projectId}`)
    return await this.get<Environment[]>(`/api/environment.byProjectId?projectId=${projectId}`)
  }

  /**
   * Get a specific compose service
   */
  async getCompose(composeId: string): Promise<Compose> {
    debugLog(`Fetching compose service: ${composeId}`)
    return await this.get<Compose>(`/api/compose.one?composeId=${composeId}`)
  }

  /**
   * Find compose service by name in an environment
   */
  async findComposeByName(
    environmentId: string,
    composeName: string
  ): Promise<Compose | undefined> {
    debugLog(`Finding compose service by name: ${composeName} in environment ${environmentId}`)

    // Get the environment with its services
    const environment = await this.get<Environment>(
      `/api/environment.one?environmentId=${environmentId}`
    )

    // Search for compose service with matching name
    if (environment.compose && Array.isArray(environment.compose)) {
      const found = environment.compose.find(c => c.name === composeName)
      if (found) {
        core.info(`Found compose service "${composeName}" in environment`)
        return found
      }
    }

    return undefined
  }

  /**
   * Update compose service configuration
   */
  async updateCompose(composeId: string, config: Record<string, unknown>): Promise<void> {
    core.info(`🔄 Updating compose service: ${composeId}`)
    debugLog('Update configuration', config)

    await this.post('/api/compose.update', { composeId, ...config })
    core.info(`✅ Updated compose service: ${composeId}`)
  }

  /**
   * Deploy a compose service
   */
  async deployCompose(composeId: string, title?: string, description?: string): Promise<void> {
    core.info(`🚀 Deploying compose service: ${composeId}`)
    debugLog('Deployment config', { composeId, title, description })

    await this.post('/api/compose.deploy', {
      composeId,
      title: title || 'Automated compose deployment',
      description: description || 'Deployed via GitHub Actions'
    })

    core.info(`✅ Deployment queued`)
  }

  /**
   * Save compose file content.
   * Uses compose.update to set composeFile.
   */
  async saveComposeFile(composeId: string, composeFile: string): Promise<void> {
    core.info(`📝 Saving compose configuration for service: ${composeId}`)
    const lineCount = composeFile ? composeFile.split('\n').length : 0

    debugLog(`Saving compose file (${lineCount} lines)`)

    const updateData: Record<string, unknown> = {
      composeId,
      composeFile,
      sourceType: 'raw' // Using raw compose file content
    }

    await this.post('/api/compose.update', updateData)
    core.info(`✅ Compose configuration saved (${lineCount} lines)`)
  }
}
