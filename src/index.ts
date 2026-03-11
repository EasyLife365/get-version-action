import { info, setOutput, setFailed } from '@actions/core'
import { extractLatestVersionFromGitTag } from './extractLatestVersionFromGitTag'

interface VersionOutputs {
  version: string
  versionWithoutV: string
  major: string
  minor: string
  patch: string
  prerelease: string
  build: string
  isPrerelease: string
  isSemver: string
}

const OUTPUTS: Record<keyof VersionOutputs, string> = {
  version: 'version',
  versionWithoutV: 'versionWithoutV',
  major: 'major',
  minor: 'minor',
  patch: 'patch',
  prerelease: 'prerelease',
  build: 'build',
  isPrerelease: 'isPrerelease',
  isSemver: 'isSemver'
}

export default main

export function main(options: Record<string, unknown> = {}): void {
  try {
    const result = extractLatestVersionFromGitTag(options)
    info(`Extracted version info: ${JSON.stringify(result, null, 2)}`)

    Object.keys(result).forEach((key) => {
      const outputKey = key as keyof VersionOutputs
      setOutput(OUTPUTS[outputKey], result[outputKey] ?? '')
    })

    setOutput('isSemver', Object.prototype.hasOwnProperty.call(result, 'major').toString())
  } catch (error) {
    if (error instanceof Error) {
      setFailed(`Failed to extract version: ${error.message}`)
    } else {
      setFailed('Failed to extract version: Unknown error')
    }
  }
}

// Execute main when run by GitHub Actions (esbuild will include this in the bundle)
// In test environment, this will be skipped
main()
