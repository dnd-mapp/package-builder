import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { Manifest } from './manifest.ts';

/**
 * Collects the local file paths that an `exports` field points to.
 *
 * Handles the string, array, and conditions forms. Targets that are not relative paths, or that contain a `*`
 * pattern, cannot be checked for existence and are skipped.
 *
 * @param exportsField The value of the `exports` field, or a nested part of it.
 * @returns The relative paths, for example `./configs/base.yaml`.
 */
export function collectExportTargets(exportsField: unknown): string[] {
    if (typeof exportsField === 'string') {
        return exportsField.startsWith('./') && !exportsField.includes('*') ? [exportsField] : [];
    }
    if (exportsField !== null && typeof exportsField === 'object') {
        return Object.values(exportsField).flatMap(collectExportTargets);
    }
    return [];
}

/**
 * Checks that every file that the `exports` field points to exists in the given directory.
 *
 * Every target is checked, so a single run reports all the missing files.
 *
 * @param directory The directory that holds the package to verify.
 * @param manifest The manifest that is published with the package.
 * @throws {Error} When one or more targets of `exports` do not exist.
 */
export async function verifyExports(directory: string, manifest: Manifest): Promise<void> {
    const targets = [...new Set(collectExportTargets(manifest.exports))];
    const results = await Promise.all(
        targets.map((target) =>
            access(join(directory, target)).then(
                () => null,
                () => target,
            ),
        ),
    );
    const missing = results.filter((target) => target !== null);

    if (missing.length > 0) {
        throw new Error(`The exports field points to files that are not published: ${missing.join(', ')}`);
    }
    console.log(`  Verified ${targets.length} export target(s)`);
}
