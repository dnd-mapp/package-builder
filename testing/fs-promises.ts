import type { PathLike } from 'node:fs';
import type * as FsPromises from 'node:fs/promises';

/** A call to a function of `node:fs/promises`, recorded together with the operation that was performed. */
export type FsEntry =
    | { operation: 'access'; path: string }
    | { operation: 'cp'; source: string; destination: string; options: unknown }
    | { operation: 'mkdir'; path: string; options: unknown }
    | { operation: 'readFile'; path: string; options: unknown }
    | { operation: 'rename'; source: string; destination: string }
    | { operation: 'rm'; path: string; options: unknown }
    | { operation: 'writeFile'; path: string; data: string };

export type FsOperation = FsEntry['operation'];

/** Decides the outcome of an operation. It returns the resolved value, or throws to make the operation reject. */
type Handler<Operation extends FsOperation> = (entry: Extract<FsEntry, { operation: Operation }>) => unknown;

const handlers: { [Operation in FsOperation]?: Handler<Operation> } = {};

/**
 * The single mock of `node:fs/promises`.
 *
 * `setup.ts` registers this module in place of the real one, so the code under test and the specs share it. Every
 * operation succeeds and resolves to `undefined` unless a spec says otherwise. Assert on {@link entries}, for example
 * `expect(fsMock.entries).toContainEqual({ operation: 'rm', path: 'dist', options: { recursive: true } })`.
 */
export const fsMock = {
    /** Every operation that was performed since the test started, in the order they were performed. */
    entries: [] as FsEntry[],

    /** The entries of the given operation. */
    entriesOf<Operation extends FsOperation>(operation: Operation): Extract<FsEntry, { operation: Operation }>[] {
        return fsMock.entries.filter(
            (entry): entry is Extract<FsEntry, { operation: Operation }> => entry.operation === operation,
        );
    },

    /** Decides the outcome of every call to the given operation. It replaces an earlier handler. */
    respond<Operation extends FsOperation>(operation: Operation, handler: Handler<Operation>): void {
        handlers[operation] = handler as never;
    },

    /** Makes the given operation reject with the error, for every call or only for the calls that match. */
    fail<Operation extends FsOperation>(
        operation: Operation,
        error: Error,
        matches: Handler<Operation> = () => true,
    ): void {
        fsMock.respond(operation, (entry) => {
            if (matches(entry)) {
                throw error;
            }
        });
    },

    /** Empties {@link entries} and restores the default outcome of every operation. */
    reset(): void {
        fsMock.entries = [];

        for (const operation of Object.keys(handlers) as FsOperation[]) {
            delete handlers[operation];
        }
    },
};

function perform(entry: FsEntry): Promise<unknown> {
    fsMock.entries.push(entry);
    const handler = handlers[entry.operation] as Handler<FsOperation> | undefined;

    // The executor turns a handler that throws into a rejection, like the real functions do.
    return new Promise((resolve) => resolve(handler?.(entry)));
}

/** Records the path of a call. The code under test passes paths, so the mock does not support file handles. */
function pathOf(path: PathLike | FsPromises.FileHandle): string {
    if (typeof path === 'string' || path instanceof URL || path instanceof Uint8Array) {
        return String(path);
    }
    throw new TypeError('The fs mock does not support file handles');
}

/** Records the data of a write. The code under test writes strings, so the mock does not support other data. */
function dataOf(data: Parameters<typeof FsPromises.writeFile>[1]): string {
    if (typeof data === 'string') {
        return data;
    }
    throw new TypeError('The fs mock only supports string data');
}

export const access = ((path) => perform({ operation: 'access', path: String(path) })) as typeof FsPromises.access;

export const cp = ((source, destination, options) =>
    perform({
        operation: 'cp',
        source: String(source),
        destination: String(destination),
        options,
    })) as typeof FsPromises.cp;

export const mkdir = ((path, options) =>
    perform({ operation: 'mkdir', path: String(path), options })) as typeof FsPromises.mkdir;

export const readFile = ((path, options) =>
    perform({ operation: 'readFile', path: pathOf(path), options })) as typeof FsPromises.readFile;

export const rename = ((source, destination) =>
    perform({
        operation: 'rename',
        source: String(source),
        destination: String(destination),
    })) as typeof FsPromises.rename;

export const rm = ((path, options) =>
    perform({ operation: 'rm', path: String(path), options })) as typeof FsPromises.rm;

export const writeFile = ((path, data) =>
    perform({ operation: 'writeFile', path: pathOf(path), data: dataOf(data) })) as typeof FsPromises.writeFile;
