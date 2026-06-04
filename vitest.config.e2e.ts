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
		root: "./",
		include: ["test/**/*.e2e-spec.ts"],
		// e2e tests boot the Nest app and hit a real DB; keep them serial.
		fileParallelism: false,
	},
});
