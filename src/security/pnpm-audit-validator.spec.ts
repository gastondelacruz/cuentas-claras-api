import { describe, expect, it } from "vitest";

import {
	validateAuditExecution,
	validateAuditReport,
} from "../../scripts/pnpm-audit-validator";

const advisoryId = "GHSA-92pp-h63x-v22m";
const allowedPath = "prisma>@prisma/dev>@hono/node-server";

function report(path = allowedPath, severity = "moderate") {
	return JSON.stringify({
		advisories: {
			"1116281": {
				github_advisory_id: advisoryId,
				severity,
				findings: [{ paths: [`.>${path}`] }],
			},
		},
	});
}

describe("pnpm audit validator", () => {
	it("allows only the approved advisory on its exact dependency path before expiry", () => {
		expect(
			validateAuditReport(report(), new Date("2026-08-02T12:00:00Z")),
		).toEqual({
			allowed: true,
			violations: [],
		});
	});

	it("rejects the approved advisory on a different dependency path", () => {
		const result = validateAuditReport(
			report("other>prisma>@prisma/dev>@hono/node-server"),
			new Date("2026-08-02T12:00:00Z"),
		);

		expect(result.allowed).toBe(false);
		expect(result.violations).toContain(
			`${advisoryId} has an unapproved path: other>prisma>@prisma/dev>@hono/node-server`,
		);
	});

	it("rejects the approved advisory after its expiry date", () => {
		const result = validateAuditReport(
			report(),
			new Date("2026-08-04T00:00:00Z"),
		);

		expect(result.allowed).toBe(false);
		expect(result.violations).toContain(
			`${advisoryId} exception expired on 2026-08-03`,
		);
	});

	it("rejects any unexpected moderate-or-higher advisory", () => {
		const unexpected = JSON.stringify({
			advisories: {
				"GHSA-unexpected": {
					severity: "high",
					findings: [{ paths: ["root>unexpected-package"] }],
				},
			},
		});

		const result = validateAuditReport(
			unexpected,
			new Date("2026-08-02T12:00:00Z"),
		);

		expect(result.allowed).toBe(false);
		expect(result.violations).toContain(
			"Unexpected high advisory GHSA-unexpected at root>unexpected-package",
		);
	});

	it("fails closed when pnpm returns malformed JSON", () => {
		const result = validateAuditReport(
			"not-json",
			new Date("2026-08-02T12:00:00Z"),
		);

		expect(result.allowed).toBe(false);
		expect(result.violations[0]).toMatch(/Invalid pnpm audit JSON/);
	});

	it("fails closed for advisories with missing or invalid severity", () => {
		const raw = JSON.stringify({
			advisories: { missing: {}, invalid: { severity: "unknown" } },
		});
		const result = validateAuditReport(raw);
		expect(result.allowed).toBe(false);
		expect(result.violations).toHaveLength(2);
	});

	it("fails closed for abnormal audit exit status or signal", () => {
		const stdout = JSON.stringify({ advisories: {} });
		expect(
			validateAuditExecution({ status: 2, signal: null, stdout }).allowed,
		).toBe(false);
		expect(
			validateAuditExecution({ status: null, signal: "SIGTERM", stdout })
				.allowed,
		).toBe(false);
	});

	it("still evaluates vulnerability JSON when pnpm audit exits with findings status 1", () => {
		expect(
			validateAuditExecution({ status: 1, signal: null, stdout: report() })
				.allowed,
		).toBe(true);
	});
});
