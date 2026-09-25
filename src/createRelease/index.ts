import { getInput, setOutput, setFailed, info } from '@actions/core'
import { context } from '@actions/github'
import { createRelease } from './createRelease'

export default main

export async function main(): Promise<void> {
  try {
    const version = getInput('version', { required: true })
    const token = getInput('github-token', { required: true })
    const dryRun = getInput('dry-run') === 'true'
    const updateMajorTag = getInput('update-major-tag') !== 'false'

    const result = await createRelease({
      version,
      token,
      owner: context.repo.owner,
      repo: context.repo.repo,
      sha: context.sha,
      dryRun,
      updateMajorTag
    })

    setOutput('tag', result.tag)
    setOutput('major-tag', result.majorTag)
    setOutput('created', result.created.toString())

    if (dryRun) {
      info(`Dry-run complete. '${result.tag}' is available.`)
    } else {
      info(
        `Published release '${result.tag}'` +
        (result.majorTag ? `; moved '${result.majorTag}' to match.` : '.')
      )
    }
  } catch (error) {
    if (error instanceof Error) {
      setFailed(`Failed to create release: ${error.message}`)
    } else {
      setFailed('Failed to create release: Unknown error')
    }
  }
}

// Execute main when run by GitHub Actions.
if (process.env.JEST_WORKER_ID === undefined) {
  main().catch((err) => {
    const message = err instanceof Error ? err.message : String(err)
    setFailed(`Failed to create release: ${message}`)
  })
}
