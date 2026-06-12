#!/bin/sh

set -eu

if [ "${1:-}" != "--yes" ]; then
  cat <<'EOF'
This permanently deletes the portal PostgreSQL database and all portal data.

Run this command again with explicit confirmation:
  sh scripts/reset-docker.sh --yes
EOF
  exit 1
fi

echo "Checking Docker and Compose configuration..."
docker info >/dev/null
docker compose config --quiet

echo "Stopping the portal and deleting this Compose project's volumes..."
docker compose down --volumes --remove-orphans

echo "Rebuilding the portal image without cached application layers..."
docker compose build --no-cache portal

echo "Starting a fresh PostgreSQL database..."
docker compose up -d postgres

echo "Waiting for PostgreSQL to accept connections..."
attempt=0
while [ "$attempt" -lt 60 ]; do
  if docker compose exec -T postgres pg_isready -U portal -d portal >/dev/null 2>&1; then
    break
  fi

  attempt=$((attempt + 1))
  sleep 2
done

if [ "$attempt" -ge 60 ]; then
  echo "PostgreSQL did not become ready."
  docker compose logs --tail=100 postgres
  exit 1
fi

echo "Applying migrations in a one-time portal container..."
if ! docker compose run --rm --no-deps portal npm run db:migrate; then
  echo "Database migration failed."
  docker compose logs --tail=100 postgres
  exit 1
fi

echo "Verifying the Better Auth schema..."
defaults="$(
  docker compose exec -T postgres psql -U portal -d portal -Atc \
    "select count(*) from information_schema.columns where table_schema = 'public' and table_name in ('user', 'account', 'session', 'verification') and column_name = 'id' and column_default is not null"
)"

if [ "$defaults" != "4" ]; then
  echo "Expected four Better Auth ID defaults, but found: $defaults"
  docker compose exec -T postgres psql -U portal -d portal -c \
    "select table_name, column_name, column_default from information_schema.columns where table_schema = 'public' and table_name in ('user', 'account', 'session', 'verification') and column_name = 'id' order by table_name"
  exit 1
fi

echo "Starting the portal..."
docker compose up -d portal

echo "Waiting for the portal readiness check..."
attempt=0
while [ "$attempt" -lt 60 ]; do
  if docker compose exec -T portal wget --quiet --tries=1 --spider \
    http://localhost:3000/health/ready >/dev/null 2>&1; then
    echo "Fresh database verified: all Better Auth ID defaults are installed."
    echo "Portal readiness check passed."
    echo "Open the APP_URL from .env and complete /setup using SETUP_TOKEN."
    exit 0
  fi

  attempt=$((attempt + 1))
  sleep 2
done

echo "The database schema is valid, but the portal did not become ready."
docker compose ps -a
docker compose logs --tail=150 portal
exit 1
