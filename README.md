# Family Dashboard

Open-source, self-hosted family information center. Turn spare tablets and phones into always-on family displays.

**Current status: TASK-007 complete** (Widget registry + Clock).  
Next: **TASK-008** — Admin editor UI.

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

## Local Development

```bash
cp .env.example .env
npm install --legacy-peer-deps
npm run db:migrate
npm run dev
```

## Widget Registry (TASK-007)

Built-in widgets under `src/widgets/`. Currently: **Clock**.

### How to add a new widget

1. Create `src/widgets/<name>/`:
   - `config.ts` — `defaultConfig` + Zod `configSchema` (server-safe)
   - `XxxRenderer.tsx` — `"use client"` display component
   - `XxxEditor.tsx` — `"use client"` settings form
   - `definition.ts` — assembles `WidgetDefinition`
2. Call `registerWidget(def)` from `src/widgets/index.ts`
3. Add the type string to `WIDGET_TYPES` in `src/lib/widgets.ts`
4. Add server-safe config entry in `REGISTERED_CONFIG` / `resolveRegisteredConfig` (same file)

### Registry API

| Method | Path                    | Description                                              |
| ------ | ----------------------- | -------------------------------------------------------- |
| `GET`  | `/api/widgets/registry` | List `{ type, metadata, defaultConfig }` (auth required) |

## Layout API (TASK-006)

| Method | Path                          | Description                           |
| ------ | ----------------------------- | ------------------------------------- |
| `GET`  | `/api/dashboards/[id]/layout` | List layouts                          |
| `PUT`  | `/api/dashboards/[id]/layout` | **Full replace** `{ layouts: [...] }` |

## Widget API (TASK-005)

CRUD under `/api/dashboards/[id]/widgets`. Registered types (e.g. clock) validate config via schema and store merged defaults.

## Dashboard API (TASK-004)

CRUD under `/api/dashboards`.

## Authentication (TASK-003)

`iron-session`. Set `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

## Quality Gates

```bash
npm install --legacy-peer-deps
npm run lint && npx prettier --check . && npm run test && npm run build
```

## Next Steps

- **TASK-008**: Admin editor UI
