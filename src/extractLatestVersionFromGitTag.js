const { execSync } = require('child_process');
const core = require('@actions/core');
const semver = require('semver');

const PRERELEASE_SEPARATOR = '.';
const BUILD_SEPARATOR = '.';
const DEFAULT_VERSION = 'v0.0.0';

function extractLatestVersionFromGitTag(options = {}) {
  const prefix = options.prefix || 'v';
  let version = DEFAULT_VERSION;
  let commitsSinceTag = 0;

  try {
    const tags = getTags(prefix);
    if (tags.length > 0) {
      version = tags[0];
      core.info(`Found latest tag: ${version}`);
    } else {
      core.warning(`No valid semver tags found with prefix "${prefix}", falling back to ${DEFAULT_VERSION}`);
    }

    if (!options.disableAutoPatchCount) {
      commitsSinceTag = countCommitsSince(version);
      core.info(`Commits since tag ${version}: ${commitsSinceTag}`);
    }
  } catch (err) {
    core.error(`Error extracting version: ${err.message}`);
  }

  const versionWithoutPrefix = version.startsWith(prefix)
    ? version.slice(prefix.length)
    : version;

  const parsed = parseVersionParts(versionWithoutPrefix);

  if (version === DEFAULT_VERSION && parsed.patch === undefined) {
    parsed.patch = '0';
  }

  if (!options.disableAutoPatchCount && parsed && !isNaN(Number(parsed.patch))) {
    parsed.patch = (Number(parsed.patch) + commitsSinceTag).toString();
  }

  return {
    version,
    versionWithoutPrefix,
    ...parsed
  };
}

function getTags(prefix = 'v') {
  try {
    const rawTags = execSync(`git tag --list ${prefix}* --sort=-v:refname`, {
      encoding: 'utf-8'
    }).trim();

    return rawTags
      .split(/\r?\n/)
      .map(tag => tag.trim())
      .map(tag => ({ tag, semver: semver.valid(tag) || semver.coerce(tag) }))
      .filter(({ semver }) => semver !== null)
      .sort((a, b) => semver.rcompare(a.semver, b.semver))
      .map(({ tag }) => tag);
  } catch (err) {
    core.error(`Failed to retrieve git tags: ${err.message}`);
    return [];
  }
}

function countCommitsSince(tag) {
  try {
    const command = tag === DEFAULT_VERSION
      ? 'git rev-list --count HEAD'
      : `git rev-list --count ${tag}..HEAD`;

    return parseInt(execSync(command, { encoding: 'utf-8' }).trim(), 10) || 0;
  } catch (err) {
    core.warning(`Failed to count commits since tag "${tag}": ${err.message}`);
    return 0;
  }
}

function parseVersionParts(version) {
  const sv = semver.parse(version);
  if (!sv) return {};

  const result = {
    major: sv.major.toString(),
    minor: sv.minor.toString(),
    patch: sv.patch.toString(),
    isPrerelease: false
  };

  if (sv.prerelease.length > 0) {
    result.prerelease = sv.prerelease.join(PRERELEASE_SEPARATOR);
    result.isPrerelease = true;
  }

  if (sv.build.length > 0) {
    result.build = sv.build.join(BUILD_SEPARATOR);
  }

  return result;
}

module.exports = {
  extractLatestVersionFromGitTag
};
