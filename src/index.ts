/**
 * Public entry point of the package.
 *
 * Only the pieces that consumers can build on are re-exported here. The directory helpers, the constants, and the
 * `prepare-dist` script stay internal, because the script runs on import.
 */
export { CONFIG_FILE, loadConfig, type Config } from './config.ts';
export { collectBinTargets, collectExportTargets, verifyExports } from './exports.ts';
export { createPublishManifest, writeManifest, type Manifest } from './manifest.ts';
