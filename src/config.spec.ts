import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fsMock } from '../testing/fs-promises.ts';
import { loadConfig } from './config.ts';
import { DEFAULT_INCLUDED, DEFAULT_REMOVED_FIELDS, rootDir } from './constants.ts';

function respondWithConfig(content: string) {
    fsMock.respond('readFile', () => content);
}

function fileNotFound() {
    return Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
}

describe('loadConfig', () => {
    it('should read ".prepare-distrc.json" from the repository root', async () => {
        respondWithConfig('{}');

        await loadConfig();

        expect(fsMock.entries).toEqual([
            { operation: 'readFile', path: join(rootDir, '.prepare-distrc.json'), options: 'utf-8' },
        ]);
    });

    it('should use the defaults when the file does not exist', async () => {
        fsMock.fail('readFile', fileNotFound());

        await expect(loadConfig()).resolves.toEqual({
            clean: true,
            removedFields: DEFAULT_REMOVED_FIELDS,
            include: DEFAULT_INCLUDED,
        });
    });

    it('should use the defaults for every key that the file does not set', async () => {
        respondWithConfig('{ "clean": false }');

        await expect(loadConfig()).resolves.toEqual({
            clean: false,
            removedFields: DEFAULT_REMOVED_FIELDS,
            include: DEFAULT_INCLUDED,
        });
    });

    it('should replace the default lists with the lists of the file', async () => {
        respondWithConfig('{ "removedFields": ["scripts"], "include": ["README.md"] }');

        await expect(loadConfig()).resolves.toEqual({
            clean: true,
            removedFields: ['scripts'],
            include: ['README.md'],
        });
    });

    it('should fail when the file cannot be read', async () => {
        const cause = Object.assign(new Error('EACCES'), { code: 'EACCES' });
        fsMock.fail('readFile', cause);

        await expect(loadConfig()).rejects.toMatchObject({
            message: 'Failed to read ".prepare-distrc.json"',
            cause,
        });
    });

    it('should fail when the file is not valid JSON', async () => {
        respondWithConfig('{ "clean": ');

        await expect(loadConfig()).rejects.toMatchObject({
            message: 'Failed to parse ".prepare-distrc.json"',
            cause: expect.any(SyntaxError) as unknown,
        });
    });

    it('should accept the "$schema" key', async () => {
        respondWithConfig('{ "$schema": "./prepare-dist.schema.json" }');

        await expect(loadConfig()).resolves.toMatchObject({ clean: true });
    });

    it.each([
        ['[]', 'the file must contain an object'],
        ['null', 'the file must contain an object'],
        ['{ "clear": true }', 'unknown key "clear"'],
        ['{ "clean": "yes" }', '"clean" must be a boolean'],
        ['{ "removedFields": "scripts" }', '"removedFields" must be an array of strings'],
        ['{ "removedFields": [1] }', '"removedFields" must be an array of strings'],
        ['{ "include": "README.md" }', '"include" must be an array of strings'],
        ['{ "include": [null] }', '"include" must be an array of strings'],
    ])('should reject %s', async (content, reason) => {
        respondWithConfig(content);

        await expect(loadConfig()).rejects.toThrow(`Invalid ".prepare-distrc.json": ${reason}`);
    });
});
