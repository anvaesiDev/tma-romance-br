#!/bin/sh

echo "Running database migrations..."
npx --prefix /app/apps/api prisma db push --skip-generate

echo "Checking if seed needed..."
SERIES_COUNT=$(npx --prefix /app/apps/api prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"Series\"" 2>&1 | grep -o '[0-9]*' | tail -1 || echo "0")

if [ "$SERIES_COUNT" = "0" ] || [ -z "$SERIES_COUNT" ]; then
  echo "No series found, running seed..."
  npx --prefix /app/apps/api tsx /app/apps/api/prisma/seed.ts
else
  echo "Data exists ($SERIES_COUNT series), skipping seed"
fi

echo "Starting API..."
exec node /app/apps/api/dist/index.js
