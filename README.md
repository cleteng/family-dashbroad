# Family Dashboard

Open-source, self-hosted family information center.

**Current status: TASK-010 complete** (Display token management).  
Next: further product tasks as planned.

## Local Development

```bash
cp .env.example .env
npm install --legacy-peer-deps
npm run db:migrate
npm run dev
```

## 展示链接管理 (TASK-010)

在 `/admin` 看板列表点 **展示链接**：

1. **新建链接** — 可选名称；创建后完整 URL **只显示一次**，请立即复制
2. **禁用 / 启用** — 禁用后 `/display/<token>` 显示「已被禁用」
3. **重新生成** — 旧链接立即失效，新 URL 只显示一次
4. **删除** — 二次确认后删除记录

| 方法 | 路径 |
|------|------|
| `GET` | `/api/dashboards/[id]/display-tokens` （无明文） |
| `POST` | `/api/dashboards/[id]/display-tokens` |
| `PATCH` | `/api/dashboards/[id]/display-tokens/[tokenId]` |
| `POST` | `.../[tokenId]/regenerate` |
| `DELETE` | `/api/dashboards/[id]/display-tokens/[tokenId]` |

## Display (TASK-009)

Public `/display/<token>` — no login. Token stored as SHA-256 only.

## Admin UI (TASK-008)

`/admin` list + `/admin/dashboards/[id]` editor.

## Quality Gates

```bash
npm run lint && npx prettier --check . && npm run test && npm run test:e2e && npm run build
```
