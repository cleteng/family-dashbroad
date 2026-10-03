# Family Dashboard

Open-source, self-hosted family information center. Turn spare tablets and phones into always-on family displays.

This repository is currently at **TASK-001** (project foundation). No business features yet.

## Tech Stack (frozen for TASK-001)

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS
- SQLite + Drizzle ORM + better-sqlite3
- Zod
- Vitest + Playwright
- ESLint + Prettier
- Docker / Docker Compose
- Node.js 24 LTS

## Prerequisites

- Node.js 24+
- npm
- Docker (optional, for container runs)

## Local Development

```bash
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:3000

### Useful scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:watch` | Unit tests watch mode |
| `npm run test:e2e` | Playwright e2e |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Drizzle Studio |

## Database

SQLite path is controlled by `DATABASE_URL` (default `file:./data/app.db`).

The `data/` directory is created automatically and is git-ignored.

## Docker

```bash
docker compose up --build
```

- App listens on port 3000
- SQLite persists in the named volume mounted at `/data`
- Default `DATABASE_URL=file:/data/app.db`

Verify persistence:

```bash
docker compose down
docker compose up -d
# database file survives
```

## Project Structure

```text
src/
  app/           # Next.js App Router (admin, display, api routes later)
  components/    # Shared UI
  db/            # Drizzle client + schema
  lib/           # Utilities
  widgets/       # Widget registry & renderers (later)
  styles/        # Extra CSS
tests/
  unit/
  e2e/
drizzle/         # Generated migrations
```

## Quality Gates (TASK-001)

```bash
npm install
npm run lint
npm run test
npm run build
npm run test:e2e
docker build .
docker compose config
```

## Next Steps

- TASK-002: SQLite + Drizzle schema foundation
- TASK-003: Single administrator authentication

See the development plan and PRD for the full roadmap.
