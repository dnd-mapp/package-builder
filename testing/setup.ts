import { beforeEach, vi } from 'vitest';
import { consoleMock } from './console.ts';
import { fsMock } from './fs-promises.ts';

vi.mock('node:fs/promises', () => import('./fs-promises.ts'));

beforeEach(() => {
    fsMock.reset();
    consoleMock.capture();
});
