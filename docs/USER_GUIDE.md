# Family Dashboard 用户手册

把闲置平板 / 手机变成家里的常亮信息屏：天气、日历、待办、Home Assistant 传感器等。

本文用「你点哪里、输入什么」的方式写，尽量少用术语。

---

## 一、快速开始（本机）

### 1. 项目简介

- **管理端（Admin）**：用电脑浏览器登录，编辑看板和小部件。
- **展示端（Display）**：用平板打开一条专用链接，全屏看信息（通常不用登录）。

### 2. 系统要求

- 电脑：Windows / macOS / Linux
- 已安装 **Node.js 24**（或用 Docker，见下文「部署」）
- 浏览器：Chrome / Edge / Safari / Firefox 均可

### 3. 安装（不用 Docker）

在项目文件夹里打开终端，依次执行：

```bash
cp .env.example .env
```

用记事本打开 `.env`，至少改这三项（**不要发给别人**）：

1. `SESSION_SECRET`：一长串随机字符（至少 32 个）。可在终端生成：
   ```bash
   openssl rand -base64 32
   ```
2. `ADMIN_EMAIL`：你的管理员邮箱，例如 `you@example.com`
3. `ADMIN_PASSWORD`：至少 12 位的密码

然后：

```bash
npm install --legacy-peer-deps
npm run db:migrate
npm run dev
```

看到类似 “Ready” 后，浏览器打开：

```text
http://localhost:3000
```

### 4. 管理员登录

1. 打开 `http://localhost:3000/login`（或首页会跳到登录）
2. 输入你在 `.env` 里写的 **ADMIN_EMAIL** 和 **ADMIN_PASSWORD**
3. 进入 **看板管理**（`/admin`）

> 只有数据库里还没有任何用户时，才会用 `.env` 里的邮箱密码创建第一个管理员。之后改密码请在系统内处理或重建数据库（见排障）。

### 5. 创建看板（Dashboard）

1. 在 `/admin` 点击创建看板（或等价「新建」按钮）
2. 起一个名字，例如「客厅」
3. 进入该看板的编辑页

### 6. 添加小部件（Widget）

1. 在看板编辑页点 **添加小部件**
2. 选择类型（见下文「小部件说明」）
3. 拖拽调整位置和大小；点 **设置** 配置内容
4. 保存（若界面有保存提示，以界面为准）

常用类型：

| 名称 | 作用 |
|------|------|
| 时钟 | 当前时间 |
| 日历 | 月历（含农历等） |
| 传统挂历 | 单日黄历风格 |
| 天气 | 当前天气与预报（需邮编） |
| HA 传感器 | Home Assistant 数值/状态 |
| 待办 | Google 任务列表 |

### 7. 创建展示链接（Display URL）

1. 回到 `/admin` 看板列表
2. 点该看板的 **展示链接**
3. **新建链接**（可填备注名称）
4. 弹出的完整网址 **只显示一次** → 立刻复制保存
5. 在平板 Safari / Chrome 打开该链接；可「添加到主屏幕」全屏使用

管理操作：

- **禁用 / 启用**：临时关掉展示，不必删链接
- **重新生成**：旧链接立刻失效，生成新链接（仍只显示一次）
- **删除**：确认后永久删除

---

## 二、部署

更细的命令见 [DOCKER.md](./DOCKER.md)、[VPS.md](./VPS.md)。这里是摘要。

### Docker（本机或服务器）

```bash
cp .env.example .env
# 编辑 .env（SESSION_SECRET、管理员账号等）

docker compose up -d --build
```

浏览器打开 `http://localhost:3000`（或你在 `APP_URL` 写的地址）。

数据在 Docker 卷里，对应容器内 `/data/app.db`。  
`docker compose down` 再 `up` **不会丢数据**（不要加 `-v`）。

### VPS + HTTPS（推荐家里公网访问）

1. 域名解析到服务器 IP
2. `.env` 中设置：
   - `DOMAIN=你的域名`
   - `APP_URL=https://你的域名`
3. 启动：
   ```bash
   docker compose --profile with-caddy up -d --build
   ```
4. 用 `https://你的域名` 访问；Caddy 自动申请证书

展示链接也应是 `https://…/display/…`，旧 iPad 请用 HTTPS。

### 更新

```bash
./scripts/backup-data.sh ./backups
git pull origin main
docker compose --profile with-caddy up -d --build
```

无 Caddy 时去掉 `--profile with-caddy`。

### 重启

```bash
docker compose restart
# 或
docker compose down
docker compose --profile with-caddy up -d
```

### 备份

```bash
./scripts/backup-data.sh ./backups
```

备份目录示例：`backups/20260101T120000Z/app.db`  
建议每天备份，并拷到另一台电脑或网盘；脚本**不会**打印密码或 Token。

### 恢复

```bash
./scripts/restore-data.sh ./backups/某次时间戳目录
```

---

## 三、对接外部服务

### 天气

