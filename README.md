# Family Dashboard

Open-source, self-hosted family information center. Turn spare tablets and phones into always-on family displays.

**Current status: TASK-006 complete** (Layout model API).  
Next: **TASK-007** — Widget registry.

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

## Layout API (TASK-006)

Auth required. Dashboard must belong to the current user.

| Method | Path                          | Description                                |
| ------ | ----------------------------- | ------------------------------------------ |
| `GET`  | `/api/dashboards/[id]/layout` | List all layout entries for this dashboard |
| `PUT`  | `/api/dashboards/[id]/layout` | **Full replace** `{ layouts: [...] }`      |

**Full-replace semantics:** `PUT` replaces the entire layout set for the dashboard.
Entries not included are deleted. An empty `layouts` array clears all layouts.
Invalid entries reject the whole request (transactional; no partial write).

Each entry: `{ widgetId, breakpoint: desktop|tablet|mobile, x, y, w, h }`  
(`x,y >= 0`, `w,h >= 1`, integers).

## Widget API (TASK-005)

All endpoints require auth. Dashboard must belong to the current user (else 404).

| Method   | Path                                      | Description                        |
| -------- | ----------------------------------------- | ---------------------------------- |
| `GET`    | `/api/dashboards/[id]/widgets`            | List widgets                       |
| `POST`   | `/api/dashboards/[id]/widgets`            | Create `{ type, title?, config? }` |
| `GET`    | `/api/dashboards/[id]/widgets/[widgetId]` | Get one                            |
| `PATCH`  | `/api/dashboards/[id]/widgets/[widgetId]` | Update                             |
| `DELETE` | `/api/dashboards/[id]/widgets/[widgetId]` | Delete                             |

## Dashboard API (TASK-004)

| Method   | Path                   | Description |
| -------- | ---------------------- | ----------- |
| `GET`    | `/api/dashboards`      | List        |
| `POST`   | `/api/dashboards`      | Create      |
| `GET`    | `/api/dashboards/[id]` | Get one     |
| `PATCH`  | `/api/dashboards/[id]` | Update      |
| `DELETE` | `/api/dashboards/[id]` | Delete      |

## Authentication (TASK-003)

Single administrator via `iron-session`. Set `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` in `.env`.

## Quality Gates

```bash
npm install --legacy-peer-deps
npm run lint && npx prettier --check . && npm run test && npm run build
```

## Next Steps

- **TASK-007**: Widget registry

See the development plan and PRD for the full roadmap.
