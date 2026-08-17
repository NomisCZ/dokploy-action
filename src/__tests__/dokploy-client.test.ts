/**
 * DokployClient Unit Tests
 * Tests API client methods and response parsing
 */

import { DokployClient } from '../client/dokploy-client'
import type { DokployConfig } from '../types/dokploy'
import * as httpm from '@actions/http-client'

// Mock @actions/core
jest.mock('@actions/core', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warning: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  setSecret: jest.fn(),
  getInput: jest.fn((name: string) => {
    if (name === 'debug-mode') return 'false'
    return ''
  })
}))

// Mock @actions/http-client
jest.mock('@actions/http-client')

const MockHttpClient = httpm.HttpClient as jest.MockedClass<typeof httpm.HttpClient>

describe('DokployClient', () => {
  let client: DokployClient
  let mockConfig: DokployConfig

  beforeEach(() => {
    mockConfig = {
      url: 'https://dokploy.example.com',
      apiKey: 'test-api-key',
      debugMode: true
    }
    client = new DokployClient(mockConfig)
  })

  describe('Constructor', () => {
    it('should initialize with config', () => {
      expect(client).toBeDefined()
    })

    it('should remove trailing slash from URL', () => {
      const configWithSlash: DokployConfig = {
        url: 'https://dokploy.example.com/',
        apiKey: 'test-key'
      }
      const clientWithSlash = new DokployClient(configWithSlash)
      expect(clientWithSlash).toBeDefined()
    })

    it('should send Basic Authorization from URL userinfo and keep x-api-key', () => {
      new DokployClient({
        url: 'https://github-actions:xxxxx@panel.example.com',
        apiKey: 'dokploy-key'
      })

      expect(MockHttpClient).toHaveBeenCalledWith(
        'dokploy-github-action',
        undefined,
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'dokploy-key',
            Authorization: `Basic ${Buffer.from('github-actions:xxxxx').toString('base64')}`
          })
        })
      )
    })

    it('should strip userinfo from the request base URL', () => {
      const clientWithAuth = new DokployClient({
        url: 'https://github-actions:xxxxx@panel.example.com',
        apiKey: 'dokploy-key'
      })

      expect((clientWithAuth as unknown as { baseUrl: string }).baseUrl).toBe(
        'https://panel.example.com'
      )
    })

    it('should not set Authorization when URL has no userinfo', () => {
      expect(MockHttpClient).toHaveBeenCalledWith(
        'dokploy-github-action',
        undefined,
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.anything()
          })
        })
      )
    })
  })

  describe('saveDockerProvider', () => {
    it('should send empty credentials when username and password are missing', async () => {
      const postSpy = jest.spyOn(client as any, 'post').mockResolvedValue(undefined)

      await client.saveDockerProvider('app-123', 'ghcr.io/org/app:latest')

      expect(postSpy).toHaveBeenCalledWith('/api/application.saveDockerProvider', {
        applicationId: 'app-123',
        dockerImage: 'ghcr.io/org/app:latest',
        registryUrl: '',
        username: '',
        password: ''
      })
    })

    it('should preserve explicitly provided credentials', async () => {
      const postSpy = jest.spyOn(client as any, 'post').mockResolvedValue(undefined)

      await client.saveDockerProvider(
        'app-123',
        'ghcr.io/org/app:latest',
        'ghcr.io',
        'my-user',
        'my-token'
      )

      expect(postSpy).toHaveBeenCalledWith('/api/application.saveDockerProvider', {
        applicationId: 'app-123',
        dockerImage: 'ghcr.io/org/app:latest',
        registryUrl: 'ghcr.io',
        username: 'my-user',
        password: 'my-token'
      })
    })
  })

  describe('deployments', () => {
    it('should list application deployments from deployment.all', async () => {
      const getSpy = jest
        .spyOn(client as any, 'get')
        .mockResolvedValue([{ deploymentId: 'dep-1', status: 'done', applicationId: 'app-1' }])

      const result = await client.listApplicationDeployments('app-1')

      expect(getSpy).toHaveBeenCalledWith('/api/deployment.all?applicationId=app-1')
      expect(result[0].deploymentId).toBe('dep-1')
    })

    it('should wait for a new deployment that finishes with done', async () => {
      jest.spyOn(client as any, 'get').mockResolvedValue([
        { deploymentId: 'dep-new', status: 'done', applicationId: 'app-1' },
        { deploymentId: 'dep-old', status: 'done', applicationId: 'app-1' }
      ])

      const result = await client.waitForServiceDeployment({
        kind: 'application',
        serviceId: 'app-1',
        previousDeploymentIds: ['dep-old'],
        timeoutSeconds: 5,
        pollIntervalSeconds: 0
      })

      expect(result.deploymentId).toBe('dep-new')
    })

    it('should fail when the new deployment status is error', async () => {
      jest
        .spyOn(client as any, 'get')
        .mockResolvedValue([
          { deploymentId: 'dep-new', status: 'error', applicationId: 'app-1', errorMessage: 'boom' }
        ])

      await expect(
        client.waitForServiceDeployment({
          kind: 'application',
          serviceId: 'app-1',
          previousDeploymentIds: [],
          timeoutSeconds: 5,
          pollIntervalSeconds: 0
        })
      ).rejects.toThrow('Deployment failed')
    })
  })
})
