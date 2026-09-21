import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { consoleMock } from '../testing/console.ts';
import { fsMock } from '../testing/fs-promises.ts';
import { DEFAULT_INCLUDED, distDir, rootDir, stagingDir } from './constants.ts';
import { copyIncluded, replaceDist, resetDirectory } from './directories.ts';

describe('directories', () => {
    describe('resetDirectory', () => {
        it('should remove the directory and create it again', async () => {
            await resetDirectory('some-dir');

            expect(fsMock.entries).toEqual([
                { operation: 'rm', path: 'some-dir', options: { recursive: true, force: true } },
                { operation: 'mkdir', path: 'some-dir', options: { recursive: true } },
            ]);
        });

        it('should fail when the directory cannot be removed', async () => {
            const cause = new Error('EBUSY');
            fsMock.fail('rm', cause);

            await expect(resetDirectory('some-dir')).rejects.toMatchObject({
                message: 'Failed to remove "some-dir"',
                cause,
            });
            expect(fsMock.entriesOf('mkdir')).toEqual([]);
        });

        it('should fail when the directory cannot be created', async () => {
            const cause = new Error('EACCES');
            fsMock.fail('mkdir', cause);

            await expect(resetDirectory('some-dir')).rejects.toMatchObject({
                message: 'Failed to create "some-dir"',
                cause,
            });
        });
    });

    describe('copyIncluded', () => {
        const target = join('some', 'target');

        it('should copy every included entry into the directory', async () => {
            await copyIncluded(target, DEFAULT_INCLUDED);

            expect(fsMock.entriesOf('cp')).toHaveLength(DEFAULT_INCLUDED.length);

            for (const entry of DEFAULT_INCLUDED) {
                expect(fsMock.entries).toContainEqual({
                    operation: 'cp',
                    source: join(rootDir, entry),
                    destination: join(target, entry),
                    options: { recursive: true },
                });
                expect(consoleMock.entries).toContainEqual({ severity: 'log', message: `  Copied "${entry}"` });
            }
        });

        it('should attempt every entry and report all the failures', async () => {
            const failing = DEFAULT_INCLUDED.slice(0, 2);
            fsMock.fail('cp', new Error('ENOENT'), ({ source }) =>
                failing.some((entry) => source === join(rootDir, entry)),
            );

            const error = await copyIncluded(target, DEFAULT_INCLUDED).catch((caught: unknown) => caught);

            expect(fsMock.entriesOf('cp')).toHaveLength(DEFAULT_INCLUDED.length);
            expect(error).toBeInstanceOf(AggregateError);
            expect(error).toMatchObject({ message: `Failed to copy 2 of ${DEFAULT_INCLUDED.length} entries` });
            expect((error as AggregateError).errors.map((failure: Error) => failure.message)).toEqual(
                failing.map((entry) => `Failed to copy "${entry}"`),
            );
        });
    });

    describe('replaceDist', () => {
        it('should remove dist and move the staging directory in its place', async () => {
            await replaceDist();

            expect(fsMock.entries).toEqual([
                { operation: 'rm', path: distDir, options: { recursive: true, force: true } },
                { operation: 'rename', source: stagingDir, destination: distDir },
            ]);
        });

        it('should fail when dist cannot be removed', async () => {
            const cause = new Error('EBUSY');
            fsMock.fail('rm', cause);

            await expect(replaceDist()).rejects.toMatchObject({ message: `Failed to remove "${distDir}"`, cause });
            expect(fsMock.entriesOf('rename')).toEqual([]);
        });

        it('should fail when the staging directory cannot be moved', async () => {
            const cause = new Error('EPERM');
            fsMock.fail('rename', cause);

            await expect(replaceDist()).rejects.toMatchObject({
                message: `Failed to move "${stagingDir}" to "${distDir}"`,
                cause,
            });
        });
    });
});
