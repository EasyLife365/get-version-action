/* eslint-env jest */

import * as core from '@actions/core'
import { main } from '../../src/createRelease/index'
import { createRelease } from '../../src/createRelease/createRelease'

jest.mock('../../src/createRelease/createRelease')

describe('create-release main execution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
      const values: Record<string, string> = {
        version: '1.2.3',
        'github-token': 'test-token',
        'dry-run': 'false',
        'update-major-tag': 'true'
      }
      return values[name] ?? ''
    })
  })

  test('sets outputs for a successful release', async () => {
    ;(createRelease as jest.Mock).mockResolvedValue({ tag: 'v1.2.3', majorTag: 'v1', created: true })

    await main()

    expect(createRelease).toHaveBeenCalledWith({
      version: '1.2.3',
      token: 'test-token',
      owner: 'test-owner',
      repo: 'test-repo',
      sha: 'test-sha',
      dryRun: false,
      updateMajorTag: true
    })
    expect(core.setOutput).toHaveBeenCalledWith('tag', 'v1.2.3')
    expect(core.setOutput).toHaveBeenCalledWith('major-tag', 'v1')
    expect(core.setOutput).toHaveBeenCalledWith('created', 'true')
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  test('passes dry-run through and reports no major tag', async () => {
    ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
      const values: Record<string, string> = {
        version: '1.2.3',
        'github-token': 'test-token',
        'dry-run': 'true',
        'update-major-tag': 'true'
      }
      return values[name] ?? ''
    })
    ;(createRelease as jest.Mock).mockResolvedValue({ tag: 'v1.2.3', majorTag: '', created: false })

    await main()

    expect(createRelease).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }))
    expect(core.setOutput).toHaveBeenCalledWith('created', 'false')
  })

  test('fails the action when createRelease throws', async () => {
    ;(createRelease as jest.Mock).mockRejectedValue(new Error('Tag already exists'))

    await main()

    expect(core.setFailed).toHaveBeenCalledWith('Failed to create release: Tag already exists')
  })

  test('treats update-major-tag=false as disabling the major-tag move', async () => {
    ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
      const values: Record<string, string> = {
        version: '1.2.3',
        'github-token': 'test-token',
        'dry-run': 'false',
        'update-major-tag': 'false'
      }
      return values[name] ?? ''
    })
    ;(createRelease as jest.Mock).mockResolvedValue({ tag: 'v1.2.3', majorTag: '', created: true })

    await main()

    expect(createRelease).toHaveBeenCalledWith(expect.objectContaining({ updateMajorTag: false }))
  })
})
