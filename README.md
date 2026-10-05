# Family Dashboard

Open-source, self-hosted family information center. Turn spare tablets and phones into always-on family displays.

**Current status: TASK-005 complete** (Widget CRUD API).  
Next: **TASK-006** — Widget layout model.

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS
- SQLite + Drizzle ORM + better-sqlite3
- Zod
- Vitest + Playwright
- ESLint + Prettier
- Docker / Docker Compose
- Node.js 24 LTS
- iron-session (encrypted cookie sessions)

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

## Widget API (TASK-005)

All endpoints require auth. Dashboard must belong to the current user (else 404).

| Method   | Path                                      | Description                         |
| -------- | ----------------------------------------- | ----------------------------------- |
| `GET`    | `/api/dashboards/[id]/widgets`            | List widgets (created order)        |
| `POST`   | `/api/dashboards/[id]/widgets`            | Create `{ type, title?, config? }`  |
| `GET`    | `/api/dashboards/[id]/widgets/[widgetId]` | Get one                             |
| `PATCH`  | `/api/dashboards/[id]/widgets/[widgetId]` | Update `{ type?, title?, config? }` |
| `DELETE` | `/api/dashboards/[id]/widgets/[widgetId]` | Delete                              |

`type` whitelist: `clock`, `weather`, `calendar`, `chinese-almanac`, `google-tasks`, `home-assistant-sensor`.  
`config` is a JSON **object** (or null) at the API boundary.

## Dashboard API (TASK-004)

All endpoints require an authenticated admin session (cookie). Unauthenticated requests receive `401`.

| Method   | Path                   | Description                              |
| -------- | ---------------------- | ---------------------------------------- |
| `GET`    | `/api/dashboards`      | List current user's dashboards           |
| `POST`   | `/api/dashboards`      | Create `{ name, description? }`          |
| `GET`    | `/api/dashboards/[id]` | Get one (own only; else 404)             |
| `PATCH`  | `/api/dashboards/[id]` | Update `{ name?, description? }`         |
| `DELETE` | `/api/dashboards/[id]` | Delete (cascades widgets/layouts/tokens) |

## Authentication (TASK-003)

Single administrator via encrypted cookie session (`iron-session`).

1. Copy env and set secrets:
   ```bash
   cp .env.example .env
   # SESSION_SECRET — at least 32 chars
   # ADMIN_EMAIL / ADMIN_PASSWORD — first admin (≥12 chars)
   ```
2. Open `/login` to sign in. Admin UI is at `/admin`.
3. Display routes (`/display/<token>`) do **not** require login.

## Quality Gates

```bash
npm install --legacy-peer-deps
npm run lint
npm run test
npm run build
```

## Next Steps

- **TASK-006**: Widget layout model

See the development plan and PRD for the full roadmap.
