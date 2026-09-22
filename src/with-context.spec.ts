import { describe, expect, it } from 'vitest';
import { withContext } from './with-context.ts';

describe('withContext', () => {
    it('should return the value of a synchronous function', async () => {
        await expect(withContext('failed', () => 42)).resolves.toBe(42);
    });

    it('should resolve to the value of an asynchronous function', async () => {
        await expect(withContext('failed', () => Promise.resolve('done'))).resolves.toBe('done');
    });

    it('should rethrow a synchronous failure with the message and the original cause', async () => {
        const cause = new Error('boom');

        await expect(
            withContext('Something failed', () => {
                throw cause;
            }),
        ).rejects.toMatchObject({ message: 'Something failed', cause });
    });

    it('should rethrow a rejection with the message and the original cause', async () => {
        const cause = new Error('rejected');

        await expect(withContext('Something failed', () => Promise.reject(cause))).rejects.toMatchObject({
            message: 'Something failed',
            cause,
        });
    });
});
