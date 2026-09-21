import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { rootDir } from './constants.ts';
import { withContext } from './with-context.ts';

/** The parts of `package.json` that this script reads. Any other field is passed through untouched. */
export interface Manifest {
    name: string;
    version: string;
    exports?: unknown;
    publishConfig?: { directory?: string };
    [field: string]: unknown;
}

/**
 * Reads the manifest of the repository and strips what should not be published.
 *
 * Removes the given fields and `publishConfig.directory`.
 *
 * @param removedFields The fields to remove from the manifest.
 * @returns The manifest to write to `dist`.
 * @throws {Error} When `package.json` cannot be read or parsed.
 */
export async function createPublishManifest(removedFields: string[]): Promise<Manifest> {
    const content = await withContext('Failed to read "package.json"', () =>
        readFile(join(rootDir, 'package.json'), 'utf-8'),
    );
    const manifest = await withContext('Failed to parse "package.json"', () => JSON.parse(content) as Manifest);

    for (const field of removedFields) {
        delete manifest[field];
    }
    delete manifest.publishConfig?.directory;

    return manifest;
}

/**
 * Writes the manifest to `package.json` in the given directory.
 *
 * @param directory The directory to write to.
 * @param manifest The manifest to write.
 * @throws {Error} When the file cannot be written.
 */
export async function writeManifest(directory: string, manifest: Manifest): Promise<void> {
    await withContext(`Failed to write "package.json" to "${directory}"`, () =>
        writeFile(join(directory, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`),
    );
}
