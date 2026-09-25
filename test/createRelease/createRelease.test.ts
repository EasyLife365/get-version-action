/* eslint-env jest */

import { getOctokit } from '@actions/github'
import { createRelease, normalizeVersion } from '../../src/createRelease/createRelease'

const getRef = jest.fn()
const createRef = jest.fn()
const updateRef = jest.fn()
const createGhRelease = jest.fn()

const notFound = Object.assign(new Error('Not Found'), { status: 404 })

describe('normalizeVersion', () => {
  test('accepts a bare semver string', () => {
    expect(normalizeVersion('1.2.3')).toBe('v1.2.3')
  })

  test('accepts a v-prefixed semver string', () => {
    expect(normalizeVersion('v1.2.3')).toBe('v1.2.3')
  })

  test('preserves a prerelease suffix', () => {
    expect(normalizeVersion('1.2.3-rc.1')).toBe('v1.2.3-rc.1')
  })

  test('rejects a non-semver string', () => {
    expect(() => normalizeVersion('1.2')).toThrow(/Invalid version/)
  })

  test('rejects an empty string', () => {
    expect(() => normalizeVersion('')).toThrow(/Invalid version/)
  })
})

describe('createRelease', () => {
  // updateMajorTag is explicit here on purpose: the core function has no implicit default for
  // it (that translation from a missing/'"false"' string input lives in index.ts only), so a
  // caller -- including this test -- must pass the boolean it actually means.
  const baseOptions = {
    version: '1.2.3',
    token: 'test-token',
    owner: 'EasyLife365',
    repo: 'example',
    sha: 'abc123',
    updateMajorTag: true
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getOctokit as jest.Mock).mockReturnValue({
      rest: {
        git: { getRef, createRef, updateRef },
        repos: { createRelease: createGhRelease }
      }
    })
  })

  test('throws if the tag already exists', async () => {
    getRef.mockResolvedValueOnce({})

    await expect(createRelease(baseOptions)).rejects.toThrow(/already exists/)
    expect(createRef).not.toHaveBeenCalled()
  })

  test('dry-run validates without creating anything', async () => {
    getRef.mockRejectedValueOnce(notFound)

    const result = await createRelease({ ...baseOptions, dryRun: true })

    expect(result).toEqual({ tag: 'v1.2.3', majorTag: '', created: false })
    expect(createRef).not.toHaveBeenCalled()
    expect(createGhRelease).not.toHaveBeenCalled()
  })

  test('creates the tag and release, and moves an existing major tag', async () => {
    getRef
      .mockRejectedValueOnce(notFound) // v1.2.3 does not exist
      .mockResolvedValueOnce({}) // v1 does exist

    const result = await createRelease(baseOptions)

    expect(createRef).toHaveBeenCalledWith({
      owner: 'EasyLife365',
      repo: 'example',
      ref: 'refs/tags/v1.2.3',
      sha: 'abc123'
    })
    expect(createGhRelease).toHaveBeenCalledWith(
      expect.objectContaining({ tag_name: 'v1.2.3', prerelease: false, generate_release_notes: true })
    )
    expect(updateRef).toHaveBeenCalledWith({
      owner: 'EasyLife365',
      repo: 'example',
      ref: 'tags/v1',
      sha: 'abc123',
      force: true
    })
    expect(result).toEqual({ tag: 'v1.2.3', majorTag: 'v1', created: true })
  })

  test('creates the major tag when it does not exist yet (first v1 release)', async () => {
    getRef
      .mockRejectedValueOnce(notFound) // v1.0.0 does not exist
      .mockRejectedValueOnce(notFound) // v1 does not exist either

    const result = await createRelease({ ...baseOptions, version: '1.0.0' })

    expect(createRef).toHaveBeenNthCalledWith(1, expect.objectContaining({ ref: 'refs/tags/v1.0.0' }))
    expect(createRef).toHaveBeenNthCalledWith(2, expect.objectContaining({ ref: 'refs/tags/v1' }))
    expect(updateRef).not.toHaveBeenCalled()
    expect(result.majorTag).toBe('v1')
  })

  test('never moves the major tag for a prerelease', async () => {
    getRef.mockRejectedValueOnce(notFound)

    const result = await createRelease({ ...baseOptions, version: '1.2.3-rc.1' })

    expect(createGhRelease).toHaveBeenCalledWith(expect.objectContaining({ prerelease: true }))
    expect(updateRef).not.toHaveBeenCalled()
    expect(createRef).toHaveBeenCalledTimes(1)
    expect(result.majorTag).toBe('')
  })

  test('does not move the major tag when update-major-tag is false', async () => {
    getRef.mockRejectedValueOnce(notFound)

    const result = await createRelease({ ...baseOptions, updateMajorTag: false })

    expect(updateRef).not.toHaveBeenCalled()
    expect(createRef).toHaveBeenCalledTimes(1)
    expect(result.majorTag).toBe('')
  })

  test('propagates an unexpected error from the tag-existence check', async () => {
    const serverError = Object.assign(new Error('boom'), { status: 500 })
    getRef.mockRejectedValueOnce(serverError)

    await expect(createRelease(baseOptions)).rejects.toThrow('boom')
  })
})
