/**
 * Tests for main action entry point
 */

import * as core from '@actions/core'
import { run } from '../src/index'
import { DokployClient } from '../src/client/dokploy-client'
import { parseInputs } from '../src/inputs'
import { performHealthCheck } from '../src/health-check'

// Mock all dependencies
jest.mock('@actions/core')
jest.mock('../src/client/dokploy-client')
jest.mock('../src/inputs')
jest.mock('../src/health-check')

describe('run', () => {
  const mockSetFailed = core.setFailed as jest.MockedFunction<typeof core.setFailed>
  const mockSetOutput = core.setOutput as jest.MockedFunction<typeof core.setOutput>
  const mockStartGroup = core.startGroup as jest.MockedFunction<typeof core.startGroup>
  const mockEndGroup = core.endGroup as jest.MockedFunction<typeof core.endGroup>

  const mockParseInputs = parseInputs as jest.MockedFunction<typeof parseInputs>
  const mockPerformHealthCheck = performHealthCheck as jest.MockedFunction<
    typeof performHealthCheck
  >

  const mockInputs = {
    dokployUrl: 'https://dokploy.example.com',
    apiKey: 'test-key',
    dockerImage: 'nginx:latest',
    projectId: 'proj-123',
    environmentId: 'env-456',
    applicationId: 'app-789',
    healthCheckEnabled: false,
    waitForDeployment: false,
    cleanupOldContainers: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockParseInputs.mockReturnValue(mockInputs as any)
    mockPerformHealthCheck.mockResolvedValue('healthy')
  })

  it('should complete deployment successfully with all IDs provided', async () => {
    const mockClient = {
      saveDockerProvider: jest.fn().mockResolvedValue(undefined),
      listApplicationDeployments: jest.fn().mockResolvedValue([]),
      deployApplication: jest.fn().mockResolvedValue(undefined)
    }

    ;(DokployClient as jest.Mock).mockImplementation(() => mockClient)

    await run()

    expect(mockSetOutput).toHaveBeenCalledWith('application-id', 'app-789')
    expect(mockSetOutput).toHaveBeenCalledWith('deployment-status', 'success')
    expect(mockSetFailed).not.toHaveBeenCalled()
    expect(mockClient.saveDockerProvider).toHaveBeenCalled()
    expect(mockClient.deployApplication).toHaveBeenCalled()
  })

  it('should handle errors gracefully', async () => {
    const mockClient = {
      saveDockerProvider: jest.fn().mockRejectedValue(new Error('API Error'))
    }

    ;(DokployClient as jest.Mock).mockImplementation(() => mockClient)

    await expect(run()).rejects.toThrow('API Error')
    expect(mockSetFailed).toHaveBeenCalledWith(expect.stringContaining('API Error'))
  })

  it('should look up project by name and fail if missing', async () => {
    const inputs = {
      ...mockInputs,
      applicationId: undefined,
      projectId: undefined,
      projectName: 'missing-project',
      applicationName: 'my-app'
    }
    mockParseInputs.mockReturnValue(inputs as any)

    const mockClient = {
      findProjectByName: jest.fn().mockResolvedValue(null)
    }

    ;(DokployClient as jest.Mock).mockImplementation(() => mockClient)

    await expect(run()).rejects.toThrow('Create it in Dokploy Admin first')
  })

  it('should use groups for logging', async () => {
    const mockClient = {
      saveDockerProvider: jest.fn().mockResolvedValue(undefined),
      listApplicationDeployments: jest.fn().mockResolvedValue([]),
      deployApplication: jest.fn().mockResolvedValue(undefined)
    }

    ;(DokployClient as jest.Mock).mockImplementation(() => mockClient)

    await run()

    expect(mockStartGroup).toHaveBeenCalledWith(
      expect.stringContaining('Parsing and Validating Inputs')
    )
    expect(mockStartGroup).toHaveBeenCalledWith(expect.stringContaining('Connecting to Dokploy'))
    expect(mockEndGroup).toHaveBeenCalled()
  })
})
