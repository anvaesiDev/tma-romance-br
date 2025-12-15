FROM node:22-slim

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared and api
RUN pnpm --filter @tma-romance/shared build 2>/dev/null || true
RUN pnpm --filter @tma-romance/api build

# Expose port
EXPOSE 3000

# Start
CMD ["node", "apps/api/dist/index.js"]
