import { join } from 'node:path';

/**
 * The root directory of the package to prepare.
 *
 * It is the directory the script runs from, not the directory of this file. That way the installed executable works
 * on the project of the consumer and not on its own files.
 */
export const rootDir = process.cwd();

/** The directory that gets published. It is replaced on every successful run. */
export const distDir = join(rootDir, 'dist');

/** The directory in which `dist` is assembled before it replaces the current one. */
export const stagingDir = join(rootDir, '.tmp');

/** Fields of `package.json` that are left out of the published manifest, unless the config says otherwise. */
export const DEFAULT_REMOVED_FIELDS = ['$schema', 'scripts', 'devDependencies', 'devEngines'];

/** Files and directories, relative to the repository root, that are copied into `dist`, unless the config says otherwise. */
export const DEFAULT_INCLUDED = ['configs', 'CHANGELOG.md', 'README.md', 'LICENSE'];
