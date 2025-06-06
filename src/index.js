const core = require('@actions/core');
const { extractLatestVersionFromGitTag } = require('./extractLatestVersionFromGitTag');

const OUTPUTS = {
  version: 'version',
  versionWithoutV: 'versionWithoutV',
  major: 'major',
  minor: 'minor',
  patch: 'patch',
  prerelease: 'prerelease',
  build: 'build',
  isPrerelease: 'isPrerelease',
  isSemver: 'isSemver'
};

if (require.main === module) {
  main();
}

module.exports = main;

function main(options = {}) {
  try {
    const result = extractLatestVersionFromGitTag(options);
    core.info(`Extracted version info: ${JSON.stringify(result, null, 2)}`);

    Object.keys(result).forEach(key => {
      core.setOutput(OUTPUTS[key], result[key] ?? '');
    })

    core.setOutput('isSemver', Object.prototype.hasOwnProperty.call(result, 'major').toString())
  } catch (error) {
    core.setFailed(`Failed to extract version: ${error.message}`);
  }
}
