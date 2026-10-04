# Family Dashboard

Open-source, self-hosted family information center. Turn spare tablets and phones into always-on family displays.

**Current status: TASK-002 complete** (SQLite + Drizzle data layer).  
Next: **TASK-003** — Single administrator authentication.

## Tech Stack

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
npm install --legacy-peer-deps
npm run db:migrate
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

Core tables (TASK-002):

- `users`
- `dashboards`
- `widgets`
- `widget_layouts` (with CHECK: x>=0, y>=0, w>0, h>0)
- `display_tokens` (stores only token hash)
- `integrations` (config and credentials separated)

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
    schema/      # Table definitions
  lib/           # Utilities
  widgets/       # Widget registry & renderers (later)
  styles/        # Extra CSS
tests/
  unit/
  e2e/
drizzle/         # Migrations (committed)
```

## Quality Gates

```bash
npm install --legacy-peer-deps
npm run lint
npm run test
npm run build
npm run test:e2e
docker build .
docker compose config
```

## Next Steps

- **TASK-003**: Single administrator authentication
- Then vertical slice: Dashboard → Widget → Layout → Display Token → Display

See the development plan and PRD for the full roadmap.
