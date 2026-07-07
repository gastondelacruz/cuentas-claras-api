import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: { tsconfigPaths: true },
	oxc: false,
	plugins: [
		swc.vite({
			module: { type: "es6" },
		}),
	],
	test: {
		globals: true,
		environment: "node",
		allowOnly: !process.env.CI,
		root: "./",
		setupFiles: ["test/setup-e2e.ts"],
		include: ["test/**/*.e2e-spec.ts"],
		hookTimeout: 60_000,
		testTimeout: 60_000,
		// e2e tests boot the Nest app and hit a real DB; keep them serial.
		fileParallelism: false,
	},
});
