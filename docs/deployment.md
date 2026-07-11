# Deployment Automation

## Release flow

1. Merge feature work to `main` through PRs.
2. `.github/workflows/ci.yml` runs on every PR.
3. `.github/workflows/release-please.yml` runs on pushes to `main`.
4. Release Please opens or updates the release PR.
5. The release PR updates `package.json` and `CHANGELOG.md`.
6. Merge the release PR with squash merge.
7. Release Please creates the `vX.Y.Z` tag from the merged release commit.
8. The tag triggers `.github/workflows/render-deploy.yml`.
9. That workflow calls the Render deploy hook.
10. Render deploys using the environment variables already configured in Render.

## GitHub configuration

Store these values in GitHub before enabling the flow:

### Secrets

- `RELEASE_PLEASE_TOKEN`
- `RENDER_DEPLOY_HOOK_URL`

## Notes

- Release Please assumes Conventional Commits for versioning and changelog entries.
- GitHub no longer syncs runtime environment variables into Render during deploy.
- The deploy workflow only triggers Render; runtime variables live in Render.
- Release commits are skipped automatically to avoid tag loops.
