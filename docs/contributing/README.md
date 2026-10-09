# Contributing to dnd-mapp/package-builder

This page adds the details of `dnd-mapp/package-builder` to the [shared contributing guide](https://github.com/dnd-mapp/.github/blob/main/CONTRIBUTING.md). Read that guide first.

This package prepares the `dist` directory that gets published to npm for all D&D Mapp projects. A mistake here can ship a broken package, so keep changes small and deliberate.

## Project layout

The sources live in `src`, and most modules have a `.spec.ts` file next to them.

| File                       | Purpose                                                         |
|:---------------------------|:----------------------------------------------------------------|
| `src/prepare-dist.ts`      | The executable behind the `prepare-dist` bin. It runs on import |
| `src/index.ts`             | The public entry. It re-exports what consumers can build on     |
| `src/config.ts`            | Reads and validates `.prepare-distrc.json`                      |
| `src/manifest.ts`          | Creates and writes the published `package.json`                 |
| `src/exports.ts`           | Checks that the files in `exports` and `bin` exist              |
| `src/directories.ts`       | Handles the staging directory and the replacement of `dist`     |
| `prepare-dist.schema.json` | The JSON schema for `.prepare-distrc.json`                      |

Import other files with the `.ts` extension. The bundler resolves it, and `tsc` accepts it because `allowImportingTsExtensions` is on.

## Changing the code

The command works on the directory that it runs from, so `rootDir` is `process.cwd()` and not the location of the source files. Keep it that way, because the installed bin must work on the project of the consumer.

The command must never leave a partial `dist` behind. Assemble everything in the staging directory first, and replace `dist` only after every step succeeded.

Export a function or type from `src/index.ts` only when you want consumers to depend on it. Anything exported there is part of the public API and follows Semantic Versioning.

When you add or change a config key, update these files in the same pull request.

- The validation in `src/config.ts` and its tests.
- The `prepare-dist.schema.json` file, so editors accept the new key.
- The "Configuration" section of the README.

## Building and testing

The `build` script bundles the package with [tsdown](https://tsdown.dev) into `dist`. It writes `index.js`, `types.d.ts`, and `prepare-dist.js`. The `prepublishOnly` script runs the build and then the command itself.

Tests use Vitest. They replace `node:fs/promises` and the console with the mocks in `testing`, so no test touches the real file system. Coverage must stay above the thresholds in `vitest.config.ts`. Use `pnpm test` to run the tests in watch mode with the Vitest UI.

## Checks

On top of the [shared checks](https://github.com/dnd-mapp/.github/blob/main/CONTRIBUTING.md#checks), CI runs `lint-ts`, `typecheck`, `test-ci`, and `build`. Run them yourself before you open a pull request.

```bash
pnpm run lint-ts
pnpm run typecheck
pnpm run test-ci
pnpm run build
```

The `lint-ts` script lints the code with ESLint.

## Changelog and versioning

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Record every notable change for consumers under `[Unreleased]` in `CHANGELOG.md`, using the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

Changing what ends up in the published package is a breaking change for consumers. That includes the default `include` list, the default `removedFields`, and the paths that the command checks. Say so in the changelog entry.

## Releasing

1. Run the [prepare release workflow](../../.github/workflows/prepare-release.yaml) on `main` with the part of the version to bump, for example `gh workflow run prepare-release.yaml -f bump=minor`. It opens the `chore: release X.Y.Z` pull request with auto-merge on.
2. Review and approve the pull request. Once it merges, the `tag` job of the [push workflow](../../.github/workflows/push-main.yaml) creates the annotated tag `vX.Y.Z` on the merge commit.
3. The [release workflow](../../.github/workflows/release.yaml) runs the CI checks, verifies the tag and the changelog, stages the package on npm, and creates the GitHub Release, which opens a discussion in the Announcements category.
4. Find the staged version with `pnpm stage list` and approve it with `pnpm stage approve <id>` and 2FA.

If the staged version is wrong, reject it with `pnpm stage reject <id>`. The same version cannot be staged again until then.
