#!/usr/bin/env node

import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { basename } from "node:path";

interface AuditValidationResult {
	allowed: boolean;
	violations: string[];
}

interface AuditFinding {
	paths?: unknown;
}

interface AuditAdvisory {
	github_advisory_id?: unknown;
	severity?: unknown;
	findings?: unknown;
}

const allowedAdvisory = {
	id: "GHSA-92pp-h63x-v22m",
	path: "prisma>@prisma/dev>@hono/node-server",
	expiresOn: "2026-08-03",
};
const blockedSeverities = new Set(["moderate", "high", "critical"]);
const auditSeverities = new Set(["info", "low", ...blockedSeverities]);

function normalizePath(path: string): string {
	return path.startsWith(".>") ? path.slice(2) : path;
}

export function validateAuditReport(
	rawReport: string,
	now = new Date(),
): AuditValidationResult {
	let report: unknown;
	try {
		report = JSON.parse(rawReport);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			allowed: false,
			violations: [`Invalid pnpm audit JSON: ${message}`],
		};
	}

	if (
		!report ||
		typeof report !== "object" ||
		!("advisories" in report) ||
		!report.advisories ||
		typeof report.advisories !== "object"
	) {
		return {
			allowed: false,
			violations: ["Invalid pnpm audit JSON: missing advisories object"],
		};
	}

	const violations: string[] = [];
	for (const [reportId, value] of Object.entries(report.advisories)) {
		const advisory = value as AuditAdvisory | null;
		if (
			!advisory ||
			typeof advisory !== "object" ||
			typeof advisory.severity !== "string" ||
			!auditSeverities.has(advisory.severity)
		) {
			violations.push(
				`Invalid pnpm audit JSON: malformed advisory ${reportId}`,
			);
			continue;
		}
		if (!blockedSeverities.has(advisory.severity)) continue;

		const findings = Array.isArray(advisory.findings)
			? (advisory.findings as AuditFinding[])
			: [];
		const paths = findings.flatMap((finding) =>
			Array.isArray(finding?.paths)
				? finding.paths.filter(
						(path): path is string => typeof path === "string",
					)
				: [],
		);
		const id =
			typeof advisory.github_advisory_id === "string"
				? advisory.github_advisory_id
				: reportId;
		if (paths.length === 0) {
			violations.push(`Invalid pnpm audit JSON: ${id} has no dependency paths`);
			continue;
		}

		if (id !== allowedAdvisory.id) {
			for (const path of paths) {
				violations.push(
					`Unexpected ${advisory.severity} advisory ${id} at ${normalizePath(path)}`,
				);
			}
			continue;
		}

		const expiry = new Date(`${allowedAdvisory.expiresOn}T23:59:59.999Z`);
		if (now > expiry) {
			violations.push(
				`${id} exception expired on ${allowedAdvisory.expiresOn}`,
			);
		}
		for (const path of paths.map(normalizePath)) {
			if (path !== allowedAdvisory.path) {
				violations.push(`${id} has an unapproved path: ${path}`);
			}
		}
	}

	return { allowed: violations.length === 0, violations };
}

export function validateAuditExecution(
	audit: Pick<SpawnSyncReturns<string>, "signal" | "status" | "stdout">,
	now = new Date(),
): AuditValidationResult {
	if (audit.signal || ![0, 1].includes(audit.status ?? -1)) {
		return {
			allowed: false,
			violations: [
				`pnpm audit failed (status: ${audit.status}, signal: ${audit.signal ?? "none"})`,
			],
		};
	}
	return validateAuditReport(audit.stdout, now);
}

function main(): void {
	const audit = spawnSync(
		"pnpm",
		["audit", "--json", "--audit-level", "moderate"],
		{
			encoding: "utf8",
			maxBuffer: 10 * 1024 * 1024,
		},
	);
	if (audit.error) {
		console.error(`Unable to run pnpm audit: ${audit.error.message}`);
		process.exitCode = 1;
		return;
	}

	const result = validateAuditExecution(audit);
	if (!result.allowed) {
		for (const violation of result.violations) {
			console.error(violation);
		}
		process.exitCode = 1;
		return;
	}

	console.log(
		"pnpm audit passed: no unapproved moderate-or-higher vulnerabilities found.",
	);
}

if (
	process.argv[1] &&
	basename(process.argv[1]) === "pnpm-audit-validator.ts"
) {
	main();
}
