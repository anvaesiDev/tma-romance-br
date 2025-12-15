#!/bin/sh

cd /app/apps/api

echo "Running database migrations..."
npx prisma db push --skip-generate

echo "Checking if seed needed..."
# Check if Series table has any rows
RESULT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM \"Series\"" 2>&1 || true)

if echo "$RESULT" | grep -q '"count": 0' || echo "$RESULT" | grep -q 'count.*0' || echo "$RESULT" | grep -q 'does not exist'; then
  echo "No series found or table missing, running seed..."
  npx tsx prisma/seed.ts
else
  echo "Data exists, skipping seed"
fi

cd /app
echo "Starting API..."
exec node apps/api/dist/index.js
