#!/usr/bin/env node
/**
 * Prepares the `dist` directory that gets published to npm.
 *
 * Copies the files that consumers need and writes a trimmed `package.json` next to them. It runs from the
 * `prepublishOnly` script, and `publishConfig.directory` points the publish at `dist`.
 *
 * The files are first assembled in a staging directory. It replaces `dist` only when every step succeeded, so a
 * failed run never leaves a partial `dist` behind.
 */
import { rm } from 'node:fs/promises';
import { loadConfig } from './config.ts';
import { distDir, stagingDir } from './constants.ts';
import { copyDist, copyIncluded, replaceDist, resetDirectory } from './directories.ts';
import { verifyExports } from './exports.ts';
import { createPublishManifest, writeManifest } from './manifest.ts';

/**
 * Builds the `dist` directory.
 *
 * Assembles the files in the staging directory first and verifies the `exports` field against them. If a step
 * fails, the staging directory is removed and the existing `dist` is left as it was. The error of the failed step is
 * always the one that gets thrown, even when the cleanup fails as well.
 *
 * @throws {Error} When any step fails.
 */
async function prepareDist(): Promise<void> {
    console.log('Preparing dist...');
    const config = await loadConfig();
    const manifest = await createPublishManifest(config.removedFields);
    console.log(`Read package.json for "${manifest.name}@${manifest.version}"`);

    console.log(`Resetting staging directory "${stagingDir}"`);
    await resetDirectory(stagingDir);

    try {
        if (!config.clean) {
            console.log(`Copying "${distDir}" into staging`);
            await copyDist(stagingDir);
        }

        console.log('Writing "package.json"');
        await writeManifest(stagingDir, manifest);

        console.log(`Copying ${config.include.length} entries`);
        await copyIncluded(stagingDir, config.include);

        console.log('Verifying exports');
        await verifyExports(stagingDir, manifest);

        console.log(`Replacing "${distDir}"`);
        await replaceDist();
    } catch (error) {
        console.error(`Preparing dist failed, removing "${stagingDir}"`);

        await rm(stagingDir, { recursive: true, force: true }).catch((cleanupError: Error) => {
            console.warn(`Could not remove "${stagingDir}": ${cleanupError.message}`);
        });
        throw error;
    }

    console.log('Prepared dist');
}

await prepareDist();
