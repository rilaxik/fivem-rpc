import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.ts'],
	outDir: './dist',
	target: 'node16',
	platform: 'node',
	format: ['cjs'],
	splitting: false,
	sourcemap: false,
	clean: false,
	experimentalDts: true,
	noExternal: [/.*/],
})
