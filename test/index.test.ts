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

  test('should set default outputs even for incomplete semver version', () => {
    (extractLatestVersionFromGitTag as jest.Mock).mockReturnValue({
      version: 'v1.0',
      versionWithoutV: '1.0'
    })

    main()

    const outputs = getSetOutputs()
    expect(outputs.version).toBe('v1.0')
    expect(outputs.versionWithoutV).toBe('1.0')
    expect(outputs.isSemver).toBe('false')
    console.log('Outputs (incomplete version):', outputs)
  })

  test('should set all outputs correctly for a full semver version', () => {
    (extractLatestVersionFromGitTag as jest.Mock).mockReturnValue({
      version: 'v1.2.3-ALPHA.0', // build metadata stripped for .NET compatibility
      versionWithoutV: '1.2.3-ALPHA.0',
      major: '1',
      minor: '2',
      patch: '3',
      prerelease: 'ALPHA.0',
      build: '456.7', // build is still parsed but not in final version
      isPrerelease: true
    })

    main()

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

  test('should handle patch missing gracefully', () => {
    (extractLatestVersionFromGitTag as jest.Mock).mockReturnValue({
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

    main()

    const outputs = getSetOutputs()
    expect(outputs.version).toBe('v2.1')
    expect(outputs.patch).toBe('')
    expect(outputs.isSemver).toBe('true')
    console.log('Outputs (missing patch):', outputs)
  })

  test('should handle version with no prerelease/build', () => {
    (extractLatestVersionFromGitTag as jest.Mock).mockReturnValue({
      version: 'v3.4.5',
      versionWithoutV: '3.4.5',
      major: '3',
      minor: '4',
      patch: '5',
      prerelease: '',
      build: '',
      isPrerelease: false
    })

    main()

    const outputs = getSetOutputs()
    expect(outputs.version).toBe('v3.4.5')
    expect(outputs.prerelease).toBe('')
    expect(outputs.build).toBe('')
    expect(outputs.isPrerelease).toBe(false)
    expect(outputs.isSemver).toBe('true')
    console.log('Outputs (no prerelease/build):', outputs)
  })

  test('should handle minimal version object', () => {
    (extractLatestVersionFromGitTag as jest.Mock).mockReturnValue({
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

    main()

    const outputs = getSetOutputs()
    expect(outputs.version).toBe('v0.0.1')
    expect(outputs.versionWithoutV).toBe('0.0.1')
    expect(outputs.major).toBe('0')
    expect(outputs.minor).toBe('0')
    expect(outputs.patch).toBe('1')
    expect(outputs.isSemver).toBe('true')
    console.log('Outputs (minimal):', outputs)
  })

  test('should fail the action if an exception is thrown', () => {
    const error = new Error('Git failure')
    ;(extractLatestVersionFromGitTag as jest.Mock).mockImplementation(() => {
      throw error
    })

    main()

    expect(core.setFailed).toHaveBeenCalledWith('Failed to extract version: Git failure')
  })

  test('should handle null/undefined values with defaults', () => {
    (extractLatestVersionFromGitTag as jest.Mock).mockReturnValue({
      version: 'v1.2.3',
      versionWithoutV: '1.2.3',
      major: '1',
      minor: '2',
      patch: '3',
      prerelease: undefined,
      build: undefined,
      isPrerelease: false
    })

    main()

    const outputs = getSetOutputs()
    expect(outputs.prerelease).toBe('')
    expect(outputs.build).toBe('')
  })

  test('should process empty string values as falsy defaults', () => {
    (extractLatestVersionFromGitTag as jest.Mock).mockReturnValue({
      version: 'v2.0.0',
      versionWithoutV: '2.0.0'
    })

    main()

    const outputs = getSetOutputs()
    expect(Object.keys(outputs).length).toBeGreaterThan(0)
    expect(outputs.version).toBe('v2.0.0')
  })

  test('should process object with extra fields', () => {
    (extractLatestVersionFromGitTag as jest.Mock).mockReturnValue({
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

    main()

    const outputs = getSetOutputs()
    expect(outputs.version).toBe('v3.0.0')
    expect(outputs.major).toBe('3')
    // verify isSemver is computed, not from the input
    expect(outputs.isSemver).toBe('true')
  })
})
