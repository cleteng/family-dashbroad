# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim

WORKDIR /app

# Native build tools for better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Data directory for SQLite volume
RUN mkdir -p /data && chown node:node /data

ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/app.db
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

USER node
EXPOSE 3000

CMD ["npm", "run", "start"]
