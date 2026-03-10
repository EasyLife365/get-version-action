/* eslint-env jest */
const { extractLatestVersionFromGitTag } = require('../src/extractLatestVersionFromGitTag')
const childProcess = require('child_process')

jest.mock('child_process')
jest.mock('@actions/core')

describe('extractLatestVersionFromGitTag', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  test('returns correct values when valid semver tag exists', () => {
    childProcess.execSync
      .mockImplementationOnce(() => 'v1.2.3\nv1.2.0\nv1.1.0') // git tag list
      .mockImplementationOnce(() => '5') // commits since tag

    const result = extractLatestVersionFromGitTag()

    expect(result).toEqual({
      version: 'v1.2.8', // patch 3 + 5 commits
      versionWithoutV: '1.2.8',
      major: '1',
      minor: '2',
      patch: '8',
      prerelease: '',
      build: '',
      isPrerelease: 'false',
      isSemver: ''
    })
  })

  test('falls back to v0.0.1 if no valid tags', () => {
    childProcess.execSync
      .mockImplementationOnce(() => '') // no tags
      .mockImplementationOnce(() => '3') // commits since HEAD

    const result = extractLatestVersionFromGitTag()

    expect(result.version).toBe('v0.0.4') // v0.0.1 baseline + 3 commits
    expect(result.versionWithoutV).toBe('0.0.4')
    expect(result.major).toBe('0')
    expect(result.minor).toBe('0')
    expect(result.patch).toBe('4')
    expect(result.isPrerelease).toBe('false')
  })

  test('respects disableAutoPatchCount option', () => {
    childProcess.execSync
      .mockImplementationOnce(() => 'v2.1.4')

    const result = extractLatestVersionFromGitTag({ disableAutoPatchCount: true })

    expect(result.version).toBe('v2.1.4')
    expect(result.patch).toBe('4')
  })

  test('handles prerelease and build tags correctly', () => {
    childProcess.execSync
      .mockImplementationOnce(() => 'v1.0.0-beta.1+build.789') // tags
      .mockImplementationOnce(() => '0') // no new commits

    const result = extractLatestVersionFromGitTag()

    expect(result.version).toBe('v1.0.0-beta.1+build.789')
    expect(result.prerelease).toBe('beta.1')
    expect(result.build).toBe('build.789')
    expect(result.isPrerelease).toBe('true')
  })

  test('ignores invalid semver tags', () => {
    childProcess.execSync
      .mockImplementationOnce(() => 'abc\nv1.1\nv2.0.0') // tags
      .mockImplementationOnce(() => '0') // commits

    const result = extractLatestVersionFromGitTag()

    expect(result.version).toBe('v2.0.0')
  })

  test('uses custom prefix correctly', () => {
    childProcess.execSync
      .mockImplementationOnce(() => 'rel1.0.0\nrel1.2.0') // tags
      .mockImplementationOnce(() => '2') // commits

    const result = extractLatestVersionFromGitTag({ prefix: 'rel' })

    expect(result.version).toBe('rel1.2.2')
    expect(result.versionWithoutV).toBe('1.2.2')
  })

  test('handles malformed version gracefully', () => {
    childProcess.execSync
      .mockImplementationOnce(() => 'not-a-version')
      .mockImplementationOnce(() => '3')

    const result = extractLatestVersionFromGitTag()

    expect(result.version).toBe('v0.0.4') // v0.0.1 baseline + 3 commits
    expect(result.patch).toBe('4')
  })

  test('uses --merged HEAD to only consider tags reachable from current branch', () => {
    let capturedCmd = ''
    childProcess.execSync
      .mockImplementationOnce((cmd) => {
        capturedCmd = cmd
        // Simulate: on feature branch, only branch-specific and ancestor tags are reachable
        // (a newer tag on main added after branching is NOT included)
        return 'v1.2.0-branch.1\nv1.1.0'
      })
      .mockImplementationOnce(() => '2') // 2 commits since v1.2.0-branch.1

    const result = extractLatestVersionFromGitTag()

    expect(capturedCmd).toContain('--merged HEAD')
    // v1.2.0-branch.1 (1.2 > 1.1) is selected as the latest reachable tag
    // patch = 0 + 2 commits = 2
    expect(result.version).toBe('v1.2.2-branch.1')
    expect(result.prerelease).toBe('branch.1')
    expect(result.isPrerelease).toBe('true')
  })
})
