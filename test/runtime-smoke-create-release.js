// Same purpose as runtime-smoke.js, for the create-release bundle: catch the exact regression
// class that motivated that file (esbuild bundling an ESM-only dependency -- @actions/github here
// -- into something that crashes at runtime instead of failing cleanly). create-release always
// needs a real GitHub token and network access to actually create a tag/release, so this can't be
// a full integration run the way runtime-smoke.js is; it deliberately runs the bundle with no
// inputs set, which core.getInput's required check rejects on its own, and asserts the failure is
// that controlled rejection -- not a raw "Cannot use import statement outside a module".
const { spawnSync } = require('node:child_process')
const path = require('node:path')

const execution = spawnSync('node', [path.resolve(__dirname, '..', 'create-release', 'dist', 'index.js')], {
  encoding: 'utf8',
  env: { ...process.env }
})

const combinedOutput = `${execution.stdout}\n${execution.stderr}`

if (/(dynamic require .* not supported|ERR_REQUIRE_ESM|Cannot use import statement outside a module)/i.test(combinedOutput)) {
  throw new Error(`Regression detected in bundled runtime:\n${combinedOutput}`)
}

if (!/::error::Failed to create release: Input required and not supplied: version/.test(combinedOutput)) {
  throw new Error(`Expected a clean "missing required input" failure, got:\n${combinedOutput}`)
}
