#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const changeRelevantPrefixes = [
	"src/",
	"prisma/",
	"scripts/",
	"package.json",
	"pnpm-lock.yaml",
	".github/workflows/",
];
const requiredArtifacts = ["proposal.md", "design.md", "tasks.md"];

export function validateOpenSpecChange(
	changedFiles: string[],
	activeChanges: string[],
): string[] {
	const requiresChange = changedFiles.some((file) =>
		changeRelevantPrefixes.some(
			(prefix) => file === prefix || file.startsWith(prefix),
		),
	);
	if (!requiresChange) return [];

	const changeDirectories = new Set(
		activeChanges.map((change) => change.split("/")[0]).filter(Boolean),
	);
	if (changeDirectories.size === 0) {
		return [
			"Application or infrastructure changes require an active OpenSpec change.",
		];
	}

	const errors: string[] = [];
	for (const change of changeDirectories) {
		const missing = requiredArtifacts.filter(
			(artifact) => !activeChanges.includes(`${change}/${artifact}`),
		);
		if (missing.length > 0) {
			errors.push(
				`OpenSpec change ${change} is missing: ${missing.join(", ")}.`,
			);
		}
	}
	return errors;
}

function getChangedFiles(): string[] {
	const baseRef = process.env.GITHUB_BASE_REF
		? `origin/${process.env.GITHUB_BASE_REF}`
		: (process.env.OPENSPEC_BASE_REF ?? "origin/main");
	return execFileSync("git", ["diff", "--name-only", `${baseRef}...HEAD`], {
		encoding: "utf8",
	})
		.split("\n")
		.filter(Boolean);
}

function getActiveChanges(): string[] {
	const changesRoot = join(process.cwd(), "openspec", "changes");
	if (!existsSync(changesRoot)) return [];

	return readdirSync(changesRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && entry.name !== "archive")
		.flatMap((entry) =>
			readdirSync(join(changesRoot, entry.name)).map(
				(file) => `${entry.name}/${file}`,
			),
		);
}

function main(): void {
	const errors = validateOpenSpecChange(getChangedFiles(), getActiveChanges());
	if (errors.length > 0) {
		for (const error of errors) process.stderr.write(`${error}\n`);
		process.exitCode = 1;
		return;
	}
	process.stdout.write("OpenSpec workflow validation passed.\n");
}

if (process.argv[1]?.endsWith("/validate-openspec.ts")) main();
