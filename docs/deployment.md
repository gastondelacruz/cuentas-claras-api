# Deployment Automation

## Release flow

1. Merge to `main`.
2. `.github/workflows/release.yml` runs.
3. The workflow runs the verification suite.
4. It inspects commits since the last `vX.Y.Z` tag.
5. It bumps `package.json` semantically:
   - `feat:` → minor
   - `fix:` → patch
   - breaking change markers → major
   - fallback → patch
6. It opens a release PR from `chore/release-vX.Y.Z`.
7. Merge that PR with **squash merge**.
8. `.github/workflows/release-tag.yml` creates the tag from the merged release.
9. The tag triggers `.github/workflows/render-deploy.yml`.
10. That workflow syncs Render env vars from GitHub, triggers the Render
    deploy hook, and waits for health to pass.

## GitHub configuration

Store these values in GitHub before enabling the flow:

### Repository / environment variables

- `NODE_ENV`
- `JWT_ACCESS_TTL`
- `JWT_REFRESH_TTL`
- `APP_PUBLIC_URL`
- `TRUST_PROXY_HOPS`
- `THROTTLE_DEFAULT_LIMIT`
- `THROTTLE_DEFAULT_TTL`
- `THROTTLE_AUTH_LIMIT`
- `THROTTLE_AUTH_TTL`
- `MAIL_PROVIDER`

### Secrets

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `REFRESH_TOKEN_DIGEST_SECRET`
- `MAIL_FROM`
- `RESEND_API_KEY`
- `RENDER_API_KEY`
- `RENDER_SERVICE_ID`
- `RENDER_DEPLOY_HOOK_URL`
- `RENDER_DEPLOY_HEALTH_URL`

## Notes

- The deploy workflow uses the Render API to replace the service env-var list.
- Missing GitHub values fail the deploy before Render is called.
- Release commits are skipped automatically to avoid tag loops.
