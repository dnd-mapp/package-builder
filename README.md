# @dnd-mapp/package-builder

[![push main](https://github.com/dnd-mapp/package-builder/actions/workflows/push-main.yaml/badge.svg?branch=main)](https://github.com/dnd-mapp/package-builder/actions/workflows/push-main.yaml)
[![npm version](https://img.shields.io/npm/v/@dnd-mapp/package-builder)](https://www.npmjs.com/package/@dnd-mapp/package-builder)
[![license](https://img.shields.io/npm/l/@dnd-mapp/package-builder)](LICENSE)

Prepares the `dist` directory that gets published to npm, for all D&D Mapp projects.

The tool writes a trimmed `package.json` next to your build output, copies the files that consumers need, and checks that the `exports` and `bin` fields point to files that exist.

## Requirements

- Node.js 24.21 or a later 24.x release, matching the `engines` field.
- A package that publishes from a `dist` directory, with `publishConfig.directory` set to `dist`.

## Installation

```bash
pnpm add --save-dev @dnd-mapp/package-builder
```

## Usage

Build your package into `dist` first. Then run the `prepare-dist` command from the root of your project. The easiest way is to chain it in the `prepublishOnly` script.

```json
{
    "publishConfig": {
        "directory": "dist"
    },
    "scripts": {
        "build": "tsdown",
        "prepublishOnly": "pnpm build && prepare-dist"
    }
}
```

The command works on the package in the current working directory. It runs these steps:

1. Reads the config and your `package.json`.
2. Assembles the package in a staging directory, `.tmp`.
3. Writes a trimmed `package.json` and copies the files that you include.
4. Checks that every file in `exports` and `bin` exists in the staging directory.
5. Replaces `dist` with the staging directory.

If a step fails, the command removes the staging directory and leaves `dist` as it was, so a failed run never leaves a partial `dist` behind.

Add `.tmp` to your `.gitignore` file, because the staging directory is created in your project root.

### The published manifest

The `package.json` in `dist` is a copy of your own, without the fields that only matter during development. By default the command removes `$schema`, `scripts`, `devDependencies`, and `devEngines`. It also removes `publishConfig.directory`, so the published package does not point at a nested `dist` directory.

The `exports` and `bin` paths in your `package.json` are relative to `dist`, because that is the root of the published package. For example, use `./index.js` and not `./dist/index.js`.

## Configuration

Create `.prepare-distrc.json` in the root of your project to change what the command does. The file is optional. Without it, the command uses the defaults below.

```json
{
    "$schema": "./node_modules/@dnd-mapp/package-builder/prepare-dist.schema.json",
    "clean": false,
    "include": ["README.md", "LICENSE", "prepare-dist.schema.json"]
}
```

| Key             | Type       | Default                                                   | Description                                                                  |
|:----------------|:-----------|:----------------------------------------------------------|:-----------------------------------------------------------------------------|
| `clean`         | `boolean`  | `true`                                                    | Deletes the files already in `dist` when `true`, and keeps them when `false` |
| `removedFields` | `string[]` | `["$schema", "scripts", "devDependencies", "devEngines"]` | Fields of `package.json` that are left out of the published manifest         |
| `include`       | `string[]` | `["configs", "CHANGELOG.md", "README.md", "LICENSE"]`     | Files and directories, relative to the project root, to copy                 |

Every key is optional. A key that you leave out keeps its default. A list that you set replaces the default list, and it is not merged with it.

### Keeping the build output

With `clean` set to `true`, the command replaces `dist` and deletes the files that your build wrote there. Set `clean` to `false` to keep them. This is the setting to use when you build into `dist`.

In that case the command starts the staging directory from a copy of `dist`. It then writes the manifest and the included files over the copy. Files with the same path are overwritten. If `dist` does not exist yet, the command starts with an empty directory.

### Editor validation

The package ships a JSON schema that lets editors check `.prepare-distrc.json` while you type. Point the `$schema` key at the copy in `node_modules`, as in the example above.

The schema is also listed in the `exports` field. You can resolve it by package name, for example with `import.meta.resolve('@dnd-mapp/package-builder/prepare-dist.schema.json')`.

### Errors

The command stops before it touches `dist` when the config is not valid. It reports one of these errors:

- `Failed to read ".prepare-distrc.json"` when the file exists but cannot be read.
- `Failed to parse ".prepare-distrc.json"` when the file is not valid JSON.
- `Invalid ".prepare-distrc.json": ...` when the content is not an object, has an unknown key, or has a value of the wrong type.

It also fails with `The exports and bin fields point to files that are not published` when a target is missing from the staging directory. The message lists every missing file.

## Programmatic API

The package also exports the building blocks of the command. Importing the package does not run anything.

```js
import { loadConfig, createPublishManifest } from '@dnd-mapp/package-builder';

const config = await loadConfig();
const manifest = await createPublishManifest(config.removedFields);
```

| Export                  | Description                                                        |
|:------------------------|:-------------------------------------------------------------------|
| `CONFIG_FILE`           | The name of the config file, `.prepare-distrc.json`                |
| `loadConfig`            | Reads the config file and applies the defaults                     |
| `createPublishManifest` | Reads `package.json` and removes the fields that are not published |
| `writeManifest`         | Writes a manifest to `package.json` in a directory                 |
| `verifyExports`         | Checks that the files in `exports` and `bin` exist in a directory  |
| `collectExportTargets`  | Lists the local files that an `exports` field points to            |
| `collectBinTargets`     | Lists the local files that a `bin` field points to                 |

The `Config` and `Manifest` types are exported as well.

## Changelog

Notable changes for consumers of this package are listed in the [changelog](CHANGELOG.md).

## Contributing

Contributions are welcome. See the [contributing guide](CONTRIBUTING.md) for details.

## License

[MIT](LICENSE) © D&D Mapp
