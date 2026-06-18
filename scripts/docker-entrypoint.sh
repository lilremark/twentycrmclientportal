#!/bin/sh

set -eu

echo "Applying database migrations..."
node /app/scripts/migrate.mjs

echo "Checking optional administrator bootstrap..."
node /app/scripts/bootstrap-admin.mjs

echo "Starting Twenty CRM Client Portal..."
exec node /app/server.js
