# Changelog

All notable changes to Twenty CRM Client Portal are documented here.

This project follows [Semantic Versioning](https://semver.org/).

## [2.0.0] - 2026-07-02

### Highlights

- Rebuilt the client and administrator portals around a shared, responsive
  workspace shell with compact navigation, anchored headers, consistent icon
  states, and coordinated right-side panels.
- Added a client home dashboard with configurable workspace cards, recent
  records, portal activity, and clear routes into records and reports.
- Redesigned administrator overview, settings, portal configuration, users,
  client accounts, invitations, audit, and health surfaces to use the same
  visual system as the client portal.

### Added

- Added multi-record selection, bulk editing, record context menus, local
  favorites, favorites-only filtering, and anchored identity columns to portal
  record tables.
- Added searchable, custom dropdowns and a complete Lucide icon catalog for
  assigning per-view navigation icons and colors.
- Added secure HTTPS dashboard embeds with private-network, credential, and
  unsafe-protocol rejection.
- Added editable PDF report titles, subtitles, text blocks, images, card theme,
  bleed guides, zoom controls, and a persistent preview toolbar.
- Added redesigned CSV and XLSX export controls in a resizable side workspace.
- Added modal workflows for inviting users and creating client accounts.
- Added client and administrator profile images with local upload or secure
  external URL support.
- Added repeatable demo mode data, seeded administrator/client workflows, and
  mock Twenty CRM records for local product evaluation.

### Changed

- Replaced native selects across the application with accessible, themed menus
  that remain attached to their fields and scroll within the viewport.
- Reworked record, bulk-edit, filter, and export drawers so the table and panel
  animate as one layout without reload flashes or empty viewport regions.
- Moved record and export actions into the records/reports command rail and
  removed redundant table controls and record subtitle text.
- Unified profile configuration, confirmation dialogs, action buttons, form
  spacing, and dark-mode contrast between administrator and client portals.
- Made report and portal configuration command rails sticky while their content
  scrolls independently beneath them.

### Fixed

- Fixed ascending and descending table sorting and retained sorting in scoped
  exports.
- Fixed collapsed sidebar icon, logo, hover, and active-state alignment.
- Fixed dropdowns and the navigation icon picker rendering behind sticky or
  clipped layout layers.
- Fixed account menus opening away from their trigger when a right-side panel
  is active.
- Fixed duplicate sign-in loading indicators and added password visibility
  controls.
- Fixed administrator metadata visibility and recent-activity capitalization.

### Security

- Validated dashboard embed targets as public HTTPS URLs and rejected local,
  private-network, credential-bearing, and malformed destinations.
- Preserved server-side authorization, record scoping, editable-field
  validation, and write-rate limiting for bulk record updates.

### Upgrade notes

- Database migrations `0015` and `0016` add application icon color and
  per-portal navigation icon/color fields. Container startup applies them
  automatically; host deployments must run `npm run db:migrate`.
- Review portal navigation icons after upgrade. Existing views receive safe
  default icons and colors.
- The production image, package, Compose default, and deployment identifier now
  use version `2.0.0` / `v2-0-0`.

## [1.5.2] - 2026-06-26

### Changed

- Enlarged the reports dashboard visual layout canvas to take up 100% of the horizontal width.
- Eliminated internal scrollbars in the visual canvas container to allow it to expand dynamically without nested scroll zones.
- Moved the dashboard widgets builder settings into a focused pop-up modal dialog triggered via the top action bar.
- Unified the configuration headings on the Reports tab to prevent duplicate titles.

## [1.5.1] - 2026-06-25

### Added

- Introduced a dedicated **Reports Dashboard** tab inside the Portal configuration view, moving the reports widgets list and layout editor out of the general settings and modal overlays.
- Added a widescreen vertical layout stack with a scrollable widgets editor at the top and a full-width visual layout canvas below it to maximize screen real estate.
- Implemented a premium config tab navigation bar with smooth transitions, brand color indicators, and metadata validation safety triggers.
- Centralized all layout, responsive grid wrapping, and tab styling within globals.css.

## [1.5.0] - 2026-06-25

### Added

- Added configurable client portal report dashboards with main-number, bar
  chart, and donut chart widgets backed by scoped Twenty CRM records.
- Added administrator dashboard widget configuration and a visual default
  layout editor for each portal view.
- Added a Reports tab to portal view previews so administrators can review the
  client-facing reports experience before publishing.
- Added a client-facing Reports tab with drag-and-resize dashboard layout
  controls and local layout persistence.
- Added a PDF export flow for dashboard reports with preview, PDF-specific
  light/dark card styling, print-safe bleed guides, and PDF layout adjustment
  before download.

### Changed

- Extended portal view validation and metadata resynchronization to include
  dashboard widget fields and chart grouping fields.
- Updated dashboard report printing so only the PDF preview participates in the
  print layout, keeping ordinary dashboards on one page when they fit.

## [1.4.0] - 2026-06-24

### Added

- Added inline editing directly in the client portal record sidebar for fields
  administrators have marked as editable.
- Added a clearer CSV/XLSX export workflow with record-set, column, and format
  steps plus a muted summary of the selected export options.

### Changed

- Refined the export wizard, confirmation pop-ups, note pop-ups, and
  notification toasts to respect the configured portal brand color with muted
  accents.
- Propagated the configured brand color to body-level portal pop-ups rendered
  outside the main application shell, including future modal and toast surfaces.

## [1.3.5] - 2026-06-24

### Fixed

- Fixed the Docker runtime entrypoint on Windows-built release contexts by
  normalizing the shell script to Linux line endings inside the image.
- Added repository line-ending attributes for shell scripts and Dockerfile
  content so future Docker images keep executable Linux entrypoints.

## [1.3.4] - 2026-06-24

### Added

- Added a portal export wizard for CSV and XLSX downloads from each client
  portal view.
- Added export options for current filtered views, all shared portal records,
  selected visible columns, and spreadsheet format.
- Added a secured portal export API route that rebuilds portal authorization,
  record scoping, saved filters, sorting, and fixed filters server-side before
  generating the download.

### Security

- Restricted exports to the columns already exposed by the portal table.
- Escaped CSV cells that could be interpreted as spreadsheet formulas.
- Capped each export at 5,000 rows to avoid runaway downloads.

## [1.3.3] - 2026-06-22

### Added

- Added bounded LRU caching for individual Twenty CRM records with a five-minute
  expiration and a 500-record maximum.
- Added client-controlled sorting by any displayed portal field in ascending or
  descending order.
- Added per-user saved portal views that retain the current filters and sorting
  selection.

### Changed

- Invalidated cached Twenty CRM reads after record writes, deletes, webhook
  updates, manual refreshes, and integration-setting changes.
- Removed the empty Appearance section from client portal Settings.

### Security

- Restricted saved views to the current authenticated user and assigned portal.
- Revalidated saved filter operators and sort fields against the active portal
  configuration before querying Twenty CRM.

## [1.3.2] - 2026-06-22

### Added

- Added a draggable and keyboard-accessible record sidebar resize handle.
- Persisted the preferred record sidebar width locally, with a maximum width
  of half the browser viewport.
- Added note editing directly inside the full-note pop-up.

### Changed

- Kept the record sidebar mounted while loading so its skeleton transitions
  directly into the loaded record without replaying the opening animation.
- Refined the record sidebar header, field layout, notes, attachments, spacing,
  and surfaces to match the rest of the portal interface.
- Changed note list clicks to select a note in the sidebar; the full-note
  pop-up now opens only from the explicit "View full note" action.
- Reduced the brightness and brand tint of the full-note pop-up background.

### Security

- Removed the unused npm and npx runtime tooling from the production image,
  eliminating five Docker Scout findings including high-severity
  `CVE-2026-33671`.
- Verified the production image with Docker Scout at zero critical, high,
  medium, and low vulnerabilities.

## [1.3.1] - 2026-06-22

### Changed

- Updated the full-note pop-up to inherit the configured portal branding color.
- Applied the brand color to the note modal accent, backdrop tint, border,
  controls, divider, shadow, and primary action for consistency with the rest
  of the client portal.

## [1.3.0] - 2026-06-22

### Added

- Added readable labels for Select and Multi-select values by converting API
  names to properly spaced and capitalized text.
- Added a per-portal option to retain raw API names when integrations require
  exact values.
- Added a full-note modal in client portal record details so truncated note
  previews can be opened and read without leaving the record.

### Changed

- Updated supported production and development dependencies within the
  project's Node.js 22, TypeScript 5, and ESLint 9 compatibility range.
- Improved note interactions, keyboard dismissal, focus restoration, and
  contributor access to note editing.
- Disabled new SVG uploads; existing SVG branding remains available with
  sandboxed response headers.

### Security

- Resolved all npm audit findings, including transitive PostCSS and esbuild
  advisories.
- Restricted branding and OAuth URLs to HTTP and HTTPS schemes.
- Forced unsafe proxied CRM file types to download and added MIME-sniffing and
  sandbox protections to file responses.
- Limited signed webhook request bodies to 1 MB.
- Disabled Nodemailer filesystem and URL access and removed `unsafe-eval` from
  the production Content Security Policy.

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

[2.0.0]: https://github.com/lilremark/twentycrmclientportal/releases/tag/v2.0.0
[1.5.2]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.5.2
[1.5.1]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.5.1
[1.5.0]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.5.0
[1.4.0]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.4.0
[1.3.5]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.3.5
[1.3.4]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.3.4
[1.3.3]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.3.3
[1.3.2]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.3.2
[1.3.1]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.3.1
[1.3.0]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.3.0
[1.2.3]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.2.3
[1.2.2]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.2.2
[1.2.1]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.2.1
[1.2.0]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.2.0
[1.1.1]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.1.1
[1.1.0]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.1.0
[1.0.2]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.0.2
[1.0.1]: https://hub.docker.com/r/lilremark/twentycrmclientportal/tags?name=1.0.1
[1.0.0]: https://github.com/lilremark/twentycrmclientportal/releases/tag/v1.0.0
