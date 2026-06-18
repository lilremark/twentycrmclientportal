# Releasing

Twenty CRM Client Portal uses [Semantic Versioning](https://semver.org/):

- `MAJOR` for incompatible configuration, API, database, or deployment changes.
- `MINOR` for backward-compatible features.
- `PATCH` for backward-compatible fixes.

## Release checklist

1. Update the version in `package.json` and `package-lock.json`.
2. Add the dated release entry to `CHANGELOG.md`.
3. Set the matching default `VERSION` in `Dockerfile` and `PORTAL_VERSION` in `docker-compose.yml` and `.env.example`.
4. Set `DEPLOYMENT_ID` and `PORTAL_DEPLOYMENT_ID` to the release tag with periods replaced by hyphens, such as `v1-0-0`.
5. Run the application checks and validate the production container:

   ```bash
   npm run check
   docker compose config --quiet
   docker build --build-arg VERSION=<version> -t twentycrmclientportal:<version> .
   ```

6. Commit the release as `chore(release): v<version>`.
7. Create and push an annotated `v<version>` tag.
8. Create a GitHub release from the tag using the matching `CHANGELOG.md` entry as the release body.

The package version, Git tag, Docker image tag, OCI image version label, and Compose default must use the same SemVer value. The Next.js deployment ID must represent that version using only letters, numbers, hyphens, and underscores.
