import semver from 'semver'
import { getOctokit } from '@actions/github'

type Octokit = ReturnType<typeof getOctokit>

export interface CreateReleaseOptions {
  version: string
  token: string
  owner: string
  repo: string
  sha: string
  dryRun?: boolean
  updateMajorTag?: boolean
}

export interface CreateReleaseResult {
  tag: string
  majorTag: string
  created: boolean
}

// Same acceptance rule as extractLatestVersionFromGitTag.ts (an existing valid semver, with an
// optional leading v), reusing the same `semver` dependency instead of a hand-rolled regex -- the
// scenario this action exists for: a caller validating a human-supplied version string, not just
// parsing one already known to be a real tag.
export function normalizeVersion(input: string): string {
  const cleaned = input.startsWith('v') || input.startsWith('V') ? input.slice(1) : input
  const parsed = semver.parse(cleaned)
  if (!parsed) {
    throw new Error(`Invalid version: '${input}'. Use semantic version format like 1.2.3 or v1.2.3.`)
  }
  return `v${parsed.version}`
}

export async function createRelease(options: CreateReleaseOptions): Promise<CreateReleaseResult> {
  const tag = normalizeVersion(options.version)
  const octokit = getOctokit(options.token)
  const { owner, repo, sha } = options

  if (await tagExists(octokit, owner, repo, tag)) {
    throw new Error(`Tag '${tag}' already exists. Choose a new version.`)
  }

  if (options.dryRun) {
    return { tag, majorTag: '', created: false }
  }

  await octokit.rest.git.createRef({ owner, repo, ref: `refs/tags/${tag}`, sha })

  // Never throws: normalizeVersion already proved `tag.slice(1)` parses.
  const parsed = semver.parse(tag.slice(1)) as semver.SemVer
  const isPrerelease = parsed.prerelease.length > 0

  await octokit.rest.repos.createRelease({
    owner,
    repo,
    tag_name: tag,
    name: tag,
    target_commitish: sha,
    generate_release_notes: true,
    draft: false,
    prerelease: isPrerelease
  })

  let majorTag = ''
  // A prerelease never moves the floating major tag: every caller pinning v1 would otherwise
  // silently receive unstable code the moment a v1.x.x-rc.1 was published.
  if (options.updateMajorTag && !isPrerelease) {
    majorTag = `v${parsed.major}`
    await moveTag(octokit, owner, repo, majorTag, sha)
  }

  return { tag, majorTag, created: true }
}

async function tagExists(octokit: Octokit, owner: string, repo: string, tag: string): Promise<boolean> {
  try {
    await octokit.rest.git.getRef({ owner, repo, ref: `tags/${tag}` })
    return true
  } catch (err) {
    if (isNotFound(err)) {
      return false
    }
    throw err
  }
}

async function moveTag(octokit: Octokit, owner: string, repo: string, tag: string, sha: string): Promise<void> {
  if (await tagExists(octokit, owner, repo, tag)) {
    await octokit.rest.git.updateRef({ owner, repo, ref: `tags/${tag}`, sha, force: true })
  } else {
    await octokit.rest.git.createRef({ owner, repo, ref: `refs/tags/${tag}`, sha })
  }
}

function isNotFound(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'status' in err && (err as { status: unknown }).status === 404
}
