# Changelog

All notable changes to Twenty CRM Client Portal are documented here.

This project follows [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-06-18

Initial production release of the self-hosted client portal for Twenty CRM.

### Highlights

- Secure invite-only authentication with system administrator, viewer, and contributor access controls.
- Configurable client accounts, portal views, invitations, user access, and record-level permissions.
- Twenty CRM metadata synchronization with validation for deleted or changed objects and fields.
- Person-scoped, filtered, and explicitly selected record access strategies.
- Metadata-driven list, detail, create, and edit experiences for permitted CRM records.
- Application branding, SMTP delivery, Twenty API, and signed webhook configuration.
- Audit history for administrative, authentication, access, and record mutation events.
- Health endpoints and a production-ready Docker Compose deployment with PostgreSQL.

### Deployment

- Node.js 22 and Next.js 16 standalone runtime.
- PostgreSQL 17 with automatic database migrations at container startup.
- Non-root application container with dropped Linux capabilities and `no-new-privileges`.
- Persistent volumes for PostgreSQL data and uploaded files.
- Versioned image metadata through `PORTAL_VERSION` and version-skew protection through the deployment-safe `PORTAL_DEPLOYMENT_ID`.

### Upgrade notes

This is the first stable release. New installations should copy `.env.example` to `.env`, replace every placeholder secret, and run:

```bash
PORTAL_VERSION=1.0.0 PORTAL_DEPLOYMENT_ID=v1-0-0 docker compose up -d --build
```

After the health check passes, open the configured `APP_URL` and complete the one-time `/setup` flow.

[1.0.0]: https://github.com/lilremark/twentycrmclientportal/releases/tag/v1.0.0
