import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fsMock } from '../testing/fs-promises.ts';
import { DEFAULT_REMOVED_FIELDS, rootDir } from './constants.ts';
import { createPublishManifest, writeManifest } from './manifest.ts';

describe('manifest', () => {
    describe('createPublishManifest', () => {
        it('should read the package.json of the repository', async () => {
            fsMock.respond('readFile', () => '{"name":"package","version":"1.0.0"}');

            await createPublishManifest(DEFAULT_REMOVED_FIELDS);

            expect(fsMock.entries).toEqual([
                { operation: 'readFile', path: join(rootDir, 'package.json'), options: 'utf-8' },
            ]);
        });

        it('should remove the given fields and the publish directory', async () => {
            fsMock.respond('readFile', () =>
                JSON.stringify({
                    $schema: 'schema',
                    name: 'package',
                    version: '1.0.0',
                    scripts: { test: 'vitest' },
                    devDependencies: { vitest: '1' },
                    devEngines: { runtime: 'node' },
                    publishConfig: { access: 'public', directory: 'dist' },
                    license: 'MIT',
                }),
            );

            await expect(createPublishManifest(DEFAULT_REMOVED_FIELDS)).resolves.toEqual({
                name: 'package',
                version: '1.0.0',
                publishConfig: { access: 'public' },
                license: 'MIT',
            });
        });

        it('should accept a manifest without publishConfig', async () => {
            fsMock.respond('readFile', () => '{"name":"package","version":"1.0.0"}');

            await expect(createPublishManifest(DEFAULT_REMOVED_FIELDS)).resolves.toEqual({
                name: 'package',
                version: '1.0.0',
            });
        });

        it('should fail when package.json cannot be read', async () => {
            const cause = new Error('ENOENT');
            fsMock.fail('readFile', cause);

            await expect(createPublishManifest(DEFAULT_REMOVED_FIELDS)).rejects.toMatchObject({
                message: 'Failed to read "package.json"',
                cause,
            });
        });

        it('should fail when package.json cannot be parsed', async () => {
            fsMock.respond('readFile', () => 'not json');

            await expect(createPublishManifest(DEFAULT_REMOVED_FIELDS)).rejects.toMatchObject({
                message: 'Failed to parse "package.json"',
                cause: expect.any(SyntaxError),
            });
        });
    });

    describe('writeManifest', () => {
        const directory = join('some', 'dir');
        const manifest = { name: 'package', version: '1.0.0' };

        it('should write the manifest as formatted JSON with a trailing newline', async () => {
            await writeManifest(directory, manifest);

            expect(fsMock.entries).toEqual([
                {
                    operation: 'writeFile',
                    path: join(directory, 'package.json'),
                    data: `${JSON.stringify(manifest, null, 2)}\n`,
                },
            ]);
        });

        it('should fail when the file cannot be written', async () => {
            const cause = new Error('EACCES');
            fsMock.fail('writeFile', cause);

            await expect(writeManifest(directory, manifest)).rejects.toMatchObject({
                message: `Failed to write "package.json" to "${directory}"`,
                cause,
            });
        });
    });
});
