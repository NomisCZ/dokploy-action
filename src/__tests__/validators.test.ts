/**
 * Tests for input validators
 */

import {
  validateDnsName,
  validatePort,
  validateDockerImage,
  validateAllInputs,
  ValidationError
} from '../validators'

describe('validators', () => {
  describe('validateDnsName', () => {
    it('should accept valid DNS names', () => {
      expect(() => validateDnsName('app', 'application-name')).not.toThrow()
      expect(() => validateDnsName('my-app', 'application-name')).not.toThrow()
      expect(() => validateDnsName('app123', 'application-name')).not.toThrow()
      expect(() => validateDnsName('a', 'application-name')).not.toThrow()
    })

    it('should reject invalid DNS names', () => {
      expect(() => validateDnsName('App', 'application-name')).toThrow(ValidationError) // uppercase
      expect(() => validateDnsName('-app', 'application-name')).toThrow(ValidationError) // starts with hyphen
      expect(() => validateDnsName('app-', 'application-name')).toThrow(ValidationError) // ends with hyphen
      expect(() => validateDnsName('app_name', 'application-name')).toThrow(ValidationError) // underscore
      expect(() => validateDnsName('app.name', 'application-name')).toThrow(ValidationError) // dot
    })

    it('should reject names longer than 63 characters', () => {
      const longName = 'a'.repeat(64)
      expect(() => validateDnsName(longName, 'application-name')).toThrow(ValidationError)
    })

    it('should accept undefined (optional)', () => {
      expect(() => validateDnsName(undefined, 'application-name')).not.toThrow()
    })
  })

  describe('validatePort', () => {
    it('should accept valid ports', () => {
      expect(() => validatePort(80, 'port')).not.toThrow()
      expect(() => validatePort(443, 'port')).not.toThrow()
      expect(() => validatePort(3000, 'port')).not.toThrow()
      expect(() => validatePort(8080, 'port')).not.toThrow()
    })

    it('should reject invalid ports', () => {
      expect(() => validatePort(0, 'port')).toThrow(ValidationError)
      expect(() => validatePort(-1, 'port')).toThrow(ValidationError)
      expect(() => validatePort(65536, 'port')).toThrow(ValidationError)
      expect(() => validatePort(100000, 'port')).toThrow(ValidationError)
    })

    it('should accept undefined (optional)', () => {
      expect(() => validatePort(undefined, 'port')).not.toThrow()
    })
  })

  describe('validateDockerImage', () => {
    it('should accept valid Docker images', () => {
      expect(() => validateDockerImage('nginx:latest', 'docker-image')).not.toThrow()
      expect(() => validateDockerImage('ghcr.io/user/app:v1.0.0', 'docker-image')).not.toThrow()
      expect(() => validateDockerImage('registry.io/org/repo:tag', 'docker-image')).not.toThrow()
    })

    it('should reject invalid Docker images', () => {
      expect(() => validateDockerImage('', 'docker-image')).toThrow(ValidationError)
      expect(() => validateDockerImage(undefined, 'docker-image')).toThrow(ValidationError)
      expect(() => validateDockerImage('invalid', 'docker-image')).toThrow(ValidationError)
      expect(() => validateDockerImage('no-tag-here', 'docker-image')).toThrow(ValidationError)
    })
  })

  describe('validateAllInputs', () => {
    it('should validate all inputs successfully', () => {
      const validInputs = {
        dockerImage: 'nginx:latest',
        applicationName: 'my-app',
        projectName: 'my-project',
        environmentName: 'production'
      }

      expect(() => validateAllInputs(validInputs)).not.toThrow()
    })

    it('should collect multiple validation errors', () => {
      const invalidInputs = {
        dockerImage: 'invalid',
        applicationName: 'Invalid_Name'
      }

      expect(() => validateAllInputs(invalidInputs)).toThrow()
    })

    it('should accept minimal valid inputs', () => {
      const minimalInputs = {
        dockerImage: 'nginx:latest'
      }

      expect(() => validateAllInputs(minimalInputs)).not.toThrow()
    })
  })
})
