import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(
	resolve(process.cwd(), "prisma/schema.prisma"),
	"utf8",
);

describe("Prisma client generation", () => {
	it("writes the generated client to the root pnpm runtime location", () => {
		expect(schema).toMatch(
			/output\s*=\s*"\.\.\/node_modules\/\.prisma\/client"/u,
		);
	});

	it("defines PersonalCategory in the Prisma schema", () => {
		expect(schema).toContain("model PersonalCategory");
		expect(schema).toContain("color          String");
		expect(schema).toContain("isDefault      Boolean");
	});
});
