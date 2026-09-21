import { basename, join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { consoleMock } from '../testing/console.ts';
import { fsMock } from '../testing/fs-promises.ts';
import { DEFAULT_INCLUDED, distDir, stagingDir } from './constants.ts';

let runs = 0;

/**
 * The script runs as soon as it is imported, so every test imports it again under a new query string. Its
 * dependencies stay cached, which keeps the shared mocks in place.
 */
async function runScript() {
    await import(/* @vite-ignore */ `./prepare-dist.ts?run=${++runs}`);
}

const manifest = {
    name: 'package',
    version: '1.0.0',
    scripts: {},
    exports: { './base': './configs/base.yaml' },
    publishConfig: { directory: 'dist' },
};

/** Serves the manifest and, unless it is `undefined`, the config file. Without a config file, reading it fails. */
function respondToReads(config: object | undefined) {
    fsMock.respond('readFile', ({ path }) => {
        if (basename(path) === 'package.json') return JSON.stringify(manifest);
        if (config) return JSON.stringify(config);

        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });
}

describe('prepare-dist', () => {
    beforeEach(() => {
        respondToReads({});
    });

    it('should assemble the package in the staging directory and replace dist with it', async () => {
        await runScript();

        const published = {
            name: 'package',
            version: '1.0.0',
            exports: { './base': './configs/base.yaml' },
            publishConfig: {},
        };

        expect(fsMock.entries).toContainEqual({ operation: 'mkdir', path: stagingDir, options: { recursive: true } });
        expect(fsMock.entries).toContainEqual({
            operation: 'writeFile',
            path: join(stagingDir, 'package.json'),
            data: `${JSON.stringify(published, null, 2)}\n`,
        });
        expect(fsMock.entriesOf('cp')).toHaveLength(DEFAULT_INCLUDED.length);
        expect(fsMock.entries).toContainEqual({ operation: 'access', path: join(stagingDir, './configs/base.yaml') });
        expect(fsMock.entries.at(-1)).toEqual({ operation: 'rename', source: stagingDir, destination: distDir });
        expect(consoleMock.entries).toContainEqual({ severity: 'log', message: 'Prepared dist' });
        expect(consoleMock.entriesOf('error')).toEqual([]);
    });

    it('should fail before touching the staging directory when package.json cannot be read', async () => {
        fsMock.respond('readFile', ({ path }) => {
            throw Object.assign(new Error('ENOENT'), { code: basename(path) === 'package.json' ? 'EACCES' : 'ENOENT' });
        });

        await expect(runScript()).rejects.toThrow('Failed to read "package.json"');

        expect(fsMock.entries.map((entry) => entry.operation)).toEqual(['readFile', 'readFile']);
    });

    it('should remove the staging directory and keep dist when a step fails', async () => {
        fsMock.fail('access', new Error('ENOENT'));

        await expect(runScript()).rejects.toThrow(
            'The exports and bin fields point to files that are not published: ./configs/base.yaml',
        );

        expect(fsMock.entriesOf('rename')).toEqual([]);
        expect(fsMock.entriesOf('rm').map((entry) => entry.path)).not.toContain(distDir);
        expect(fsMock.entries.at(-1)).toEqual({
            operation: 'rm',
            path: stagingDir,
            options: { recursive: true, force: true },
        });
        expect(consoleMock.entries).toContainEqual({
            severity: 'error',
            message: `Preparing dist failed, removing "${stagingDir}"`,
        });
    });

    it('should throw the error of the failed step when the cleanup fails as well', async () => {
        fsMock.fail('cp', new Error('ENOENT'));
        fsMock.fail('rm', new Error('EBUSY'), () => fsMock.entriesOf('cp').length > 0);

        await expect(runScript()).rejects.toBeInstanceOf(AggregateError);

        expect(consoleMock.entries).toContainEqual({
            severity: 'warn',
            message: `Could not remove "${stagingDir}": EBUSY`,
        });
    });

    it('should leave out the fields that the config lists as removed', async () => {
        respondToReads({ removedFields: ['version', 'publishConfig'] });

        await runScript();

        const published = { name: 'package', scripts: {}, exports: { './base': './configs/base.yaml' } };

        expect(fsMock.entries).toContainEqual({
            operation: 'writeFile',
            path: join(stagingDir, 'package.json'),
            data: `${JSON.stringify(published, null, 2)}
`,
        });
    });

    it('should copy only the entries that the config includes', async () => {
        respondToReads({ include: ['README.md', 'docs'] });

        await runScript();

        expect(fsMock.entriesOf('cp').map((entry) => entry.destination)).toEqual([
            join(stagingDir, 'README.md'),
            join(stagingDir, 'docs'),
        ]);
    });

    describe('when the config keeps dist', () => {
        /*
         * Staging is seeded with a copy of dist, and only then does the script write into it. That keeps the build
         * output and the all-or-nothing behavior: dist is replaced by staging only after every step succeeded.
         */
        beforeEach(() => {
            respondToReads({ clean: false });
        });

        it('should start the staging directory from a copy of dist', async () => {
            await runScript();

            const operations = fsMock.entries.map((entry) => entry.operation);
            const seed = fsMock.entries.findIndex(
                (entry) => entry.operation === 'cp' && entry.source === distDir && entry.destination === stagingDir,
            );

            expect(fsMock.entries[seed]).toEqual({
                operation: 'cp',
                source: distDir,
                destination: stagingDir,
                options: { recursive: true },
            });
            expect(seed).toBeLessThan(operations.indexOf('writeFile'));
            expect(fsMock.entries.at(-1)).toEqual({ operation: 'rename', source: stagingDir, destination: distDir });
        });

        it('should start empty when dist does not exist yet', async () => {
            fsMock.fail(
                'cp',
                Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
                ({ source }) => source === distDir,
            );

            await runScript();

            expect(fsMock.entries.at(-1)).toEqual({ operation: 'rename', source: stagingDir, destination: distDir });
        });

        it('should keep dist and remove staging when dist cannot be copied', async () => {
            fsMock.fail('cp', new Error('EACCES'), ({ source }) => source === distDir);

            await expect(runScript()).rejects.toMatchObject({ message: `Failed to copy "${distDir}"` });

            expect(fsMock.entriesOf('rename')).toEqual([]);
            expect(fsMock.entriesOf('rm').map((entry) => entry.path)).not.toContain(distDir);
        });
    });

    it('should not copy dist into the staging directory by default', async () => {
        await runScript();

        expect(fsMock.entriesOf('cp').filter((entry) => entry.source === distDir)).toEqual([]);
    });
});
