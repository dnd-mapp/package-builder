import { format } from 'node:util';
import { vi } from 'vitest';

/** The severities of the console methods that the code under test writes to. */
export type Severity = 'error' | 'log' | 'warn';

/** A single message that was written to the console. */
export interface ConsoleEntry {
    severity: Severity;
    message: string;
}

const severities: Severity[] = ['error', 'log', 'warn'];

/**
 * Records what is written to the console, together with the severity it was written with.
 *
 * `setup.ts` starts the capture before every test, so nothing reaches the real console. Assert on {@link entries}, for
 * example `expect(consoleMock.entries).toContainEqual({ severity: 'warn', message: 'Careful' })`.
 */
export const consoleMock = {
    /** Every message that was written since the test started, in the order they were written. */
    entries: [] as ConsoleEntry[],

    /** The entries that were written with the given severity. */
    entriesOf(severity: Severity): ConsoleEntry[] {
        return consoleMock.entries.filter((entry) => entry.severity === severity);
    },

    /** Empties {@link entries} and starts recording the console methods again. */
    capture(): void {
        consoleMock.entries = [];

        for (const severity of severities) {
            vi.spyOn(console, severity).mockImplementation((...args: unknown[]) => {
                consoleMock.entries.push({ severity, message: format(...args) });
            });
        }
    },
};
