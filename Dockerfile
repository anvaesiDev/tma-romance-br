FROM node:22-slim

# Install pnpm and OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Generate Prisma client
RUN cd apps/api && pnpm db:generate

# Build API
RUN pnpm --filter @tma-romance/api build

# Expose port
EXPOSE 3000

# Start
CMD ["node", "apps/api/dist/index.js"]
