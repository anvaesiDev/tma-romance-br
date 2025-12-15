#!/bin/sh

SCHEMA="/app/apps/api/prisma/schema.prisma"
SEED="/app/apps/api/prisma/seed.ts"

echo "Running database migrations..."
npx prisma db push --skip-generate --schema="$SCHEMA"

echo "Checking if seed needed..."
# Just run seed - it will handle the logic internally
npx tsx "$SEED" || echo "Seed completed or skipped"

echo "Starting API..."
exec node /app/apps/api/dist/index.js
