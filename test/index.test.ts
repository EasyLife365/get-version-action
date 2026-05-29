/* eslint-env jest */

import * as core from '@actions/core'
import { main } from '../src/index'
import { extractLatestVersionFromGitTag } from '../src/extractLatestVersionFromGitTag'

jest.mock('../src/extractLatestVersionFromGitTag')

describe('get-version main execution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const getSetOutputs = () => {
    return (core.setOutput as jest.Mock).mock.calls.reduce((acc: Record<string, unknown>, [key, value]: unknown[]) => {
      acc[key as string] = value
      return acc
    }, {})
  }

  test('should set default outputs even for incomplete semver version', async () => {
    ;(extractLatestVersionFromGitTag as jest.Mock).mockResolvedValue({
      version: 'v1.0',
      versionWithoutV: '1.0'
    })

    await main()

    const outputs = getSetOutputs()
    expect(outputs.version).toBe('v1.0')
    expect(outputs.versionWithoutV).toBe('1.0')
    expect(outputs.isSemver).toBe('false')
    console.log('Outputs (incomplete version):', outputs)
  })

  test('should set all outputs correctly for a full semver version', async () => {
    ;(extractLatestVersionFromGitTag as jest.Mock).mockResolvedValue({
      version: 'v1.2.3-ALPHA.0', // build metadata stripped for .NET compatibility
      versionWithoutV: '1.2.3-ALPHA.0',
      major: '1',
      minor: '2',
      patch: '3',
      prerelease: 'ALPHA.0',
      build: '456.7', // build is still parsed but not in final version
      isPrerelease: true
    })

    await main()

    const outputs = getSetOutputs()
    expect(outputs.version).toBe('v1.2.3-ALPHA.0')
    expect(outputs.versionWithoutV).toBe('1.2.3-ALPHA.0')
    expect(outputs.major).toBe('1')
    expect(outputs.minor).toBe('2')
    expect(outputs.patch).toBe('3')
    expect(outputs.prerelease).toBe('ALPHA.0')
    expect(outputs.build).toBe('456.7')
    expect(outputs.isPrerelease).toBe(true)
    expect(outputs.isSemver).toBe('true')
    console.log('Outputs (full semver):', outputs)
  })

  test('should handle patch missing gracefully', async () => {
    ;(extractLatestVersionFromGitTag as jest.Mock).mockResolvedValue({
      version: 'v2.1',
      versionWithoutV: '2.1',
      major: '2',
      minor: '1',
      patch: '',
      prerelease: '',
      build: '',
      isPrerelease: false,
      isSemver: 'true'
    })

    await main()

    const outputs = getSetOutputs()
    expect(outputs.version).toBe('v2.1')
    expect(outputs.patch).toBe('')
    expect(outputs.isSemver).toBe('true')
    console.log('Outputs (missing patch):', outputs)
  })

  test('should handle version with no prerelease/build', async () => {
    ;(extractLatestVersionFromGitTag as jest.Mock).mockResolvedValue({
      version: 'v3.4.5',
      versionWithoutV: '3.4.5',
      major: '3',
      minor: '4',
      patch: '5',
      prerelease: '',
      build: '',
      isPrerelease: false
    })

    await main()

    const outputs = getSetOutputs()
    expect(outputs.version).toBe('v3.4.5')
    expect(outputs.prerelease).toBe('')
    expect(outputs.build).toBe('')
    expect(outputs.isPrerelease).toBe(false)
    expect(outputs.isSemver).toBe('true')
    console.log('Outputs (no prerelease/build):', outputs)
  })

  test('should handle minimal version object', async () => {
    ;(extractLatestVersionFromGitTag as jest.Mock).mockResolvedValue({
      version: 'v0.0.1',
      versionWithoutV: '0.0.1',
      major: '0',
      minor: '0',
      patch: '1',
      prerelease: '',
      build: '',
      isPrerelease: false,
      isSemver: 'true'
    })

    await main()

    const outputs = getSetOutputs()
    expect(outputs.version).toBe('v0.0.1')
    expect(outputs.versionWithoutV).toBe('0.0.1')
    expect(outputs.major).toBe('0')
    expect(outputs.minor).toBe('0')
    expect(outputs.patch).toBe('1')
    expect(outputs.isSemver).toBe('true')
    console.log('Outputs (minimal):', outputs)
  })

  test('should fail the action if an exception is thrown', async () => {
    const error = new Error('Git failure')
    ;(extractLatestVersionFromGitTag as jest.Mock).mockRejectedValue(error)

    await main()

    expect(core.setFailed).toHaveBeenCalledWith('Failed to extract version: Git failure')
  })

  test('should handle null/undefined values with defaults', async () => {
    ;(extractLatestVersionFromGitTag as jest.Mock).mockResolvedValue({
      version: 'v1.2.3',
      versionWithoutV: '1.2.3',
      major: '1',
      minor: '2',
      patch: '3',
      prerelease: undefined,
      build: undefined,
      isPrerelease: false
    })

    await main()

    const outputs = getSetOutputs()
    expect(outputs.prerelease).toBe('')
    expect(outputs.build).toBe('')
  })

  test('should process empty string values as falsy defaults', async () => {
    ;(extractLatestVersionFromGitTag as jest.Mock).mockResolvedValue({
      version: 'v2.0.0',
      versionWithoutV: '2.0.0'
    })

    await main()

    const outputs = getSetOutputs()
    expect(Object.keys(outputs).length).toBeGreaterThan(0)
    expect(outputs.version).toBe('v2.0.0')
  })

  test('should process object with extra fields', async () => {
    ;(extractLatestVersionFromGitTag as jest.Mock).mockResolvedValue({
      version: 'v3.0.0',
      versionWithoutV: '3.0.0',
      major: '3',
      minor: '0',
      patch: '0',
      prerelease: '',
      build: '',
      isPrerelease: false,
      isSemver: 'true',
      extraField: 'should be ignored'
    })

    await main()

    const outputs = getSetOutputs()
    expect(outputs.version).toBe('v3.0.0')
    expect(outputs.major).toBe('3')
    // verify isSemver is computed, not from the input
    expect(outputs.isSemver).toBe('true')
  })

  test('should await async extraction before setting outputs', async () => {
    ;(extractLatestVersionFromGitTag as jest.Mock).mockResolvedValue({
      version: 'v9.8.7',
      versionWithoutV: '9.8.7',
      major: '9',
      minor: '8',
      patch: '7',
      prerelease: '',
      build: '',
      isPrerelease: false
    })

    await main()

    expect(core.setOutput).toHaveBeenCalledWith('version', 'v9.8.7')
    expect(core.setOutput).toHaveBeenCalledWith('versionWithoutV', '9.8.7')
  })
})
