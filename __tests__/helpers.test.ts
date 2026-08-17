/**
 * Tests for utility helper functions
 */

import {
  parseIntInput,
  parseBooleanInput,
  parseDokployUrl,
  getDeploymentId,
  isDeploymentSuccessful,
  isDeploymentFailed,
  sleep
} from '../src/utils/helpers'

describe('Utility Helpers', () => {
  describe('parseIntInput', () => {
    it('should parse valid integer', () => {
      expect(parseIntInput('123', 'test')).toBe(123)
    })

    it('should return undefined for empty string', () => {
      expect(parseIntInput('', 'test')).toBeUndefined()
    })

    it('should return undefined for undefined', () => {
      expect(parseIntInput(undefined, 'test')).toBeUndefined()
    })

    it('should throw error for invalid number', () => {
      expect(() => parseIntInput('abc', 'test')).toThrow('test must be a valid number')
    })
  })

  describe('parseBooleanInput', () => {
    it('should parse "true" as true', () => {
      expect(parseBooleanInput('true')).toBe(true)
    })

    it('should parse "false" as false', () => {
      expect(parseBooleanInput('false')).toBe(false)
    })

    it('should be case insensitive', () => {
      expect(parseBooleanInput('TRUE')).toBe(true)
      expect(parseBooleanInput('FALSE')).toBe(false)
    })

    it('should return undefined for empty string', () => {
      expect(parseBooleanInput('')).toBeUndefined()
    })

    it('should throw error for invalid boolean', () => {
      expect(() => parseBooleanInput('yes')).toThrow("Expected 'true' or 'false'")
    })
  })

  describe('sleep', () => {
    it('should return a promise', () => {
      const result = sleep(100)
      expect(result).toBeInstanceOf(Promise)
    })
  })

  describe('parseDokployUrl', () => {
    it('should keep origin URL without credentials', () => {
      expect(parseDokployUrl('https://panel.example.com')).toEqual({
        baseUrl: 'https://panel.example.com'
      })
    })

    it('should strip trailing slash', () => {
      expect(parseDokployUrl('https://panel.example.com/').baseUrl).toBe(
        'https://panel.example.com'
      )
    })

    it('should extract Basic Authorization from userinfo', () => {
      const result = parseDokployUrl('https://github-actions:xxxxx@panel.example.com')

      expect(result.baseUrl).toBe('https://panel.example.com')
      expect(result.basicAuthHeader).toBe(
        `Basic ${Buffer.from('github-actions:xxxxx').toString('base64')}`
      )
    })

    it('should decode percent-encoded credentials', () => {
      const result = parseDokployUrl('https://user:p%40ss%3Aword@panel.example.com')

      expect(result.basicAuthHeader).toBe(
        `Basic ${Buffer.from('user:p@ss:word').toString('base64')}`
      )
    })
  })

  describe('deployment helpers', () => {
    it('should read Dokploy deploymentId', () => {
      expect(getDeploymentId({ deploymentId: 'dep-1', applicationId: 'app' })).toBe('dep-1')
    })

    it('should ignore non-object deploy responses like true', () => {
      expect(getDeploymentId(true as never)).toBeUndefined()
      expect(getDeploymentId(null)).toBeUndefined()
    })

    it('should treat Dokploy done as success and error as failure', () => {
      expect(isDeploymentSuccessful('done')).toBe(true)
      expect(isDeploymentSuccessful('completed')).toBe(true)
      expect(isDeploymentFailed('error')).toBe(true)
      expect(isDeploymentFailed('failed')).toBe(true)
      expect(isDeploymentSuccessful('running')).toBe(false)
    })
  })
})
