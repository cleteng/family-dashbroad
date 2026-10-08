# syntax=docker/dockerfile:1
# Production image for family-dashboard (TASK-025).
# Multi-stage: native deps for better-sqlite3, Next.js standalone output.

FROM node:24-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

FROM node:24-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Build does not need real secrets; runtime injects them via compose/env.
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/data/app.db
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Persistent volume mount point (SQLite + ha-config.json)
RUN mkdir -p /data && chown node:node /data

# Next standalone server + static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

# standalone output places server.js at the image workdir root
CMD ["node", "server.js"]
