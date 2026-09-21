/**
 * Runs a function and, when it throws or rejects, rethrows the failure as an error with a descriptive message.
 *
 * The original error is kept as the `cause`. The function may be synchronous or asynchronous.
 *
 * @param message The message of the error to throw on failure.
 * @param fn The function to run.
 * @returns The value that `fn` returned, or resolved to.
 * @throws {Error} When `fn` throws or rejects.
 */
export async function withContext<T>(message: string, fn: () => T): Promise<Awaited<T>> {
    try {
        return await fn();
    } catch (error) {
        throw new Error(message, { cause: error });
    }
}
