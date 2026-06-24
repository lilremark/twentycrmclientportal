# Twenty CRM Client Portal

A self-hosted Next.js portal that gives external clients controlled access to records stored in a single [Twenty CRM](https://twenty.com) workspace. It is designed to act as a secure intermediary layer, ensuring clients only see and edit the specific records they are authorized to access.

---

## Screen Gallery

### 1. Client Login Screen
A secure, custom-branded login interface for client authentication.

![Client Login Page](public/screenshots/portal_login.png)

### 2. Client Dashboard
The workspace view accessible to authorized clients, showing structured list data retrieved dynamically from Twenty CRM, complete with status pills, progress indicators, search, and action filters.

![Client Dashboard Interface](public/screenshots/portal_dashboard.png)

### 3. Administrator Dashboard
The administrator panel where system admins trigger schema synchronization, configure client account Person ID mappings, list portal views, and audit active client invitations.

![Administrator Interface](public/screenshots/portal_admin.png)

---

## Key Capabilities

- **Secure Role-Based Access Control**: Invite-only registration with granular `viewer` and `contributor` access levels for every portal assigned to a user.
- **Multiple Portal Assignments**: Administrators can grant, change, or revoke access to multiple portal views from the Users screen.
- **Single Sign-On**: Optional Google and custom OAuth/OpenID Connect sign-in for existing invited users, configured from Admin Settings.
- **Flexible Data Scope Scenarios**:
  - **All current records**: Expose all records matching filters.
  - **Person-scoped records**: Dynamically filter records linked to the authenticated user's Twenty Person ID.
  - **Explicit record selection**: Pin up to 50 specific CRM records for portal-only exposure.
- **Dynamic Configuration & Forms**: Metadata-driven field displays, detail views, custom filtering, and create/edit forms using custom layout overrides.
- **Self-Healing Metadata Sync**: Synchronizes object schemas from Twenty and automatically flags or disables views if fields or objects are deleted in the CRM, preventing database/API queries from failing silently.
- **Audit Logging & History**: Comprehensive tracking of all portal mutations, access requests, and external modifications.
- **Signed Webhook Integration**: Validates and consumes inbound webhook payloads from Twenty with deduplication guards to keep portal state in sync.
- **System Admin Panel**: Visual admin UI to configure portals, synchronize metadata, manage client accounts, and issue invitations.

---

## Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Runtime**: [Node.js 22](https://nodejs.org/) (Alpine-based container images)
- **Database ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database Engine**: [PostgreSQL 17](https://www.postgresql.org/)
- **Authentication**: [Better Auth](https://www.better-auth.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Unit Testing**: [Vitest](https://vitest.dev/)

---

## Prerequisites

- **Node.js**: `v22.x` (strictly enforced, active LTS)
- **npm**: `v10.9.8`
- **Docker & Docker Compose**: Required for Postgres persistent database and containerized builds.
- **Twenty CRM Workspace**: Access to a Twenty workspace with a restricted API key and webhook capabilities.
- **SMTP Server**: An active SMTP server (or Mailgun/Resend/SES details) to deliver portal invitations.

---

## Getting Started

### Local Development (Host Mode)

To set up a local development environment running directly on your host machine:

#### 1. Clone the repository and install dependencies
```bash
git clone https://github.com/lilremark/twentycrmclientportal.git
cd twentycrmclientportal
npm install
```

#### 2. Configure Environment Variables
Copy the example configuration file:
```bash
cp .env.example .env
```
Ensure you fill in `DATABASE_URL` (e.g., `postgresql://portal:portal@localhost:5432/portal`), `AUTH_SECRET`, `SETUP_TOKEN`, and your Twenty API details.

For SMTP encryption, use `SMTP_SECURE=false` with port `587` or `25` so the
connection can upgrade with STARTTLS. Use `SMTP_SECURE=true` only with port
`465`, which expects TLS immediately when the connection opens.

#### 3. Spin up local database
Ensure PostgreSQL is running locally. You can use a temporary Docker PostgreSQL instance:
```bash
docker run --name local-postgres \
  -e POSTGRES_DB=portal \
  -e POSTGRES_USER=portal \
  -e POSTGRES_PASSWORD=portal \
  -p 5432:5432 \
  -d postgres:17-alpine
```

#### 4. Run Migrations & Bootstrap
Create the tables, push the schema to PostgreSQL, and seed initial records:
```bash
npm run db:migrate
npm run admin:bootstrap
```

#### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Go to `/setup` and enter the `SETUP_TOKEN` from your `.env` file to create your system admin account.

---

### Docker Compose Deployment

The project contains a production-ready multi-stage `Dockerfile` and a `docker-compose.yml` defining the web service and a PostgreSQL database.

#### 1. Start Services
Ensure `.env` matches your environment, then run:
```bash
docker compose pull
docker compose up -d
```
This pulls the published multi-architecture image from
[`lilremark/twentycrmclientportal`](https://hub.docker.com/r/lilremark/twentycrmclientportal)
and binds port `3005` on the host to port `3000` inside the container.

The image tag defaults to the current release:
```bash
PORTAL_VERSION=1.4.0 docker compose pull portal
PORTAL_VERSION=1.4.0 docker compose up -d
```

#### 2. Fresh Database Reset
To permanently drop all PostgreSQL data, pull the configured images, apply
migrations, verify table schemas, and restart cleanly:
```bash
sh scripts/reset-docker.sh --yes
```

#### 3. Administrative Recovery
If you lose administrator access, you can inject a bootstrap account at startup. Set the following environment variables temporarily in `.env`:
```env
SYSTEM_ADMIN_NAME="Recovery Admin"
SYSTEM_ADMIN_EMAIL="admin@example.com"
SYSTEM_ADMIN_PASSWORD="StrongRecoveryPassword123"
```
Recreate the portal container:
```bash
docker compose up -d portal
```
On boot, the portal creates/updates this user, assigns administrator status, and invalidates active sessions. **Remove these variables from `.env` and recreate the container once logged in.**

---

## System Architecture

```
                 +-----------------------------------------+
                 |               Browser                   |
                 +----+--------------------------------+---+
                      |                                |
                      | (Session Cookie)               | (Session Cookie)
                      v                                v
         +------------+------------+     +-------------+-----------+
         |     Admin Interface     |     |      Client Interface    |
         | (Metadata sync, views,  |     |   (View lists, detail,  |
         |  client account config) |     |    forms, profile)      |
         +------------+------------+     +-------------+-----------+
                      |                                |
                      +---------------+----------------+
                                      |
                                      v
                       +--------------+---------------+
                       |      Next.js Web Server      |
                       |       (Better Auth)          |
                       +-------+--------------+-------+
                               |              |
           (Drizzle / SQL)     |              | (REST API Calls)
                               v              v
                       +-------+------+   +---+---------------+
                       |  PostgreSQL  |   |  Twenty CRM API   |
                       |   Database   |   |                   |
                       +-------+------+   +---+---------------+
                               ^              |
                               |              | (Signed JSON Webhook)
                               +--------------+
```

### Directory Structure

```
├── drizzle/                # Drizzle migration files and SQL snapshots
├── public/                 # Static public assets (logos, icons)
│   └── screenshots/        # Mockup screenshots with CRM data
├── scripts/                # Utility shell and TypeScript scripts
│   ├── bootstrap-admin.ts  # Startup admin provisioning logic
│   ├── migrate.ts          # Migration runner
│   └── reset-docker.sh     # Docker-compose volume/cache reset script
├── src/
│   ├── app/                # Next.js App Router (Pages, API routes, Layouts)
│   ├── components/         # Reusable React components (Forms, Tables, UI)
│   ├── lib/                # Shared utilities
│   │   ├── db/             # Drizzle schema definitions and DB client
│   │   ├── twenty/         # Twenty CRM API client, read cache, and metadata mapping
│   │   └── auth.ts         # Better Auth initialization logic
│   └── proxy.ts            # Local endpoint proxies
├── tests/
│   ├── unit/               # Core functional tests (Vitest)
│   └── e2e/                # Playwright E2E and visual regression test files
└── playwright.config.ts    # E2E test harness configuration
```

### Development Notes

- Client portal reads go through `src/lib/twenty/client.ts`, which applies a short in-memory read-through cache in `src/lib/twenty/cache.ts`. This is intentionally scoped for a single app replica and modest usage.
- SSO is invite-only. Google and custom OAuth identities are linked by matching email to an existing active user; OAuth sign-in never creates a new portal user.
- Configure the callback URLs shown in Admin Settings with the identity provider. Custom OAuth works with OpenID discovery or explicit authorization, token, and user-info endpoints.
- The cache is cleared after successful Twenty writes, accepted Twenty webhooks, and the portal record refresh action. Keep new record-list/detail reads behind the Twenty client so they share the same invalidation behavior.
- Keep browser-facing code out of `src/lib/twenty/*`; Twenty API credentials must remain server-only.
- See [CONTRIBUTING.md](CONTRIBUTING.md) for authorization, uploads, module boundaries, and verification conventions.
- See [RELEASING.md](RELEASING.md) for semantic versioning and GitHub release steps.

### Database Schema Reference

The portal relies on the following database schema managed via Drizzle ORM:

```mermaid
erDiagram
    user ||--o{ session : has
    user ||--o{ account : has
    user ||--o| portal_administrator : is
    user ||--o{ membership : holds
    user ||--o{ invitation : "invited by"
    client_account ||--o{ membership : contains
    client_account ||--o{ invitation : references
    client_account ||--o{ audit_event : logs
    portal_view ||--o{ portal_access : restricts
    portal_view ||--o{ invitation : binds
    user ||--o{ portal_access : assigned
```

#### Core Database Tables

1. **`user`**: Stores user authentication profiles (managed by Better Auth).
2. **`session`**: Active user sessions.
3. **`account`**: User credential mappings.
4. **`verification`**: Tokens for password resets and email verification.
5. **`portal_administrator`**: Identifies user IDs permitted to access `/admin` endpoints.
6. **`application_setting`**: Portal branding, Twenty endpoints, API keys, SMTP parameters.
7. **`client_account`**: Represents an external client company, mapped directly to a `twenty_person_id` in the CRM.
8. **`membership`**: Binds a `user` to a `client_account` with a specific role (`viewer` or `contributor`).
9. **`invitation`**: Tracks pending/accepted invites sent to clients, containing role assignments, expiration timestamps, and target accounts.
10. **`portal_view`**: Defines dynamic views (CRM object, columns to fetch, filters, edit/create permissions, and validation status).
11. **`portal_access`**: Restricts which client users have access to which `portal_view`.
12. **`metadata_snapshot`**: Holds snapshots of Twenty CRM object schemas to validate portal views against active CRM configurations.
13. **`webhook_receipt`**: Tracks inbound webhook fingerprints from Twenty to prevent double-processing.
14. **`audit_event`**: Records a detailed trail of actions (before/after states, IP addresses, target records, and actor IDs).

---

## Environment Variables

| Variable | Description | Default / Example | Required |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://portal:pass@postgres:5432/portal` | Yes |
| `APP_URL` | The public url of the application | `http://localhost:3005` | Yes |
| `AUTH_SECRET` | 32+ char token for Better Auth encryption | `generate-via-openssl-rand-hex` | Yes |
| `SETUP_TOKEN` | Security code to authorize the `/setup` admin wizard | `setup-token-secret-xyz` | Yes |
| `TWENTY_BASE_URL` | Endpoint of your Twenty CRM workspace | `http://localhost:3000` | Yes |
| `TWENTY_API_KEY` | Limited access REST API Token from Twenty | `ts_abc123...` | Yes |
| `TWENTY_WEBHOOK_SECRET` | Hex signature to sign inbound webhooks from Twenty | `wh_secret_xyz` | Yes |
| `TRUSTED_ORIGINS` | Comma-separated list of browser host exceptions | `http://10.0.0.22:3005` | No |
| `BRAND_NAME` | Portal logo text display | `My Customer Portal` | No |
| `BRAND_LOGO_URL` | Absolute URL to branding image file | `https://site.com/logo.png` | No |
| `BRAND_PRIMARY_COLOR` | Hex value for sidebar elements | `#3157d5` | No |

---

## Available Scripts

The following scripts are configured in `package.json`:

- `npm run dev`: Start Next.js dev server.
- `npm run build`: Compile Next.js build output.
- `npm run start`: Launch compiled web service in production.
- `npm run check`: Run standard checks: linting, TypeScript compiler, and unit tests.
- `npm run db:generate`: Create SQL migration files from Drizzle schema modifications.
- `npm run db:migrate`: Apply pending migration files to the database.
- `npm run admin:bootstrap`: Synchronize runtime settings and seed the default admin.
- `npm run test`: Run the unit test suite once (using Vitest).
- `npm run test:e2e`: Run browser tests locally (using Playwright).

---

## Operations & Production Management

### Database Backups
Create a compressed binary dump of the PostgreSQL database:
```bash
docker compose exec postgres pg_dump -U portal -d portal -Fc > portal.dump
```

Restore the dump into a clean database:
```bash
docker compose exec -T postgres pg_restore -U portal -d portal --clean < portal.dump
```

### API Key & Webhook Rotation
1. **API Key Rotation**: Generate a new REST key in your Twenty CRM console. Update `TWENTY_API_KEY` in `.env` and recreate the portal container. Test the sync in `/admin`. Once confirmed, delete the old key in Twenty.
2. **Webhook Secret Rotation**: Change the webhook signing key inside Twenty, update `TWENTY_WEBHOOK_SECRET` in `.env` and restart.

### Production Reverse Proxy Configurations

Ensure the application is behind a secure TLS-terminating proxy (like Caddy or Nginx) to enforce secure session cookies (`__secure-` prefixed).

#### Nginx Configuration Snippet
```nginx
server {
    listen 443 ssl http2;
    server_name portal.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/portal.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portal.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Troubleshooting

- **Database Migration Locks**: If a migration fails due to lock timeouts, verify no other processes are actively holding schema locks (or restart PostgreSQL).
- **Better Auth Signature Verification Failures**: Verify `AUTH_SECRET` is defined identically across replicas. Better Auth encrypts internal session payloads; mismatching secrets prevent authentication state decryption.
- **Twenty Webhook Logs showing `401 Unauthorized`**:
  1. Inspect webhook signature headers.
  2. Verify `TWENTY_WEBHOOK_SECRET` in `.env` matches the signing secret displayed on the webhook dashboard inside Twenty exactly.
