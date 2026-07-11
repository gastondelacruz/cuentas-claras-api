import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "../..");
const readText = (relativePath: string) =>
	readFileSync(resolve(repoRoot, relativePath), "utf8");

function expectDeleted(relativePath: string): void {
	expect(existsSync(resolve(repoRoot, relativePath))).toBe(false);
}

describe("deployment automation contract", () => {
	it("keeps CI on pull requests and release automation on release-please", () => {
		const ci = readText(".github/workflows/ci.yml");
		expect(ci).toContain("pull_request:");
		expect(ci).not.toContain("push:");

		const releasePlease = readText(".github/workflows/release-please.yml");
		expect(releasePlease).toContain("googleapis/release-please-action@v4");
		expect(releasePlease).toContain("RELEASE_PLEASE_TOKEN");
		expect(releasePlease).toContain("command: manifest");
		expect(releasePlease).toContain("release-please-config.json");
		expect(releasePlease).toContain(".release-please-manifest.json");

		const releasePleaseConfig = readText("release-please-config.json");
		expect(releasePleaseConfig).toContain('"bootstrap-sha"');
		expect(releasePleaseConfig).toContain('"release-type": "node"');
		expect(releasePleaseConfig).toContain('"include-component-in-tag": false');
		expect(releasePleaseConfig).toContain('".": {');

		const manifest = readText(".release-please-manifest.json");
		expect(manifest).toContain('".": "1.1.1"');

		const renderDeploy = readText(".github/workflows/render-deploy.yml");
		expect(renderDeploy).toContain("RENDER_DEPLOY_HOOK_URL");
		expect(renderDeploy).toContain("--request POST");
		expect(renderDeploy).not.toContain("RENDER_API_KEY");
		expect(renderDeploy).not.toContain("RENDER_SERVICE_ID");
		expect(renderDeploy).not.toContain("RENDER_DEPLOY_HEALTH_URL");
		expect(renderDeploy).not.toContain("render.com/v1/services");

		const deploymentDocs = readText("docs/deployment.md");
		expect(deploymentDocs).toContain("release-please");
		expect(deploymentDocs).toContain("RELEASE_PLEASE_TOKEN");
		expect(deploymentDocs).toContain("RENDER_DEPLOY_HOOK_URL");
		expect(deploymentDocs).not.toContain("RENDER_API_KEY");
		expect(deploymentDocs).not.toContain("RENDER_SERVICE_ID");
		expect(deploymentDocs).not.toContain("RENDER_DEPLOY_HEALTH_URL");
	});

	it("retires the old release workflows", () => {
		expectDeleted(".github/workflows/release.yml");
		expectDeleted(".github/workflows/release-tag.yml");
	});
});
