#!/bin/sh

set -eu

echo "Applying database migrations..."
node /app/scripts/migrate.cjs

echo "Checking optional administrator bootstrap..."
node /app/scripts/bootstrap-admin.cjs

echo "Starting Twenty CRM Client Portal..."
exec node /app/server.js
