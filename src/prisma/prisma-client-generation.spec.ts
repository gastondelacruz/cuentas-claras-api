import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(
	resolve(process.cwd(), "prisma/schema.prisma"),
	"utf8",
);

describe("Prisma client generation", () => {
	it("uses Prisma's package-managed client generation path", () => {
		expect(schema).not.toMatch(/output\s*=/u);
	});

	it("defines PersonalCategory in the Prisma schema", () => {
		expect(schema).toContain("model PersonalCategory");
		expect(schema).toContain("color          String");
		expect(schema).toContain("isDefault      Boolean");
	});
});
