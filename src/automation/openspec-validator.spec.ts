import { describe, expect, it } from "vitest";
import { validateOpenSpecChange } from "../../scripts/validate-openspec";

describe("validateOpenSpecChange", () => {
	it("allows documentation-only changes without an OpenSpec change", () => {
		expect(
			validateOpenSpecChange(["docs/development-workflow.md"], []),
		).toEqual([]);
	});

	it("requires an active OpenSpec change for application changes", () => {
		expect(validateOpenSpecChange(["src/auth/auth.module.ts"], [])).toEqual([
			"Application or infrastructure changes require an active OpenSpec change.",
		]);
	});

	it("requires proposal, design, and tasks artifacts", () => {
		expect(
			validateOpenSpecChange(
				["prisma/schema.prisma"],
				["auth-registration/proposal.md"],
			),
		).toEqual([
			"OpenSpec change auth-registration is missing: design.md, tasks.md.",
		]);
	});

	it("allows a complete active OpenSpec change", () => {
		expect(
			validateOpenSpecChange(
				["package.json", "src/auth/auth.module.ts"],
				[
					"auth-registration/proposal.md",
					"auth-registration/design.md",
					"auth-registration/tasks.md",
				],
			),
		).toEqual([]);
	});
});
