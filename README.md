## 📦 Get Version Action

A GitHub Action that extracts and parses the **latest Git tag** using [Semantic Versioning (SemVer)](https://semver.org/), with optional automatic patch bumping based on the number of commits since the last tag.

This action queries real Git tags and sorts them semantically. It works consistently across push, release, and workflow\_dispatch triggers — regardless of the event type or branch layout.

## 🚀 Outputs

### `version`

The latest Git tag that matches a SemVer pattern, e.g. `v1.2.7`.
If no valid tag is found, this defaults to `v0.0.0`.

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