import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
	// Vite/Vitest 4 resolves tsconfig "paths" natively; no plugin needed.
	resolve: { tsconfigPaths: true },
	// Disable the default Oxc transform so SWC owns compilation. SWC emits the
	// decorator metadata that NestJS dependency injection requires; without it,
	// Test.createTestingModule fails to resolve providers.
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
		include: ["src/**/*.spec.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			reportsDirectory: "./coverage",
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.spec.ts", "src/main.ts", "src/**/*.module.ts"],
		},
	},
});
