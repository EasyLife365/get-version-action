const { extractLatestVersionFromGitTag } = require('../src/extractLatestVersionFromGitTag');
const { execSync } = require('child_process');

jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

describe('extractLatestVersionFromGitTag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns latest semver version with patch bumped by commit count', () => {
    execSync
      .mockImplementationOnce(() => 'v1.2.3\nv1.2.0\nv0.9.0') // git tag
      .mockImplementationOnce(() => '5'); // git rev-list

    const result = extractLatestVersionFromGitTag();

    expect(result).toEqual({
      version: 'v1.2.3',
      versionWithoutPrefix: '1.2.3',
      major: '1',
      minor: '2',
      patch: '8',
      isPrerelease: false
    });
  });

  test('falls back to v0.0.0 when no tags found', () => {
    execSync
      .mockImplementationOnce(() => '') // git tag
      .mockImplementationOnce(() => '3'); // git rev-list

    const result = extractLatestVersionFromGitTag();

    expect(result).toEqual({
      version: 'v0.0.0',
      versionWithoutPrefix: '0.0.0',
      major: '0',
      minor: '0',
      patch: '3',
      isPrerelease: false
    });
  });

  test('ignores non-semver tags', () => {
    execSync
      .mockImplementationOnce(() => 'foo\nbar\nv2.0.0-beta\nv1.0.0') // git tag
      .mockImplementationOnce(() => '2'); // git rev-list

    const result = extractLatestVersionFromGitTag();

    expect(result.version).toBe('v2.0.0-beta');
    expect(result.isPrerelease).toBe(true);
    expect(result.prerelease).toBe('beta');
    expect(result.patch).toBe('2'); // patch bumped
  });

  test('disables commit count increment when disableAutoPatchCount is true', () => {
    execSync.mockImplementationOnce(() => 'v1.2.3\nv1.2.0');

    const result = extractLatestVersionFromGitTag({ disableAutoPatchCount: true });

    expect(result).toEqual({
      version: 'v1.2.3',
      versionWithoutPrefix: '1.2.3',
      major: '1',
      minor: '2',
      patch: '3',
      isPrerelease: false
    });
    expect(execSync).toHaveBeenCalledTimes(1); // No commit count command
  });

  test('handles parse failure gracefully', () => {
    execSync
      .mockImplementationOnce(() => 'not-a-version') // git tag
      .mockImplementationOnce(() => '0'); // fallback commit count

    const result = extractLatestVersionFromGitTag();

    expect(result.version).toBe('v0.0.0');
    expect(result.patch).toBe('0');
  });

  test('respects custom prefix', () => {
    execSync
      .mockImplementationOnce(() => 'release-1.0.0\nrelease-0.9.0') // git tag
      .mockImplementationOnce(() => '4'); // git rev-list

    const result = extractLatestVersionFromGitTag({ prefix: 'release-' });

    expect(result.version).toBe('release-1.0.0');
    expect(result.versionWithoutPrefix).toBe('1.0.0');
    expect(result.patch).toBe('4');
  });
});
