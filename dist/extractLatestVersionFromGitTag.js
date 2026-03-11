import { execSync } from 'child_process';
import { info, warning, error as coreError } from '@actions/core';
import semver from 'semver';
const PRERELEASE_SEPARATOR = '.';
const BUILD_SEPARATOR = '.';
const DEFAULT_VERSION = 'v0.0.1';
export function extractLatestVersionFromGitTag(options = {}) {
    const prefix = options.prefix || 'v';
    let version = DEFAULT_VERSION;
    let hasValidTag = false;
    let commitsSinceTag = 0;
    try {
        const tags = getTags(prefix);
        if (tags.length > 0) {
            version = tags[0];
            hasValidTag = true;
            info(`Found latest tag: ${version}`);
        }
        else {
            warning(`No valid semver tags found with prefix "${prefix}", falling back to ${DEFAULT_VERSION}`);
        }
        if (!options.disableAutoPatchCount) {
            commitsSinceTag = countCommitsSince(version, hasValidTag);
            info(`Commits since tag ${version}: ${commitsSinceTag}`);
        }
    }
    catch (err) {
        if (err instanceof Error) {
            coreError(`Error extracting version: ${err.message}`);
        }
    }
    const versionWithoutPrefix = version.startsWith(prefix)
        ? version.slice(prefix.length)
        : version;
    const parsed = parseVersionParts(versionWithoutPrefix);
    if (!options.disableAutoPatchCount && parsed && !isNaN(Number(parsed.patch))) {
        parsed.patch = (Number(parsed.patch) + commitsSinceTag).toString();
    }
    // Recompose version WITHOUT build metadata for .NET compatibility
    // npm supports build metadata (+xyz), but .NET does not
    // We strip the build metadata from the returned version to ensure both npm and .NET compatibility
    const recomposedVersion = `${prefix}${parsed.major}.${parsed.minor}.${parsed.patch}` +
        (parsed.prerelease ? `-${parsed.prerelease}` : '');
    return {
        version: recomposedVersion,
        versionWithoutV: recomposedVersion.slice(prefix.length),
        major: parsed.major ?? '',
        minor: parsed.minor ?? '',
        patch: parsed.patch ?? '',
        prerelease: parsed.prerelease ?? '',
        build: parsed.build ?? '', // kept for reference but not included in final version string
        isPrerelease: parsed.isPrerelease ? 'true' : 'false',
        isSemver: '' // placeholder, will be computed in `main`
    };
}
function getTags(prefix = 'v') {
    try {
        const rawTags = execSync(`git tag --merged HEAD --list "${prefix}*" --sort=-v:refname`, {
            encoding: 'utf-8'
        }).trim();
        return rawTags
            .split(/\r?\n/)
            .map(tag => tag.trim())
            .map(tag => ({ tag, semver: semver.valid(tag) || semver.coerce(tag) }))
            .filter(({ semver: sv }) => sv !== null)
            .sort((a, b) => semver.rcompare(a.semver, b.semver))
            .map(({ tag }) => tag);
    }
    catch (err) {
        if (err instanceof Error) {
            coreError(`Failed to retrieve git tags: ${err.message}`);
        }
        return [];
    }
}
function countCommitsSince(tag, hasValidTag) {
    try {
        const command = !hasValidTag
            ? 'git rev-list --count HEAD'
            : `git rev-list --count ${tag}..HEAD`;
        return parseInt(execSync(command, { encoding: 'utf-8' }).trim(), 10) || 0;
    }
    catch (err) {
        if (err instanceof Error) {
            warning(`Failed to count commits since tag "${tag}": ${err.message}`);
        }
        return 0;
    }
}
function parseVersionParts(version) {
    const sv = semver.parse(version);
    if (!sv) {
        return {
            major: '',
            minor: '',
            patch: '',
            prerelease: '',
            build: '',
            isPrerelease: false
        };
    }
    const result = {
        major: sv.major.toString(),
        minor: sv.minor.toString(),
        patch: sv.patch.toString(),
        prerelease: '',
        build: '',
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
//# sourceMappingURL=extractLatestVersionFromGitTag.js.map