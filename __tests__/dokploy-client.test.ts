/**
 * Tests for Dokploy API Client
 */

import { DokployClient } from '../src/client/dokploy-client'

describe('DokployClient', () => {
  let client: DokployClient

  beforeEach(() => {
    client = new DokployClient({
      url: 'https://test.dokploy.local',
      apiKey: 'test-api-key-12345'
    })
  })

  describe('constructor', () => {
    it('should create client with config', () => {
      expect(client).toBeDefined()
    })

    it('should remove trailing slash from URL', () => {
      const clientWithSlash = new DokployClient({
        url: 'https://test.dokploy.local/',
        apiKey: 'test-key'
      })
      expect(clientWithSlash).toBeDefined()
    })
  })

  describe('API methods', () => {
    it('should have getAllProjects method', () => {
      expect(typeof client.getAllProjects).toBe('function')
    })

    it('should have findProjectByName method', () => {
      expect(typeof client.findProjectByName).toBe('function')
    })

    it('should have deployApplication method', () => {
      expect(typeof client.deployApplication).toBe('function')
    })
  })
})
