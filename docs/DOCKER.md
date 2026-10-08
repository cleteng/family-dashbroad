# Docker 部署（TASK-025）

生产镜像 + Compose。SQLite 与 HA 运行时配置落在 volume `/data`，容器重建不丢数据。  
反向代理（Caddy 等）见后续 TASK-026。

## 快速开始

```bash
cp .env.example .env
# 编辑 .env：至少设置 SESSION_SECRET（≥32 字符）、ADMIN_EMAIL、ADMIN_PASSWORD
# 可选：GOOGLE_*、HA_URL / HA_TOKEN、APP_URL、WEATHER_DEFAULT_POSTAL

docker compose up -d --build
```

浏览器打开 `http://localhost:3000`（或你在 `APP_URL` 里写的地址）。

停止 / 再启动（数据保留）：

```bash
docker compose down
docker compose up -d
```

## 持久化

| 路径 | 内容 |
|------|------|
| `/data/app.db` | SQLite（用户、看板、小部件、integrations…） |
| `/data/ha-config.json` | Home Assistant URL/token（若在 Admin 里保存） |

Compose 使用命名卷 `app-data` 挂载到 `/data`。  
`DATABASE_URL` 默认 `file:/data/app.db`，可在 `.env` 覆盖。

**不要**把 `/data`、`.env`、`*.db` 提交 Git（已在 `.gitignore` / `.dockerignore`）。

## 密钥（禁止写入镜像或源码）

通过 `.env` 或编排环境注入：

- `SESSION_SECRET`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`（仅空库首次种子）
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI`
- `HA_URL` / `HA_TOKEN`

Dockerfile 与 compose 文件中不含真实密钥。

## 常用命令

```bash
docker compose config          # 校验 compose
docker compose build           # 仅构建
docker compose logs -f app     # 日志
docker compose down -v         # 警告：-v 会删除 volume，数据清空
```

## 数据仍在的验证思路

1. `docker compose up -d --build`
2. 登录 Admin，改一点配置或添加小部件
3. `docker compose down && docker compose up -d`
4. 再次打开确认数据仍在

## 说明

- 镜像基于 `output: "standalone"`，入口为 `node server.js`
- 不包含独立数据库容器（SQLite 文件卷）
- 不包含 Caddy / TLS（TASK-026）

## VPS + HTTPS

See [VPS.md](./VPS.md) for Caddy, domain, backup, and upgrade.
