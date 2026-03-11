/* eslint-env jest */

import { extractLatestVersionFromGitTag } from '../src/extractLatestVersionFromGitTag'
import * as childProcess from 'child_process'

jest.mock('child_process')

describe('extractLatestVersionFromGitTag', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  test('returns correct values when valid semver tag exists', () => {
    ;(childProcess.execSync as jest.Mock)
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
    ;(childProcess.execSync as jest.Mock)
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
    ;(childProcess.execSync as jest.Mock)
      .mockImplementationOnce(() => 'v2.1.4')

    const result = extractLatestVersionFromGitTag({ disableAutoPatchCount: true })

    expect(result.version).toBe('v2.1.4')
    expect(result.patch).toBe('4')
  })

  test('handles prerelease and build tags correctly', () => {
    ;(childProcess.execSync as jest.Mock)
      .mockImplementationOnce(() => 'v1.0.0-beta.1+build.789') // tags
      .mockImplementationOnce(() => '0') // no new commits

    const result = extractLatestVersionFromGitTag()

    expect(result.version).toBe('v1.0.0-beta.1') // build metadata stripped for .NET compatibility
    expect(result.prerelease).toBe('beta.1')
    expect(result.build).toBe('build.789') // build still parsed and returned for reference
    expect(result.isPrerelease).toBe('true')
  })

  test('ignores invalid semver tags', () => {
    ;(childProcess.execSync as jest.Mock)
      .mockImplementationOnce(() => 'abc\nv1.1\nv2.0.0') // tags
      .mockImplementationOnce(() => '0') // commits

    const result = extractLatestVersionFromGitTag()

    expect(result.version).toBe('v2.0.0')
  })

  test('uses custom prefix correctly', () => {
    ;(childProcess.execSync as jest.Mock)
      .mockImplementationOnce(() => 'rel1.0.0\nrel1.2.0') // tags
      .mockImplementationOnce(() => '2') // commits

    const result = extractLatestVersionFromGitTag({ prefix: 'rel' })

    expect(result.version).toBe('rel1.2.2')
    expect(result.versionWithoutV).toBe('1.2.2')
  })

  test('handles malformed version gracefully', () => {
    ;(childProcess.execSync as jest.Mock)
      .mockImplementationOnce(() => 'not-a-version')
      .mockImplementationOnce(() => '3')

    const result = extractLatestVersionFromGitTag()

    expect(result.version).toBe('v0.0.4') // v0.0.1 baseline + 3 commits
    expect(result.patch).toBe('4')
  })

  test('uses --merged HEAD to only consider tags reachable from current branch', () => {
    let capturedCmd = ''
    ;(childProcess.execSync as jest.Mock)
      .mockImplementationOnce((cmd: string) => {
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

  test('handles git tag command error gracefully', () => {
    ;(childProcess.execSync as jest.Mock)
      .mockImplementationOnce(() => {
        throw new Error('fatal: not a git repository')
      })

    const result = extractLatestVersionFromGitTag()

    expect(result.version).toBe('v0.0.1')
    expect(result.major).toBe('0')
    expect(result.minor).toBe('0')
    expect(result.patch).toBe('1')
  })

  test('handles commit count error gracefully when git command fails', () => {
    ;(childProcess.execSync as jest.Mock)
      .mockImplementationOnce(() => 'v1.0.0') // successful tag fetch
      .mockImplementationOnce(() => {
        throw new Error('not a git repository')
      })

    const result = extractLatestVersionFromGitTag()

    expect(result.version).toBe('v1.0.0')
    expect(result.patch).toBe('0') // no commits added due to error
  })

  test('handles commit count error gracefully when using fallback version', () => {
    ;(childProcess.execSync as jest.Mock)
      .mockImplementationOnce(() => '') // no tags
      .mockImplementationOnce(() => {
        throw new Error('failed to run git command')
      })

    const result = extractLatestVersionFromGitTag()

    expect(result.version).toBe('v0.0.1')
    expect(result.patch).toBe('1') // v0.0.1 baseline, no commits added
  })

  test('handles version with no semver parts gracefully', () => {
    ;(childProcess.execSync as jest.Mock)
      .mockImplementationOnce(() => 'release') // not a valid semver, coerce returns null
      .mockImplementationOnce(() => '5')

    const result = extractLatestVersionFromGitTag()

    // Falls back to v0.0.1 since 'release' doesn't have semver parts
    expect(result.version).toBe('v0.0.6') // v0.0.1 + 5 commits
    expect(result.major).toBe('0')
    expect(result.minor).toBe('0')
    expect(result.patch).toBe('6')
    expect(result.prerelease).toBe('')
    expect(result.build).toBe('')
  })

  test('disables auto patch count when specified even with git errors', () => {
    ;(childProcess.execSync as jest.Mock)
      .mockImplementationOnce(() => 'v2.3.4')

    const result = extractLatestVersionFromGitTag({ disableAutoPatchCount: true })

    expect(result.version).toBe('v2.3.4')
    expect(result.patch).toBe('4')
  })

  test('handles error when getting tags by returning default version', () => {
    const error = new Error('git command not found')
    ;(childProcess.execSync as jest.Mock).mockImplementation(() => {
      throw error
    })

    const result = extractLatestVersionFromGitTag()

    // Should return default version since we can't get tags and can't count commits
    expect(result.version).toMatch(/^v0\.0\.\d+$/)
    expect(result.major).toBe('0')
    expect(result.minor).toBe('0')
  })

  test('parses version with all components correctly', () => {
    ;(childProcess.execSync as jest.Mock)
      .mockImplementationOnce(() => 'v2.5.1-rc.3+build.456')
      .mockImplementationOnce(() => '0')

    const result = extractLatestVersionFromGitTag()

    expect(result.major).toBe('2')
    expect(result.minor).toBe('5')
    expect(result.patch).toBe('1')
    expect(result.prerelease).toBe('rc.3')
    expect(result.build).toBe('build.456')
    expect(result.isPrerelease).toBe('true')
  })

  test('handles empty git output gracefully', () => {
    ;(childProcess.execSync as jest.Mock)
      .mockImplementationOnce(() => '') // empty tag list
      .mockImplementationOnce(() => '0')

    const result = extractLatestVersionFromGitTag()

    expect(result.version).toBe('v0.0.1')
    expect(result.patch).toBe('1')
  })

  test('handles version with trailing whitespace', () => {
    ;(childProcess.execSync as jest.Mock)
      .mockImplementationOnce(() => 'v1.2.3\n  v1.1.0  \n') // tags with whitespace
      .mockImplementationOnce(() => '0')

    const result = extractLatestVersionFromGitTag()

    // Should properly trim and select v1.2.3
    expect(result.version).toBe('v1.2.3')
    expect(result.major).toBe('1')
    expect(result.minor).toBe('2')
    expect(result.patch).toBe('3')
  })

  test('handles commit count parse errors gracefully with fallback version', () => {
    ;(childProcess.execSync as jest.Mock)
      .mockImplementationOnce(() => '') // no valid tags
      .mockImplementationOnce(() => 'not-a-number') // unparseable commit count

    const result = extractLatestVersionFromGitTag()

    // Should handle NaN gracefully by treating as 0 commits
    expect(result.version).toBe('v0.0.1')
  })

  test('throws and handles unexpected error in main extractLatestVersionFromGitTag', () => {
    // Force an error path by mocking execSync to fail on both attempts
    ;(childProcess.execSync as jest.Mock)
      .mockImplementation(() => {
        throw new Error('Unexpected error')
      })

    const result = extractLatestVersionFromGitTag()

    // Should fall back gracefully even with errors
    expect(result.version).toBe('v0.0.1')
    expect(result.major).toBe('0')
  })

  describe('npm compatibility scenarios', () => {
    test('npm accepts standard version', () => {
      ;(childProcess.execSync as jest.Mock)
        .mockImplementationOnce(() => 'v1.2.3')
        .mockImplementationOnce(() => '0')

      const result = extractLatestVersionFromGitTag()

      // npm accepts: MAJOR.MINOR.PATCH
      expect(result.version).toBe('v1.2.3')
      expect(/^\d+\.\d+\.\d+$/.test(result.versionWithoutV)).toBe(true)
    })

    test('npm accepts prerelease version', () => {
      ;(childProcess.execSync as jest.Mock)
        .mockImplementationOnce(() => 'v2.0.0-rc.1')
        .mockImplementationOnce(() => '0')

      const result = extractLatestVersionFromGitTag()

      // npm accepts: MAJOR.MINOR.PATCH-PRERELEASE
      expect(result.version).toBe('v2.0.0-rc.1')
      expect(/^\d+\.\d+\.\d+-[\w.]+$/.test(result.versionWithoutV)).toBe(true)
    })

    test('npm accepts version with auto-incremented patch', () => {
      ;(childProcess.execSync as jest.Mock)
        .mockImplementationOnce(() => 'v1.0.0')
        .mockImplementationOnce(() => '5')

      const result = extractLatestVersionFromGitTag()

      // npm accepts incremented patch
      expect(result.version).toBe('v1.0.5')
      expect(/^\d+\.\d+\.\d+$/.test(result.versionWithoutV)).toBe(true)
    })

    test('npm accepts prerelease with auto-incremented patch', () => {
      ;(childProcess.execSync as jest.Mock)
        .mockImplementationOnce(() => 'v1.0.0-alpha')
        .mockImplementationOnce(() => '3')

      const result = extractLatestVersionFromGitTag()

      // npm accepts incremented patch with prerelease
      expect(result.version).toBe('v1.0.3-alpha')
      expect(/^\d+\.\d+\.\d+[\w.-]*$/.test(result.versionWithoutV)).toBe(true)
    })
  })

  describe('.NET compatibility scenarios', () => {
    test('.NET accepts standard version without build metadata', () => {
      ;(childProcess.execSync as jest.Mock)
        .mockImplementationOnce(() => 'v1.2.3')
        .mockImplementationOnce(() => '0')

      const result = extractLatestVersionFromGitTag()

      // .NET accepts: MAJOR.MINOR.PATCH (no build metadata)
      expect(result.version).toBe('v1.2.3')
      expect(result.build).toBe('')
      expect(/^\d+\.\d+\.\d+$/.test(result.versionWithoutV)).toBe(true)
    })

    test('.NET accepts prerelease version without build metadata', () => {
      ;(childProcess.execSync as jest.Mock)
        .mockImplementationOnce(() => 'v2.0.0-beta.1')
        .mockImplementationOnce(() => '0')

      const result = extractLatestVersionFromGitTag()

      // .NET accepts: MAJOR.MINOR.PATCH-PRERELEASE (no build metadata)
      expect(result.version).toBe('v2.0.0-beta.1')
      expect(result.build).toBe('')
      expect(/^\d+\.\d+\.\d+-[\w.]+$/.test(result.versionWithoutV)).toBe(true)
    })

    test('.NET rejects build metadata - solution strips it', () => {
      ;(childProcess.execSync as jest.Mock)
        .mockImplementationOnce(() => 'v1.0.0+build.123')
        .mockImplementationOnce(() => '0')

      const result = extractLatestVersionFromGitTag()

      // Build metadata is stripped for .NET compatibility
      expect(result.version).toBe('v1.0.0') // NO build metadata in version
      expect(result.build).toBe('build.123') // but still available separately
      expect(!result.version.includes('+')).toBe(true)
    })

    test('.NET rejects prerelease with build metadata - solution strips build only', () => {
      ;(childProcess.execSync as jest.Mock)
        .mockImplementationOnce(() => 'v1.0.0-rc.1+build.456')
        .mockImplementationOnce(() => '0')

      const result = extractLatestVersionFromGitTag()

      // Only build metadata is stripped, prerelease is kept
      expect(result.version).toBe('v1.0.0-rc.1') // prerelease kept, build stripped
      expect(result.prerelease).toBe('rc.1')
      expect(result.build).toBe('build.456')
      expect(!result.version.includes('+')).toBe(true)
    })

    test('.NET accepts incremented patch version', () => {
      ;(childProcess.execSync as jest.Mock)
        .mockImplementationOnce(() => 'v2.1.0')
        .mockImplementationOnce(() => '4')

      const result = extractLatestVersionFromGitTag()

      // .NET accepts incremented patch
      expect(result.version).toBe('v2.1.4')
      expect(/^\d+\.\d+\.\d+$/.test(result.versionWithoutV)).toBe(true)
    })
  })

  describe('both npm and .NET compatibility', () => {
    test('returns valid version for both npm and .NET', () => {
      ;(childProcess.execSync as jest.Mock)
        .mockImplementationOnce(() => 'v1.5.0-rc.2+metadata.789')
        .mockImplementationOnce(() => '3')

      const result = extractLatestVersionFromGitTag()

      // Version should work for both
      // npm: accepts prerelease without build metadata
      // .NET: accepts prerelease without build metadata
      expect(result.version).toBe('v1.5.3-rc.2')
      expect(result.prerelease).toBe('rc.2')
      expect(result.build).toBe('metadata.789')
      expect(!result.version.includes('+')).toBe(true)
    })

    test('no version contains build metadata in output', () => {
      const versions = [
        'v1.0.0+build.1',
        'v2.0.0-alpha+metadata',
        'v3.5.2-beta.1+12345'
      ]

      versions.forEach(tag => {
        ;(childProcess.execSync as jest.Mock).mockClear()
        ;(childProcess.execSync as jest.Mock)
          .mockImplementationOnce(() => tag)
          .mockImplementationOnce(() => '0')

        const result = extractLatestVersionFromGitTag()

        // No version should contain + character
        expect(result.version.includes('+')).toBe(false)
        expect(result.versionWithoutV.includes('+')).toBe(false)
      })
    })

    test('supports custom prefix for npm and .NET', () => {
      ;(childProcess.execSync as jest.Mock)
        .mockImplementationOnce(() => 'release-1.2.3\nrelease-1.0.0')
        .mockImplementationOnce(() => '5')

      const result = extractLatestVersionFromGitTag({ prefix: 'release-' })

      // Both npm and .NET work with custom prefix
      expect(result.version).toBe('release-1.2.8')
      expect(result.versionWithoutV).toBe('1.2.8')
      expect(result.major).toBe('1')
    })
  })
})
