# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `prepare-dist` command that assembles the `dist` directory to publish. It writes a trimmed `package.json`, copies the files you include, and replaces `dist` only when every step succeeded.
- `.prepare-distrc.json` config file with the optional `clean`, `removedFields`, and `include` keys.
- `prepare-dist.schema.json`, available as `@dnd-mapp/package-builder/prepare-dist.schema.json`. Editors use it to check the config file.
- Check that every file in the `exports` and `bin` fields exists before `dist` is replaced.
- Public API from the package root. It exports `loadConfig`, `createPublishManifest`, `writeManifest`, `verifyExports`, `collectExportTargets`, `collectBinTargets`, and `CONFIG_FILE`.
- Bundled type declarations in `types.d.ts`, including the `Config` and `Manifest` types.

[Unreleased]: https://github.com/dnd-mapp/package-builder/commits/main
