import { cp, mkdir, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { distDir, rootDir, stagingDir } from './constants.ts';
import { withContext } from './with-context.ts';

/**
 * Removes a directory and creates it again, so it is empty.
 *
 * @param directory The directory to reset.
 * @throws {Error} When the directory cannot be removed or created.
 */
export async function resetDirectory(directory: string): Promise<void> {
    await withContext(`Failed to remove "${directory}"`, () => rm(directory, { recursive: true, force: true }));
    await withContext(`Failed to create "${directory}"`, () => mkdir(directory, { recursive: true }));
}

/**
 * Copies the existing `dist` into the given directory, so the files in it are kept.
 *
 * Does nothing when `dist` does not exist yet.
 *
 * @param directory The directory to copy into.
 * @throws {Error} When `dist` exists but cannot be copied.
 */
export async function copyDist(directory: string): Promise<void> {
    await withContext(`Failed to copy "${distDir}"`, async () => {
        try {
            await cp(distDir, directory, { recursive: true });
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error;
            }
        }
    });
}

/**
 * Copies every included entry from the repository root into the given directory.
 *
 * The entries are independent of each other, so they are copied in parallel. Every entry is attempted, so a single
 * run reports all the entries that failed.
 *
 * @param directory The directory to copy into.
 * @param included The entries to copy, relative to the repository root.
 * @throws {AggregateError} When one or more entries cannot be copied. It holds one error for each failed entry.
 */
export async function copyIncluded(directory: string, included: string[]): Promise<void> {
    const results = await Promise.allSettled(
        included.map((entry) =>
            withContext(`Failed to copy "${entry}"`, async () => {
                await cp(join(rootDir, entry), join(directory, entry), { recursive: true });
                console.log(`  Copied "${entry}"`);
            }),
        ),
    );
    const failures = results.filter((result) => result.status === 'rejected').map((result) => result.reason as unknown);

    if (failures.length > 0) {
        throw new AggregateError(failures, `Failed to copy ${failures.length} of ${included.length} entries`);
    }
}

/**
 * Replaces the `dist` directory with the staging directory.
 *
 * @throws {Error} When `dist` cannot be removed or the staging directory cannot be moved.
 */
export async function replaceDist(): Promise<void> {
    await withContext(`Failed to remove "${distDir}"`, () => rm(distDir, { recursive: true, force: true }));
    await withContext(`Failed to move "${stagingDir}" to "${distDir}"`, () => rename(stagingDir, distDir));
}
