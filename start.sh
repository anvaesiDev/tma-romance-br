#!/bin/sh

cd /app/apps/api

echo "Running database migrations..."
# Use local prisma from node_modules to avoid version mismatch
./node_modules/.bin/prisma db push --schema="prisma/schema.prisma"

echo "Checking if seed needed..."
# Run seed with tsx
npx tsx prisma/seed.ts || echo "Seed completed or skipped"

echo "Starting API..."
ls -la /app/apps/api/dist || echo "dist directory not found"
exec node /app/apps/api/dist/index.js
