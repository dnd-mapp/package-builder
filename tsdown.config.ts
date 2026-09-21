import { defineConfig } from 'tsdown';

const shared = {
    fixedExtension: false,
    format: 'esm',
    outDir: 'dist',
    platform: 'node',
    target: 'es2024',
    tsconfig: 'tsconfig.build.json',
} as const;

export default defineConfig([
    {
        ...shared,
        clean: true,
        dts: false,
        entry: { 'index': 'src/index.ts', 'prepare-dist': 'src/prepare-dist.ts' },
    },
    {
        ...shared,
        clean: false,
        dts: { emitDtsOnly: true },
        entry: { types: 'src/index.ts' },
    },
]);
