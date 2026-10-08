# VPS 生产部署（TASK-026）

架构：

```text
Internet → HTTPS → Caddy → app:3000 → SQLite /data
```

不把 3000 端口暴露到公网（默认只绑定 `127.0.0.1:3000` 便于本机调试）。

---

## 1. 准备 VPS

- 推荐：Ubuntu 22.04/24.04 LTS，1–2 GB RAM 即可
- 开放防火墙：**80、443**（TCP）；**不要**对公网开放 3000
- 域名 DNS：`A`（及可选 `AAAA`）指向 VPS 公网 IP

## 2. 安装 Docker

```bash
# 官方文档：https://docs.docker.com/engine/install/ubuntu/
sudo apt-get update
sudo apt-get install -y ca-certificates curl
# …按官方步骤安装 docker-ce 与 docker compose plugin
docker --version
docker compose version
```

## 3. 获取项目

```bash
git clone https://github.com/cleteng/family-dashbroad.git
cd family-dashbroad
git checkout main
```

## 4. 环境变量

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

至少设置：

| 变量 | 说明 |
|------|------|
| `SESSION_SECRET` | `openssl rand -base64 32`，≥32 字符 |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | 首次空库管理员（密码 ≥12 字符） |
| `DOMAIN` | 如 `dash.example.com`（Caddy） |
| `APP_URL` | **`https://dash.example.com`**（无尾斜杠） |
| `GOOGLE_CLIENT_ID` / `SECRET` | 可选；回调必须为 `https://域名/api/auth/google/callback` |
| `GOOGLE_REDIRECT_URI` | 同上完整 HTTPS URL |
| `HA_URL` / `HA_TOKEN` | 可选 |

Google Cloud Console 授权重定向 URI 填：

```text
https://你的域名/api/auth/google/callback
```

## 5. 启动（含 Caddy）

```bash
docker compose --profile with-caddy up -d --build
docker compose ps
docker compose logs -f caddy
```

仅本机调试 app（无 HTTPS）：

```bash
docker compose up -d --build
# 访问 http://127.0.0.1:3000
```

## 6. Caddy / 域名 / HTTPS

- 配置文件：`deploy/Caddyfile`
- Caddy 自动申请 Let’s Encrypt 证书（需 80 可达）
- 证书存在 Docker 卷 `caddy-data`

验证：

```bash
curl -I https://你的域名
```

浏览器打开 `https://你的域名` → Admin 登录。

## 7. Display URL

1. Admin 登录后创建/启用 **Display Token**
2. 使用返回的链接（应为 `https://你的域名/display/...`）
3. 旧 iPad Safari：用 HTTPS 打开即可；Display Runtime（TASK-024）支持短断网恢复

## 8. 持久化与重启

```text
VPS reboot → Docker restart unless-stopped → volume app-data 仍在 → SQLite 保留
```

```bash
sudo reboot
# 回来后
docker compose --profile with-caddy ps
```

## 9. 备份

脚本（不打印 token/密钥）：

```bash
./scripts/backup-data.sh ./backups
```

- **位置**：默认 `./backups/<UTC时间戳>/app.db`（及可选 `ha-config.json`）
- **频率建议**：每日一次；保留 7–14 天；并定期拷到机外（S3/另一台机器）
- **手动**：同上脚本，或停写时复制 volume 内 `/data/app.db`

### 恢复

```bash
./scripts/restore-data.sh ./backups/20260101T120000Z
```

恢复后检查 Admin 与 Display。

## 10. 升级

```text
Backup → pull → build/recreate → health check
```

```bash
./scripts/backup-data.sh ./backups
git pull origin main
docker compose --profile with-caddy up -d --build
curl -fsS -o /dev/null -w "%{http_code}\n" https://你的域名/login
```

### 回滚

```bash
git log --oneline -5
git checkout <previous-good-sha>
docker compose --profile with-caddy up -d --build
# 若库结构不兼容，再用对应备份：
# ./scripts/restore-data.sh ./backups/<stamp>
```

## 11. 安全清单

- [ ] `.env` 权限 `600`，不进 Git
- [ ] 公网仅 80/443
- [ ] Admin / Display 走 HTTPS
- [ ] Google 回调为 HTTPS
- [ ] Display Token 保持系统生成的高熵随机串
- [ ] SQLite 只在 volume 内，不通过 HTTP 直接下载

## 12. 验收检查表

- [ ] `https://域名` Admin 可登录
- [ ] Display HTTPS 可打开
- [ ] 证书有效（无浏览器警告）
- [ ] `docker compose down && up` 数据仍在
- [ ] VPS reboot 后容器与数据恢复
- [ ] 备份文件可恢复
