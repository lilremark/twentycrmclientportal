#!/bin/sh

set -eu

# Print usage instructions
usage() {
  cat <<EOF
Playwright Screenshot Runner in Docker

Usage:
  sh scripts/take-screenshots.sh [compose | host | local]

Modes:
  compose   Run against the active Docker Compose portal service (default)
            Points to http://portal:3000 on the bridge network.
  host      Run against port 3005 mapped on your macOS host (uses host.docker.internal)
            Points to http://host.docker.internal:3005.
  local     Run against standard local npm run dev (uses host.docker.internal:3000)
            Points to http://host.docker.internal:3000.

Examples:
  sh scripts/take-screenshots.sh compose
  sh scripts/take-screenshots.sh local
EOF
  exit 1
}

MODE="${1:-compose}"
PLAYWRIGHT_VERSION="v1.60.0-noble"
PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:${PLAYWRIGHT_VERSION}"

# Create screenshots directory to ensure correct ownership on host
mkdir -p screenshots

case "$MODE" in
  compose)
    echo "Running in COMPOSE mode..."
    echo "This connects to the 'portal' container inside the 'twentycrmclientportal_default' network on port 3000."
    echo "Ensure the portal is running (docker compose up -d)."
    
    # Check if network exists
    if ! docker network inspect twentycrmclientportal_default >/dev/null 2>&1; then
      echo "Error: Docker network 'twentycrmclientportal_default' not found."
      echo "Please start the portal first with: docker compose up -d"
      exit 1
    fi
    
    docker run --rm \
      --network twentycrmclientportal_default \
      -e PLAYWRIGHT_BASE_URL=http://portal:3000 \
      -v "$(pwd)":/work \
      -w /work \
      "$PLAYWRIGHT_IMAGE" \
      npx playwright test tests/e2e/screenshots.spec.ts
    ;;
    
  host)
    echo "Running in HOST mode..."
    echo "This connects to your host machine at port 3005 via host.docker.internal."
    echo "Ensure the application is accessible on http://localhost:3005"
    
    docker run --rm \
      -e PLAYWRIGHT_BASE_URL=http://host.docker.internal:3005 \
      -v "$(pwd)":/work \
      -w /work \
      "$PLAYWRIGHT_IMAGE" \
      npx playwright test tests/e2e/screenshots.spec.ts
    ;;
    
  local)
    echo "Running in LOCAL mode..."
    echo "This connects to a dev server running on your host machine at port 3000 via host.docker.internal."
    echo "Ensure the application is accessible on http://localhost:3000 (npm run dev)"
    
    docker run --rm \
      -e PLAYWRIGHT_BASE_URL=http://host.docker.internal:3000 \
      -v "$(pwd)":/work \
      -w /work \
      "$PLAYWRIGHT_IMAGE" \
      npx playwright test tests/e2e/screenshots.spec.ts
    ;;
    
  *)
    usage
    ;;
esac

echo "=========================================================="
echo "Screenshots generated successfully! Check the './screenshots' folder."
echo "=========================================================="
