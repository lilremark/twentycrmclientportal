# Twenty CRM Client Portal

A self-hosted Next.js portal that gives external clients controlled access to
records stored in one Twenty CRM workspace.

## Capabilities

- Invite-only email/password authentication with viewer and contributor roles.
- All-record, Person-scoped, or explicit-record portal views.
- Portal invitations linked to a client account backed by a Twenty Person ID.
- Metadata-driven object lists, filters, detail pages, and create/edit forms.
- Server-enforced Person, record-ID, and saved-filter constraints.
- Signed Twenty webhook ingestion, deduplication, and audit history.
- Administrator UI for metadata sync, clients, portal views, and invitations.
- PostgreSQL persistence and Docker Compose deployment.

## Quick start

1. Copy `.env.example` to `.env` and replace every secret.
2. Set a strong `POSTGRES_PASSWORD`. Docker Compose constructs the internal
   database URL automatically; `DATABASE_URL` remains the local-development
   connection string.
3. Set `APP_URL` to the exact browser-facing address. For direct LAN access,
   use `APP_URL=http://10.0.0.22:3005` with your server's actual IP. Add every
   additional browser origin to comma-separated `TRUSTED_ORIGINS`. Session
   cookies follow the `APP_URL` protocol: direct HTTP access works for initial
   setup, while production internet deployments should use HTTPS.
4. In Twenty, create a restricted API key with access only to portal-enabled
   objects and fields.
5. Start the portal:

```bash
docker compose up --build
```

The Docker dependency stage normalizes `package-lock.json` with the pinned npm
version before running `npm ci`. This avoids npm's platform-specific optional
dependency lock validation failures when building Linux images from a lockfile
generated on macOS.

6. Open the configured `APP_URL` and use `SETUP_TOKEN` to create the first
   administrator.
7. Test the Twenty connection, synchronize metadata, create a client mapping,
   configure a portal view, and invite a user.
8. Configure a Twenty webhook pointing to
   `https://your-portal.example.com/api/webhooks/twenty`.

### Fresh database reset

To permanently delete all portal users, sessions, configuration, audit history,
and other PostgreSQL data, then rebuild from a clean database:

```bash
sh scripts/reset-docker.sh --yes
```

The script removes only volumes attached to this Compose project, rebuilds the
portal image without cache, starts PostgreSQL, applies migrations in a visible
one-time container, verifies the Better Auth ID defaults, and then starts the
portal. It does not delete data stored in Twenty.

After the reset, open `${APP_URL}/setup` and create the first administrator with
the current `SETUP_TOKEN`. Leave `SYSTEM_ADMIN_EMAIL` and
`SYSTEM_ADMIN_PASSWORD` empty when using the setup page.

### System administrator recovery

To create a recovery administrator or reset an existing administrator password,
temporarily set:

```env
SYSTEM_ADMIN_NAME=System Administrator
SYSTEM_ADMIN_EMAIL=admin@example.com
SYSTEM_ADMIN_PASSWORD=TemporaryAdminPassword123
```

Recreate the portal container. Startup will create or update the credential
account, grant portal-administrator access, and revoke its existing sessions.
For initial recovery, use only letters and numbers in this environment value.
Characters such as `$` and `#` may be interpreted by Compose or `.env` parsing
unless quoted correctly.
After confirming login, remove `SYSTEM_ADMIN_EMAIL` and
`SYSTEM_ADMIN_PASSWORD` from `.env` and recreate the container again. The
administrator account remains, but its password will no longer be reset on each
startup.

For local development:

```bash
npm install
npm run db:migrate
npm run dev
```

## Portal view configuration

Twenty generates its API from each workspace schema. After metadata
synchronization, the portal-view form provides dropdowns for the object,
scope mode, columns, detail fields, filters, create/edit forms, and default
sorting. Object and record pickers load synchronized or live Twenty API data.
The server derives API names and allowed filter operators from metadata rather
than accepting manually entered field names.

Use **All current records** to expose every record permitted by the saved
filters and allow contributors to create records. Use **Records linked to a
Person** when the selected object has a Person relation or Person ID field.
Use **Only specific records** to load up to 50 records from Twenty and select
exactly which records the portal may expose.

Client filter controls are type-aware. Select and multi-select fields use their
Twenty option labels, booleans use an Any/Yes/No dropdown, and numeric/date/text
fields expose only their supported comparison operators.

A metadata sync validates saved views. If an object, scope field, or configured
field disappears, the view is disabled rather than sending malformed queries.

## Branding and appearance

The sidebar supports smooth desktop collapse, responsive mobile navigation, and
persistent light/dark mode. Configure white labeling in `.env`:

```env
BRAND_NAME=Customer Workspace
BRAND_LOGO_URL=https://example.com/logo.svg
BRAND_PRIMARY_COLOR=#3157d5
```

Recreate the portal container after changing branding values.

## Operations

- Liveness: `GET /health/live`
- Readiness: `GET /health/ready`
- Apply migrations: `npm run db:migrate`
- Generate migrations after schema changes: `npm run db:generate`
- Verification: `npm run check`

Back up PostgreSQL with:

```bash
docker compose exec postgres pg_dump -U portal -d portal -Fc > portal.dump
```

Restore into an empty database with:

```bash
docker compose exec -T postgres pg_restore -U portal -d portal --clean < portal.dump
```

To rotate the Twenty API key, create a replacement key with the same restricted
role, update `TWENTY_API_KEY`, restart the portal, test the connection, then
revoke the old key. Rotate `TWENTY_WEBHOOK_SECRET` in Twenty and the portal
together.

Place the application behind a TLS reverse proxy such as Caddy or nginx. Forward
`Host`, `X-Forwarded-Proto`, and `X-Request-ID`, enforce request body limits, and
do not expose PostgreSQL publicly.

## Security model

The browser never receives Twenty credentials. Every CRM operation runs on the
server, only fields configured by an administrator are accepted, and the
configured Person or explicit record-ID scope and saved record filters are
injected into queries.
Updates first fetch the record through the same scope to prevent IDOR access.

V1 assumes one application replica. Login throttling is handled by Better Auth,
and mutation throttling is in process. Use shared rate-limit storage before
running multiple replicas.
