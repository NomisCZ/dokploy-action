/**
 * Tests for input parsing
 */

import * as core from '@actions/core'
import { parseInputs } from '../src/inputs'

// Mock @actions/core
jest.mock('@actions/core')

describe('parseInputs', () => {
  const mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>
  const mockSetSecret = core.setSecret as jest.MockedFunction<typeof core.setSecret>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should parse required inputs', () => {
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'dokploy-url': 'https://dokploy.example.com',
        'api-key': 'test-api-key',
        'docker-image': 'nginx:latest'
      }
      return inputs[name] || ''
    })

    const result = parseInputs()

    expect(result.dokployUrl).toBe('https://dokploy.example.com')
    expect(result.apiKey).toBe('test-api-key')
    expect(result.dockerImage).toBe('nginx:latest')
    expect(mockSetSecret).toHaveBeenCalledWith('test-api-key')
  })

  it('should parse optional string inputs', () => {
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'dokploy-url': 'https://dokploy.example.com',
        'api-key': 'test-api-key',
        'docker-image': 'nginx:latest',
        'project-name': 'my-project',
        'application-name': 'my-app'
      }
      return inputs[name] || ''
    })

    const result = parseInputs()

    expect(result.projectName).toBe('my-project')
    expect(result.applicationName).toBe('my-app')
  })

  it('should parse boolean inputs', () => {
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'dokploy-url': 'https://dokploy.example.com',
        'api-key': 'test-api-key',
        'docker-image': 'nginx:latest',
        'debug-mode': 'false',
        'wait-for-completion': 'true'
      }
      return inputs[name] || ''
    })

    const result = parseInputs()

    expect(result.debugMode).toBe(false)
    expect(result.waitForDeployment).toBe(true)
  })

  it('should parse integer inputs', () => {
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'dokploy-url': 'https://dokploy.example.com',
        'api-key': 'test-api-key',
        'docker-image': 'nginx:latest',
        timeout: '45'
      }
      return inputs[name] || ''
    })

    const result = parseInputs()

    expect(result.deploymentTimeout).toBe(45)
  })

  it('should use default values for optional inputs', () => {
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'dokploy-url': 'https://dokploy.example.com',
        'api-key': 'test-api-key',
        'docker-image': 'nginx:latest'
      }
      return inputs[name] || ''
    })

    const result = parseInputs()

    expect(result.environmentName).toBe('production')
    expect(result.registryUrl).toBeUndefined()
    expect(result.waitForDeployment).toBe(true)
    expect(result.healthCheckEnabled).toBe(true)
  })

  it('should mask sensitive inputs', () => {
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'dokploy-url': 'https://dokploy.example.com',
        'api-key': 'secret-api-key',
        'docker-image': 'nginx:latest',
        'registry-password': 'secret-password'
      }
      return inputs[name] || ''
    })

    parseInputs()

    expect(mockSetSecret).toHaveBeenCalledWith('secret-api-key')
    expect(mockSetSecret).toHaveBeenCalledWith('secret-password')
  })

  it('should mask Basic Auth credentials from dokploy-url', () => {
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'dokploy-url': 'https://github-actions:proxy-secret@panel.example.com',
        'api-key': 'test-api-key',
        'docker-image': 'nginx:latest'
      }
      return inputs[name] || ''
    })

    parseInputs()

    expect(mockSetSecret).toHaveBeenCalledWith('github-actions')
    expect(mockSetSecret).toHaveBeenCalledWith('proxy-secret')
  })
})
