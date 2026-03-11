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