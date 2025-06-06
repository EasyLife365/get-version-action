/* eslint-env jest */

const core = require('@actions/core')
const main = require('../src/index')
const { extractLatestVersionFromGitTag } = require('../src/extractLatestVersionFromGitTag')

jest.mock('@actions/core')
jest.mock('../src/extractLatestVersionFromGitTag')

describe('get-version main execution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should set default outputs even for incomplete semver version', () => {
    // Given
    extractLatestVersionFromGitTag.mockReturnValue({
      version: 'v1.0',
      versionWithoutV: '1.0'
      // No major/minor/patch
    })

    // When
    main()

    // Then
    expect(core.setOutput).toHaveBeenCalledWith('version', 'v1.0')
    expect(core.setOutput).toHaveBeenCalledWith('version-without-v', '1.0')
    expect(core.setOutput).toHaveBeenCalledWith('is-semver', 'false')
  })

  test('should set all outputs correctly for a full semver version', () => {
    // Given
    extractLatestVersionFromGitTag.mockReturnValue({
      version: 'v1.2.3-ALPHA.0+456.7',
      versionWithoutV: '1.2.3-ALPHA.0+456.7',
      major: '1',
      minor: '2',
      patch: '3',
      prerelease: 'ALPHA.0',
      build: '456.7',
      isPrerelease: true
    })

    // When
    main()

    // Then
    expect(core.setOutput).toHaveBeenCalledWith('version', 'v1.2.3-ALPHA.0+456.7')
    expect(core.setOutput).toHaveBeenCalledWith('version-without-v', '1.2.3-ALPHA.0+456.7')
    expect(core.setOutput).toHaveBeenCalledWith('major', '1')
    expect(core.setOutput).toHaveBeenCalledWith('minor', '2')
    expect(core.setOutput).toHaveBeenCalledWith('patch', '3')
    expect(core.setOutput).toHaveBeenCalledWith('prerelease', 'ALPHA.0')
    expect(core.setOutput).toHaveBeenCalledWith('build', '456.7')
    expect(core.setOutput).toHaveBeenCalledWith('is-prerelease', true)
    expect(core.setOutput).toHaveBeenCalledWith('is-semver', 'true')
  })

  test('should fail the action if an exception is thrown', () => {
    // Given
    const error = new Error('Git failure')
    extractLatestVersionFromGitTag.mockImplementation(() => {
      throw error
    })

    // When
    main()

    // Then
    expect(core.setFailed).toHaveBeenCalledWith('Failed to extract version: Git failure')
  })
})
