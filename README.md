## 📦 Get Version Action

A GitHub Action that extracts and parses the **latest Git tag reachable from the current branch** using [Semantic Versioning (SemVer)](https://semver.org/), with optional automatic patch bumping based on the number of commits since the last tag.

This action queries Git tags that are reachable from the current `HEAD` (branch-aware), sorts them semantically, and picks the highest version. It works consistently across push, release, and workflow\_dispatch triggers — respecting branch-specific tags and falling back to ancestor tags from `main` when no branch-specific tags exist.

**✅ Compatible with:** npm, .NET, and any tool that uses Semantic Versioning

## 🚀 Outputs

### `version`

The latest Git tag reachable from `HEAD` that matches a SemVer pattern, e.g. `v1.2.7`.
If no valid tag is found, this defaults to `v0.0.1`.

### `version-without-prefix`

The version with the leading `v` stripped, e.g. `1.2.7`.
If the tag does not start with `v`, the value will be the same as `version`.

### `is-semver`

`true` if the tag is a valid SemVer value.
If invalid, this will be set to `false`.

### `major`

The **major** component of the version, e.g. `1` in `v1.2.3-alpha.0+build.1`.

### `minor`

The **minor** component of the version, e.g. `2` in `v1.2.3-alpha.0+build.1`.

### `patch`

The **patch** component of the version, e.g. `3` in `v1.2.3-alpha.0+build.1`.

⚠️ This may be **automatically incremented** by the number of commits since the last tag — unless you disable this behavior with `disableAutoPatchCount`.

### `prerelease`

The prerelease portion of the version, e.g. `alpha.0` in `v1.2.3-alpha.0+build.1`.
Empty if not present.

### `build`

The build metadata, e.g. `build.1` in `v1.2.3-alpha.0+build.1`.
Empty if not present.

### `is-prerelease`

`true` if the version includes a prerelease segment. Otherwise `false`.

## 🌿 Branch-Aware Version Resolution

This action resolves the version **based on the current branch context**:

1. **Branch-specific tags first**: Only tags reachable from the current `HEAD` are considered (`git tag --merged HEAD`). This means tags added to `main` after a feature branch was cut are correctly excluded.
2. **Automatic fallback**: If no valid tags are reachable from `HEAD`, the version defaults to `v0.0.1`.

**Example scenario:**

| Situation | Tags visible | Selected version |
|---|---|---|
| On `main` with tag `v1.1.0` | `v1.1.0` | `v1.1.0` |
| On feature branch (cut from `v1.1.0`) with tag `v1.2.0-feature.1` | `v1.2.0-feature.1`, `v1.1.0` | `v1.2.0-feature.1` |
| Main advances to `v1.3.0` while still on feature branch | `v1.2.0-feature.1`, `v1.1.0` | `v1.2.0-feature.1` (correctly ignores `v1.3.0`) |

## ⚙️ Input Options

### `disableAutoPatchCount`

**Type:** `boolean`
**Default:** `false`

If set to `true`, disables the automatic increment of the patch version based on the number of commits since the latest Git tag.
This ensures the `patch` value is always taken directly from the tag.

## ✅ Example Usage

Ensure that `fetch-depth: 0` is being used to retrieve all tags in your repository

```yaml
steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0

  - id: get_version
    uses: easylife365/get-version-action@v1
    with:
      disableAutoPatchCount: true

  - run: echo "Version: ${{ steps.get_version.outputs.version }}"

  - run: echo "Without prefix: ${{ steps.get_version.outputs.versionWithoutV }}"
```

## 🔄 npm and .NET Compatibility

This action extracts version information in a format compatible with both **npm** and **.NET** ecosystems.

### Version Format

| Component | npm | .NET | Returned in version |
|-----------|-----|------|---------------------|
| `MAJOR.MINOR.PATCH` | ✅ Required | ✅ Required | ✅ YES |
| Prerelease (`-alpha`, `-beta.1`) | ✅ Supported | ✅ Supported | ✅ YES |
| Build metadata (`+build.456`) | ✅ Supported | ❌ **Not supported** | ❌ NO* |

*Build metadata is parsed and returned in the `build` output field for reference, but **excluded from the `version` output** to ensure .NET compatibility.

### Examples

<table>
<tr>
<th>Git Tag</th>
<th>version output</th>
<th>build output</th>
<th>npm</th>
<th>.NET</th>
</tr>
<tr>
<td><code>v1.2.3</code></td>
<td><code>v1.2.3</code></td>
<td><code>-</code></td>
<td>✅ Works</td>
<td>✅ Works</td>
</tr>
<tr>
<td><code>v2.0.0-rc.1</code></td>
<td><code>v2.0.0-rc.1</code></td>
<td><code>-</code></td>
<td>✅ Works</td>
<td>✅ Works</td>
</tr>
<tr>
<td><code>v1.0.0+build.123</code></td>
<td><code>v1.0.0</code></td>
<td><code>build.123</code></td>
<td>✅ Compatible</td>
<td>✅ Compatible</td>
</tr>
<tr>
<td><code>v1.5.0-beta.2+metadata.789</code></td>
<td><code>v1.5.0-beta.2</code></td>
<td><code>metadata.789</code></td>
<td>✅ Compatible</td>
<td>✅ Compatible</td>
</tr>
</table>

### Using with npm

```bash
npm version ${{ steps.get_version.outputs.versionWithoutV }}
# Works with: 1.2.3, 2.0.0-rc.1, etc.
```

### Using with .NET

```bash
# Update AssemblyVersion (numbers only)
dotnet build -p:AssemblyVersion=${{ steps.get_version.outputs.major }}.${{ steps.get_version.outputs.minor }}.${{ steps.get_version.outputs.patch }}

# Update PackageVersion (supports prerelease)
dotnet build -p:PackageVersion=${{ steps.get_version.outputs.versionWithoutV }}
```

## 🚢 Create Release Action

A second action in this repository, for any repository that wants to cut its own tagged
releases the same way this one does. Unlike `get-version`, it does not read the git history --
it validates a version you supply, creates the tag and a GitHub Release for it via the GitHub
API, and (unless the version is a prerelease) moves a floating major tag like `v1` to match. No
checkout, no `fetch-depth: 0`, no `git push` -- one API-backed action instead of hand-rolled
shell in every consuming repository's own release workflow.

### Inputs

| Input | Default | Description |
|---|---|---|
| `version` | *(required)* | e.g. `1.2.3` or `v1.2.3`. Prerelease/build metadata suffixes accepted. |
| `dry-run` | `false` | Validate only -- no tag or release will be created. |
| `update-major-tag` | `true` | Also force-move the floating `vMAJOR` tag. Skipped automatically for a prerelease version, regardless of this input. |
| `github-token` | `${{ github.token }}` | Needs `contents: write` on the target repository. |

### Outputs

| Output | Description |
|---|---|
| `tag` | The normalized release tag that was created, e.g. `v1.2.3`. |
| `major-tag` | The floating major tag that was moved, e.g. `v1`. Empty if `update-major-tag` was false, the version is a prerelease, or `dry-run` was set. |
| `created` | `"true"` if a tag/release was actually created; `"false"` on a dry run. |

### Example usage

```yaml
on:
  workflow_dispatch:
    inputs:
      version:
        required: true
        type: string
      dry_run:
        default: false
        type: boolean

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: easylife365/get-version-action/create-release@v1
        with:
          version: ${{ inputs.version }}
          dry-run: ${{ inputs.dry_run }}
```

### Tag protection note

If your repository uses tag protection rules or rulesets, ensure the identity behind
`github-token` is allowed to create and force-update tags. Otherwise the action fails when it
tries to write them.

**`update-major-tag` defaults to `true`.** Every non-prerelease call force-moves the floating
major tag by default -- that's the point of a floating tag, but it means this is a default-on
destructive, history-rewriting operation, not just an available one. Grant `github-token` only
`contents: write` on the target repository (the minimum this action needs), never a broader
credential, and set `update-major-tag: false` explicitly for any caller that wants to publish a
version without moving what every other consumer of the major tag receives.

## 🛠️ Maintainer release runbook

This repository releases itself using its own **Create Release** action (see above) -- one
implementation, used both by this repo's own releases and by anything else that calls the action.

Use **Actions → Release** and run the workflow with:

- `version`: semantic version value like `1.1.2` or `v1.1.2`
- `dry_run` (optional): `true` to validate inputs without creating a tag or release

The `validate` job builds, lints, tests, and packages both actions in this repository first
(`get-version` and `create-release`), then the `create-release` job calls the freshly-built
local action to tag, release, and move `v1` in one step.
