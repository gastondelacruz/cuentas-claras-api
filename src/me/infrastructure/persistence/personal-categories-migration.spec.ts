import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
	resolve(
		process.cwd(),
		"prisma/migrations/20260710110000_repair_personal_categories/migration.sql",
	),
	"utf8",
);
const seed = readFileSync(resolve(process.cwd(), "prisma/seed.ts"), "utf8");

describe("personal category corrective migration", () => {
	it("repairs the live schema before provisioning defaults", () => {
		expect(migration).toContain('ADD COLUMN IF NOT EXISTS "color" TEXT');
		expect(migration).toContain(
			'ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN NOT NULL DEFAULT false',
		);
		expect(migration).toContain(
			'UPDATE "personal_categories"\nSET "color" = \'#64748B\'\nWHERE "color" IS NULL',
		);
		expect(migration).toContain('ALTER COLUMN "color" SET NOT NULL');
	});

	it("backfills every existing user with the complete default catalog", () => {
		expect(migration).toContain('INSERT INTO "personal_categories"');
		expect(migration).toContain('FROM "users"');
		expect(migration).toContain("gen_random_uuid()");
		expect(migration).toContain(
			'ON CONFLICT ("user_id", "type", "normalized_name") DO NOTHING',
		);
		for (const category of [
			["Salud", "expense", "Heart", "#EF4444"],
			["Mascotas", "expense", "PawPrint", "#A855F7"],
			["Viajes", "expense", "Plane", "#0EA5E9"],
			["Hogar", "expense", "House", "#475569"],
			["Salario", "income", "Banknote", "#22C55E"],
			["Freelance", "income", "BriefcaseBusiness", "#8B5CF6"],
			["Propiedades", "income", "Landmark", "#F97316"],
		]) {
			for (const value of category) {
				expect(migration).toContain(`'${value}'`);
			}
		}
	});

	it("repairs only default seed rows with exact catalog fields", () => {
		expect(seed).toContain("isDefault: true");
		expect(seed).toContain("name: category.name");
		expect(seed).toContain("icon: category.icon");
		expect(seed).toContain("color: category.color");
		expect(seed).toContain("isDefault: true");
		expect(seed).toContain("if (existing?.isDefault)");
		expect(seed).toContain("if (existing)");
	});
});