- 数据来源：Open-Meteo（无需申请密钥）
- 在小部件设置里填写**邮编**（加拿大邮编较稳妥；默认可用 `.env` 的 `WEATHER_DEFAULT_POSTAL`）
- 无数据时：检查邮编、网络；过几分钟自动重试

### Home Assistant

1. 在 HA 中创建**长期访问令牌**
2. 打开 Admin → **Home Assistant** 设置页（`/admin/settings/home-assistant`）
3. 填写 HA 地址（如 `http://家中HA的IP:8123`）和令牌，测试连接并保存  
   （也可在 `.env` 写 `HA_URL` / `HA_TOKEN`）
4. 添加 **HA 传感器** 小部件，选择实体；可用「从预设添加」快捷匹配温湿度等

令牌只存在服务器，不会出现在展示页。

### Google 待办（Tasks）

1. 在 [Google Cloud Console](https://console.cloud.google.com/) 创建 OAuth 客户端（Web），启用 **Google Tasks API**
2. 重定向 URI 必须与线上一致，例如：
   ```text
   https://你的域名/api/auth/google/callback
   ```
   本地开发则为 `http://localhost:3000/api/auth/google/callback`
3. 把 Client ID / Secret 写入 `.env`：`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`
4. Admin → **Google** 设置 → **连接 Google**
5. 添加 **待办** 小部件，选择任务清单

未连接时，小部件会提示「去连接 Google」，不会整页崩溃。

---

## 四、看板与展示

### 小部件与布局

- 在 Admin 编辑器中**拖拽**调整格子位置与大小
- 不同屏幕宽度会用不同断点布局（手机 / 平板 / 桌面）
- 单个小部件出错只影响自己，其它小部件继续显示

### 展示页（Display）

- 用展示链接打开，适合墙挂平板长时间亮着
- 网络短暂断开时尽量显示**上次成功**的数据，恢复后自动同步
- 完整刷新页面后，只要链接未禁用，仍打开同一看板

### 响应式

- 展示页会随窗口宽度切换布局
- 旧版 iPad Safari、手机 Chrome 为主要目标；请用 HTTPS 公网地址

---

## 五、排障

### 无法登录

- 确认访问的是正确地址（本机 `localhost:3000` 或你的 HTTPS 域名）
- 核对 `.env` 里邮箱、密码（首次安装且库为空时才会用这两项建管理员）
- 清除该站点 Cookie 后再试
- `SESSION_SECRET` 若中途被改掉，旧会话会全部失效，重新登录即可

### Display 打不开 / 提示无效

- 链接是否完整复制（很长一串）
- 是否在 Admin 里被**禁用**或**重新生成**（旧链会失效）
- 是否用了 http 而服务器只提供 https（改用 https）

### 小部件没有数据

- 是否保存了小部件设置（邮编、实体、清单是否已选）
- 展示页网络是否正常；可稍等自动刷新
- 看该卡片是否显示「加载失败」类提示（其它卡片应仍正常）

### Google 待办显示未连接

- `.env` 是否配置 Client ID/Secret 并**重启**容器/进程
- Google Cloud 回调 URI 是否与 `APP_URL` 完全一致（含 https）
- 是否在 Admin → Google 完成授权；可断开后重连

### Home Assistant 未连接

- HA 地址平板所在网络能否访问（家中局域网 IP）
- 令牌是否过期；在 HA 里重新创建长期令牌
- 到 Admin → Home Assistant 点测试连接

### 天气失败

- 换一个明确的邮编或城市邮编再试
- 服务器能否访问公网（Open-Meteo）
- 稍后再试（有缓存与过期兜底）

### Docker 启动失败

- 查看日志：`docker compose logs -f app`
- 是否忘记创建 `.env` 或未设置 `SESSION_SECRET`
- 端口 3000 / 80 / 443 是否被占用
- 使用 Caddy 时是否设置了 `DOMAIN`，且 DNS 已指向服务器

### SQLite / 数据丢失

- Docker 是否执行了 `docker compose down **-v**`（`-v` 会删卷，数据没了）
- 用之前的 `./scripts/backup-data.sh` 备份做 `./scripts/restore-data.sh`
- 确认 `DATABASE_URL` 指向 `/data/app.db`（容器内）且 volume 仍在：
  ```bash
  docker volume ls
  ```

---

## 六、安全提醒

- 不要把 `.env`、备份里的数据库发到公开聊天或 GitHub
- 公网部署务必使用 **HTTPS**
- 展示链接相当于「能看家中看板的钥匙」，只发给信任的人；泄露请**重新生成**

---

## 七、开发者命令对照

与 `package.json` 一致，供熟悉终端的用户核对：

| 命令 | 作用 |
|------|------|
| `npm run dev` | 本地开发 |
| `npm run build` | 生产构建 |
| `npm run start` | 本地以生产模式启动（需先 build） |
| `npm run lint` | 代码检查 |
| `npm run format` / `format:check` | 格式化 / 检查 |
| `npm run test` | 单元测试 |
| `npm run test:e2e` | 端到端测试 |
| `npm run db:migrate` | 数据库迁移 |

Docker 相关见 [DOCKER.md](./DOCKER.md)。
