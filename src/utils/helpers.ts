/**
 * Utility functions for parsing and validating inputs
 */

import * as core from '@actions/core'

export function parseIntInput(value: string | undefined, name: string): number | undefined {
  if (!value || value === '') {
    return undefined
  }
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) {
    throw new Error(`${name} must be a valid number, got: ${value}`)
  }
  return parsed
}

export function parseBooleanInput(value: string | undefined): boolean | undefined {
  if (!value || value === '') {
    return undefined
  }
  const lower = value.toLowerCase()
  if (lower === 'true') return true
  if (lower === 'false') return false
  throw new Error(`Expected 'true' or 'false', got: ${value}`)
}

export function parseOptionalStringInput(key: string): string | undefined {
  const value = core.getInput(key, { required: false })
  return value && value.trim() !== '' ? value.trim() : undefined
}

export interface ParsedDokployUrl {
  baseUrl: string
  basicAuthHeader?: string
}

/**
 * Split optional HTTP Basic credentials from dokploy-url.
 * @actions/http-client ignores URL userinfo, so we convert it to an Authorization header.
 */
export function parseDokployUrl(url: string): ParsedDokployUrl {
  const parsed = new URL(url)
  const username = decodeURIComponent(parsed.username)
  const password = decodeURIComponent(parsed.password)

  parsed.username = ''
  parsed.password = ''
  const baseUrl = parsed.toString().replace(/\/$/, '')

  if (!username && !password) {
    return { baseUrl }
  }

  return {
    baseUrl,
    basicAuthHeader: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
  }
}

export function getDeploymentId(deployment: unknown): string | undefined {
  if (!deployment || typeof deployment !== 'object') {
    return undefined
  }

  const record = deployment as { deploymentId?: unknown; id?: unknown }
  if (typeof record.deploymentId === 'string' && record.deploymentId.length > 0) {
    return record.deploymentId
  }
  if (typeof record.id === 'string' && record.id.length > 0) {
    return record.id
  }
  return undefined
}

export function isDeploymentSuccessful(status?: string): boolean {
  return status === 'done' || status === 'completed'
}

export function isDeploymentFailed(status?: string): boolean {
  return status === 'error' || status === 'failed'
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function debugLog(message: string, data?: unknown): void {
  const debugMode = parseBooleanInput(core.getInput('debug-mode', { required: false }))
  if (debugMode) {
    core.info(`🐛 DEBUG: ${message}`)
    if (data) {
      core.info(`🐛 DEBUG DATA: ${JSON.stringify(data, null, 2)}`)
    }
  }
}

export function logApiRequest(method: string, url: string, body?: unknown): void {
  const logRequests = parseBooleanInput(core.getInput('log-api-requests', { required: false }))
  if (logRequests) {
    core.info(`📤 API REQUEST: ${method} ${url}`)
    if (body) {
      // Sanitize sensitive data
      const sanitized = JSON.stringify(
        body,
        (key, value) => {
          if (
            key.toLowerCase().includes('password') ||
            key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('key') ||
            key.toLowerCase().includes('secret')
          ) {
            return '[REDACTED]'
          }
          return value
        },
        2
      )
      core.info(`📤 REQUEST BODY: ${sanitized}`)
    }
  }
}

export function logApiResponse(status: number, response?: unknown): void {
  const logResponses = parseBooleanInput(core.getInput('log-api-responses', { required: false }))
  if (logResponses) {
    core.info(`📥 API RESPONSE: HTTP ${status}`)
    if (response) {
      core.info(`📥 RESPONSE BODY: ${JSON.stringify(response, null, 2)}`)
    }
  }
}

export function sanitizeSecret(value: string): void {
  if (value && value.trim() !== '') {
    core.setSecret(value)
  }
}
