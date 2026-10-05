# Family Dashboard

Open-source, self-hosted family information center. Turn spare tablets and phones into always-on family displays.

**Current status: TASK-008 complete** (Admin dashboard editor).  
Next: **TASK-009** — Display page.

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS, SQLite + Drizzle, Zod, iron-session
- Vitest + Playwright, Docker, Node.js 24 LTS
- react-grid-layout (admin editor)

## Local Development

```bash
cp .env.example .env
npm install --legacy-peer-deps
npm run db:migrate
npm run dev
```

## Admin UI (TASK-008)

1. Login at `/login` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`)
2. `/admin` — dashboard list: create / rename / delete / open editor
3. `/admin/dashboards/[id]` — editor:
   - Breakpoints: desktop / tablet / mobile
   - Add widgets from registry; drag by title bar; resize; auto-save layout (~800ms debounce)
   - Settings modal uses each widget’s editor; delete with confirm

```bash
npx playwright install chromium
npm run test:e2e
```

## Widget Registry (TASK-007)

Add widgets under `src/widgets/<name>/` then `registerWidget(def)` in `src/widgets/index.ts`.

`GET /api/widgets/registry` — list type + metadata + defaultConfig (auth).

## APIs (TASK-004–006)

- Dashboards: `/api/dashboards`
- Widgets: `/api/dashboards/[id]/widgets`
- Layout: `GET|PUT /api/dashboards/[id]/layout` (**full replace**)

## Quality Gates

```bash
npm install --legacy-peer-deps
npm run lint && npx prettier --check . && npm run test && npm run test:e2e && npm run build
```

## Next Steps

- **TASK-009**: Display page
