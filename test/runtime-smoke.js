const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`)
  }
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-version-action-smoke-'))

try {
  run('git', ['init'], tmpDir)
  run('git', ['config', 'user.email', 'smoke@test.local'], tmpDir)
  run('git', ['config', 'user.name', 'Smoke Test'], tmpDir)

  fs.writeFileSync(path.join(tmpDir, 'README.md'), '# smoke test\n', 'utf8')
  run('git', ['add', 'README.md'], tmpDir)
  run('git', ['commit', '-m', 'init'], tmpDir)
  run('git', ['tag', 'v1.2.3'], tmpDir)

  const execution = spawnSync('node', [path.resolve(__dirname, '..', 'dist', 'index.js')], {
    cwd: tmpDir,
    encoding: 'utf8'
  })

  if (execution.status !== 0) {
    throw new Error(`Runtime smoke test failed:\n${execution.stdout}\n${execution.stderr}`)
  }

  const combinedOutput = `${execution.stdout}\n${execution.stderr}`
  if (combinedOutput.includes('Dynamic require of "net" is not supported')) {
    throw new Error(`Regression detected in bundled runtime:\n${combinedOutput}`)
  }
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true })
}
