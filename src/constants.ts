import { join } from 'node:path';

/** The root directory of the repository. */
export const rootDir = join(import.meta.dirname, '..');

/** The directory that gets published. It is replaced on every successful run. */
export const distDir = join(rootDir, 'dist');

/** The directory in which `dist` is assembled before it replaces the current one. */
export const stagingDir = join(rootDir, '.tmp');

/** Fields of `package.json` that are left out of the published manifest, unless the config says otherwise. */
export const DEFAULT_REMOVED_FIELDS = ['$schema', 'scripts', 'devDependencies', 'devEngines'];

/** Files and directories, relative to the repository root, that are copied into `dist`, unless the config says otherwise. */
export const DEFAULT_INCLUDED = ['configs', 'CHANGELOG.md', 'README.md', 'LICENSE'];
