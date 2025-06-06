const core = require('@actions/core');
const { extractLatestVersionFromGitTag } = require('./extractLatestVersionFromGitTag');

const OUTPUTS = {
  version: 'version',
  versionWithoutV: 'version-without-v',
  major: 'major',
  minor: 'minor',
  patch: 'patch',
  prerelease: 'prerelease',
  build: 'build',
  isPrerelease: 'is-prerelease',
  isSemver: 'is-semver'
};

if (require.main === module) {
  main();
}

module.exports = main;

function main(options = {}) {
  try {
    const result = extractLatestVersionFromGitTag(options);
    core.info(`Extracted version info: ${JSON.stringify(result, null, 2)}`);

    for (const [key, outputName] of Object.entries(OUTPUTS)) {
      let value = result[key] ?? '';

      if (key === 'isSemver') {
        value = ['major', 'minor', 'patch'].every(k => result[k] !== undefined) ? 'true' : 'false';
      }

      core.setOutput(outputName, value);
      core.info(`Set output '${outputName}' = '${value}'`);
    }
  } catch (error) {
    core.setFailed(`Failed to extract version: ${error.message}`);
  }
}
