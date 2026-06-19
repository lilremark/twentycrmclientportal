# Changelog

All notable changes to Twenty CRM Client Portal are documented here.

This project follows [Semantic Versioning](https://semver.org/).

## [1.2.3] - 2026-06-19

### Fixed

- Fixed the portal assignment modal background and branding styling to respect the brand color configured in administrator settings.

## [1.2.2] - 2026-06-19

### Added

- Added an interactive "Assign Portals" modal for managing user portal access, replacing the inline forms.
- Added a multi-step portal assignment flow with checkboxes, role selections, and a confirmation summary screen.

## [1.2.1] - 2026-06-19

### Changed

- Moved the exposed Portal View creation settings from the views list page to a dedicated page `/admin/views/new`.
- Replaced the inline creation form in the Portal Views list with an "Add portal view" button.

## [1.2.0] - 2026-06-19

### Added

- Added per-user management for assigning multiple portal views with independent
  viewer or contributor roles.
- Added one-click portal access revocation from the administrator Users screen.
- Added Google SSO configuration with optional Google Workspace domain
  restriction.
- Added custom OAuth/OpenID Connect configuration using discovery metadata or
  explicit authorization, token, and user-info endpoints.
- Added provider callback URL guidance and SSO controls to Admin Settings.

### Security

- Kept SSO invite-only by linking provider identities only to existing active
  users with matching email addresses.
- Prevented OAuth providers from creating unapproved portal users.
- Revalidated active-user status before creating authenticated sessions.

## [1.1.1] - 2026-06-19

### Fixed

- Replaced broken corner-positioned deletion prompts with a centered,
  accessible confirmation modal.
- Persisted light and dark theme selection across browser reloads and tabs.
- Corrected invitation acceptance so the newly created account replaces any
  previously authenticated session.
- Added spacing around the SMTP save action.

### Changed

- Moved client-facing record filters into a right-side filter panel with an
  active-filter indicator and one-click disable action.
- Replaced portal table page navigation with continuous record loading as the
  user scrolls.

## [1.1.0] - 2026-06-19

### Added

- Added a branded, responsive HTML invitation email template that follows the
  portal's configured identity.
- Added administrator-managed invitation email subjects and HTML templates
  with supported recipient, branding, and invitation-link placeholders.
- Added a Health settings tab with live portal, PostgreSQL, and Docker Hub
  checks.
- Added running-version and latest-published-image comparison with update
  availability reporting.

## [1.0.2] - 2026-06-19

### Fixed

- Clarified SMTP encryption configuration by separating STARTTLS/standard SMTP
  from implicit TLS.
- Prevented invalid port and encryption combinations from being saved or tested.
- Replaced low-level OpenSSL `wrong version number` failures with actionable
  SMTP configuration guidance.

## [1.0.1] - 2026-06-18

### Fixed

- Corrected the bundled Docker migration runtime for Node.js ESM/CommonJS compatibility.
- Replaced the initial setup form with a guided administrator, Twenty CRM,
  email, and branding workflow.
- Prevented implicit form submission from completing setup before the explicit
  final action.
- Added SMTP connection and credential verification during initial setup.
- Applied the configured brand icon as the application favicon.
- Published multi-architecture Docker images for Linux AMD64 and ARM64.

### Deployment

Docker Compose now pulls the public image instead of building locally:

```bash
docker compose pull
docker compose up -d
```

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

[1.2.3]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.2.3
[1.2.2]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.2.2
[1.2.1]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.2.1
[1.2.0]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.2.0
[1.1.1]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.1.1
[1.1.0]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.1.0
[1.0.2]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.0.2
[1.0.1]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.0.1
[1.0.0]: https://github.com/lilremark/twentycrmclientportal/releases/tag/v1.0.0
