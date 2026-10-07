# Family Dashboard

Open-source, self-hosted family information center. Turn spare tablets and phones into always-on family displays.

**Current status: TASK-022 complete** (server data cache).  
Next: further product tasks as planned.

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

## Data cache (TASK-022)

External API reads share one server-side in-memory cache (`getCached`). Nothing is stored in the browser. OAuth tokens never go into cache keys or logs.

| Key                    | Data                                                                           | Default TTL                         |
| ---------------------- | ------------------------------------------------------------------------------ | ----------------------------------- |
| `weather:{postalCode}` | Open-Meteo current + 7-day forecast (postal normalized, e.g. `weather:J4L3B3`) | 15 minutes (`CACHE_TTL_WEATHER_MS`) |
| `gtasks:{listId}`      | Incomplete Google Tasks in that list                                           | 5 minutes (`CACHE_TTL_GTASKS_MS`)   |

- Fresh hit → return cached value, skip the network.
- TTL expired → refetch, replace the entry.
- Fetcher throws and an old entry exists → return that entry with `stale: true`.
- Fetcher throws and nothing is cached → error (weather API 503; Tasks API existing error mapping).
- Every hit includes `fetchedAt` (epoch ms in the data layer; ISO string on HTTP JSON). Weather widgets still show “X 分钟前更新” from `now.updatedAt`.
- Creating or completing a task invalidates `gtasks:{listId}`.
- Home Assistant sensors are **not** cached (live values).

## 展示链接管理 (TASK-010)

在 `/admin` 看板列表点 **展示链接**：

1. **新建链接** — 可选名称；创建后完整 URL **只显示一次**，请立即复制
2. **禁用 / 启用** — 禁用后 `/display/<token>` 显示「已被禁用」
3. **重新生成** — 旧链接立即失效，新 URL 只显示一次
4. **删除** — 二次确认后删除记录

API：

| 方法     | 路径                                                           |
| -------- | -------------------------------------------------------------- |
| `GET`    | `/api/dashboards/[id]/display-tokens` （无明文）               |
| `POST`   | `/api/dashboards/[id]/display-tokens`                          |
| `PATCH`  | `/api/dashboards/[id]/display-tokens/[tokenId]` `{ isActive }` |
| `POST`   | `/api/dashboards/[id]/display-tokens/[tokenId]/regenerate`     |
| `DELETE` | `/api/dashboards/[id]/display-tokens/[tokenId]`                |

## Display (TASK-009)

- Public URL: `/display/<token>` — **no login** required
- Invalid token → "链接无效或已失效"; disabled → "该展示链接已被禁用"
- Create token (admin session): `POST /api/dashboards/[id]/display-tokens` body `{ name? }`
  → `{ token, displayUrl, id }` (plain token returned **once**; DB stores SHA-256 only)
- Disable (minimal): `PATCH /api/dashboards/[id]/display-tokens/[tokenId]` `{ isActive: false }`

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

- Further tasks per development plan
