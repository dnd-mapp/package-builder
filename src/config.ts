import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_INCLUDED, DEFAULT_REMOVED_FIELDS, rootDir } from './constants.ts';
import { withContext } from './with-context.ts';

/** The name of the config file, relative to the repository root. */
export const CONFIG_FILE = '.prepare-distrc.json';

/** The settings of the script, with every default applied. */
export interface Config {
    /** Whether the existing `dist` is left out of the new one. */
    clean: boolean;
    /** Fields of `package.json` that are left out of the published manifest. */
    removedFields: string[];
    /** Files and directories, relative to the repository root, that are copied into `dist`. */
    include: string[];
}

const KEYS = ['$schema', 'clean', 'removedFields', 'include'];

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function invalid(reason: string): Error {
    return new Error(`Invalid "${CONFIG_FILE}": ${reason}`);
}

/**
 * Checks the parsed content of the config file and applies the defaults.
 *
 * @throws {Error} When the content is not an object, has an unknown key, or has a value of the wrong type.
 */
function resolve(parsed: unknown): Config {
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw invalid('the file must contain an object');
    }
    const unknownKey = Object.keys(parsed).find((key) => !KEYS.includes(key));

    if (unknownKey !== undefined) {
        throw invalid(`unknown key "${unknownKey}"`);
    }
    const {
        clean = true,
        removedFields = DEFAULT_REMOVED_FIELDS,
        include = DEFAULT_INCLUDED,
    } = parsed as Record<string, unknown>;

    if (typeof clean !== 'boolean') {
        throw invalid('"clean" must be a boolean');
    }
    if (!isStringArray(removedFields)) {
        throw invalid('"removedFields" must be an array of strings');
    }
    if (!isStringArray(include)) {
        throw invalid('"include" must be an array of strings');
    }

    return { clean, removedFields, include };
}

/**
 * Reads the config file from the repository root.
 *
 * @returns The settings, with the defaults for everything the file does not set.
 * @throws {Error} When the file cannot be read or parsed, or its content is invalid.
 */
export async function loadConfig(): Promise<Config> {
    let content = '{}';

    try {
        content = await readFile(join(rootDir, CONFIG_FILE), 'utf-8');
    } catch (error) {
        // The file is optional.
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw new Error(`Failed to read "${CONFIG_FILE}"`, { cause: error });
        }
    }

    return resolve(await withContext(`Failed to parse "${CONFIG_FILE}"`, () => JSON.parse(content)));
}
