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

export async function main(options: Record<string, unknown> = {}): Promise<void> {
  try {
    const result = await extractLatestVersionFromGitTag(options)
    info(`Extracted version info: ${JSON.stringify(result, null, 2)}`)

    ;(Object.keys(OUTPUTS) as Array<keyof VersionOutputs>)
      .filter((key) => key !== 'isSemver')
      .forEach((key) => {
        setOutput(OUTPUTS[key], result[key] ?? '')
      })

    const hasSemverCoreParts = [result.major, result.minor, result.patch]
      .every(part => typeof part === 'string' && /^\d+$/.test(part))
    setOutput(OUTPUTS.isSemver, hasSemverCoreParts.toString())
  } catch (error) {
    if (error instanceof Error) {
      setFailed(`Failed to extract version: ${error.message}`)
    } else {
      setFailed('Failed to extract version: Unknown error')
    }
  }
}

// Execute main when run by GitHub Actions.
if (process.env.JEST_WORKER_ID === undefined) {
  main().catch((err) => {
    const message = err instanceof Error ? err.message : String(err)
    setFailed(`Failed to extract version: ${message}`)
  })
}
