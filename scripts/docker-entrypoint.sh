#!/bin/sh

set -eu

echo "Applying database migrations..."
node /app/scripts/migrate.cjs

echo "Checking optional administrator bootstrap..."
node /app/scripts/bootstrap-admin.cjs

if [ "${DEMO_MODE:-false}" = "true" ]; then
  echo "Loading repeatable demo data..."
  node /app/scripts/seed-demo.cjs
fi

echo "Starting Twenty CRM Client Portal..."
exec node /app/server.js
