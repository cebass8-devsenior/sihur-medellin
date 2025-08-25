#!/usr/bin/env bash
set -euo pipefail
set -x

# CI start wrapper: export DATABASE_URL and JWT_SECRET then start node in background
# Use an explicit DATABASE_URL for the CI Postgres container and rely on step-provided JWT_SECRET
DATABASE_URL="postgresql://sihur:sihurpassword@localhost:5432/sihurdb"
export DATABASE_URL

# JWT_SECRET should already be present in env from the workflow step; if not, fall back to a placeholder
export JWT_SECRET="${JWT_SECRET:-test-jwt-secret}"

echo "Starting server with DATABASE_URL=$DATABASE_URL"
node index.js >> server.log 2>&1 &
echo $! > /tmp/server.pid
disown
