import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { consoleMock } from '../testing/console.ts';
import { fsMock } from '../testing/fs-promises.ts';
import { collectExportTargets, verifyExports } from './exports.ts';
import type { Manifest } from './manifest.ts';

describe('exports', () => {
    describe('collectExportTargets', () => {
        it('should return a relative string target', () => {
            expect(collectExportTargets('./configs/base.yaml')).toEqual(['./configs/base.yaml']);
        });

        it('should skip targets that are not relative paths', () => {
            expect(collectExportTargets('some-package')).toEqual([]);
        });

        it('should skip targets that contain a pattern', () => {
            expect(collectExportTargets('./configs/*.yaml')).toEqual([]);
        });

        it('should collect targets from the conditions form', () => {
            expect(collectExportTargets({ import: './a.js', require: './b.cjs' })).toEqual(['./a.js', './b.cjs']);
        });

        it('should collect targets from nested conditions and arrays', () => {
            const exportsField = { '.': { types: './index.d.ts', default: ['./index.js', 'fallback'] } };

            expect(collectExportTargets(exportsField)).toEqual(['./index.d.ts', './index.js']);
        });

        it.each([undefined, null, 42, true])('should return nothing for %s', (value) => {
            expect(collectExportTargets(value)).toEqual([]);
        });
    });

    describe('verifyExports', () => {
        const directory = join('some', 'dir');

        function createManifest(exportsField: unknown): Manifest {
            return { name: 'package', version: '1.0.0', exports: exportsField };
        }

        it('should resolve when every target exists', async () => {
            await expect(
                verifyExports(directory, createManifest({ './a': './a.yaml', './b': './b.yaml' })),
            ).resolves.toBeUndefined();

            expect(fsMock.entriesOf('access')).toEqual([
                { operation: 'access', path: join(directory, './a.yaml') },
                { operation: 'access', path: join(directory, './b.yaml') },
            ]);
            expect(consoleMock.entries).toContainEqual({
                severity: 'log',
                message: '  Verified 2 export target(s)',
            });
        });

        it('should check a target that is used more than once only once', async () => {
            await verifyExports(directory, createManifest({ import: './a.js', default: './a.js' }));

            expect(fsMock.entriesOf('access')).toHaveLength(1);
        });

        it('should report every missing target', async () => {
            fsMock.fail('access', new Error('ENOENT'), ({ path }) => !path.endsWith('exists.yaml'));

            await expect(
                verifyExports(directory, createManifest(['./exists.yaml', './missing-1.yaml', './missing-2.yaml'])),
            ).rejects.toThrow(
                'The exports field points to files that are not published: ./missing-1.yaml, ./missing-2.yaml',
            );
        });

        it('should resolve when the manifest has no exports', async () => {
            await expect(verifyExports(directory, createManifest(undefined))).resolves.toBeUndefined();

            expect(fsMock.entriesOf('access')).toEqual([]);
        });
    });
});
