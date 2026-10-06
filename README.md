# Family Dashboard

Open-source, self-hosted family information center.

**Current status: TASK-009 complete** (Display renderer).  
Next: **TASK-010** — Display token management UI.

## Local Development

```bash
cp .env.example .env
npm install --legacy-peer-deps
npm run db:migrate
npm run dev
```

## Display (TASK-009)

- Public URL: `/display/<token>` — **no login** required
- Invalid token → "链接无效或已失效"; disabled → "该展示链接已被禁用"
- Create token (admin session): `POST /api/dashboards/[id]/display-tokens` body `{ name? }`
  → `{ token, displayUrl, id }` (plain token returned **once**; DB stores SHA-256 only)
- Disable (minimal): `PATCH /api/dashboards/[id]/display-tokens/[tokenId]` `{ isActive: false }`

## Admin UI (TASK-008)

Login `/login` → `/admin` list → `/admin/dashboards/[id]` editor.

## Quality Gates

```bash
npm run lint && npx prettier --check . && npm run test && npm run test:e2e && npm run build
```

## Next Steps

- **TASK-010**: Display token management UI
