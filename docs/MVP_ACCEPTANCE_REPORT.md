# MVP Acceptance Report — Family Dashboard

**Task:** TASK-029  
**Date:** 2026-10-08  
**Branch baseline:** `main` (post TASK-028) + TASK-029 report  

---

## 1. Test environment

| Item | Value |
|------|--------|
| Application | family-dashboard (Next.js 16 standalone, SQLite) |
| Code base | GitHub `cleteng/family-dashbroad` |
| Automated checks available | `tsc` / lint / prettier / vitest / `next build` (run on developer machine) |
| Docker | Dockerfile multi-stage + `docker-compose` + optional Caddy profile |
| CI/VPS live run in this report | **Not executed on a public VPS from the agent environment** |

This report combines: (A) code & unit-test inventory, (B) acceptance checklist for the operator to tick on real hardware, (C) known gaps.

---

## 2. Test devices (operator to fill)

| Device | Used? | Notes |
|--------|-------|-------|
| Desktop | ☐ | |
| iPad | ☐ | |
| iPhone | ☐ | |
| Android tablet/phone | ☐ | |

## 3. Test browsers (operator to fill)

| Browser | Used? | Version |
|---------|-------|---------|
| Desktop Chrome | ☐ | |
| iPad Safari | ☐ | |
| iPhone Safari | ☐ | |
| Android Chrome | ☐ | |
| Firefox / macOS Safari | ☐ | optional |

---

## 4–6. Test items — status

Legend: **PASS-code** = implemented + covered by unit tests or clear code path; **PASS-ops** = requires operator live check; **GAP** = incomplete / needs operator or external service; **N/A**.

### Deployment

| Item | Status | Evidence / note |
|------|--------|-----------------|
| Clean deploy docs | PASS-code | `docs/USER_GUIDE.md`, `DOCKER.md`, `VPS.md` |
| Docker / Compose | PASS-code | `Dockerfile`, `docker-compose.yml`, volume `/data` |
| HTTPS (Caddy) | PASS-ops | Profile `with-caddy` + `deploy/Caddyfile` — needs real domain |
| VPS reboot data keep | PASS-ops | `restart: unless-stopped` + named volume — verify on VPS |

### Admin

| Item | Status | Evidence / note |
|------|--------|-----------------|
| Admin seed / login | PASS-code | iron-session + `.env` first user; `tests/unit/auth.test.ts` |
| Create dashboard | PASS-code | dashboards API + `DashboardList` |
| Add / edit widget | PASS-code | registry + editors |
| Layout drag/save | PASS-code | react-grid-layout + layouts lib |
| Live UI click-through | PASS-ops | Operator |

### Display

| Item | Status | Evidence / note |
|------|--------|-----------------|
| Display token create | PASS-code | TASK-010; one-time URL; unit tests |
| Open Display URL | PASS-code | `/display/[token]` + `DisplayBoard` |
| Desktop / mobile layout | PASS-ops | Breakpoints in DisplayBoard; COMPATIBILITY.md |
| Long-running | PASS-code | TASK-024 online/visibility/heartbeat; keep last data |
| Live tablet soak | PASS-ops | Operator ≥30–60 min |

### Calendar

| Item | Status | Evidence / note |
|------|--------|-----------------|
| Gregorian | PASS-code | `src/lib/calendar.ts` + widget tests |
| Lunar | PASS-code | lunar-javascript |
| Solar terms | PASS-code | calendar layer |
| Canada holidays | PASS-code | shown when enabled |
| China holidays | PASS-code | red emphasis |
| 中国挂历 widget | PASS-code | chinese-almanac + tests |
| China holiday **date red** | PASS-code | `text-red-400` |
| Non-China (Canada) holiday **green** | PASS-code | **TASK-029 fix:** `text-green-400` (was amber) |

### Weather

| Item | Status | Evidence / note |
|------|--------|-----------------|
| Postal config | PASS-code | widget config + API |
| Geocode + forecast | PASS-code | Open-Meteo; cache 15m + geocode 24h |
| Fallback on failure | PASS-code | data-cache stale; widget keeps last payload |
| Live network | PASS-ops | Operator |

### Home Assistant

| Item | Status | Evidence / note |
|------|--------|-----------------|
| Config + test connection | PASS-code | Admin HA settings |
| Temp / humidity / air presets | PASS-code | ha-presets + sensor widget |
| Token not on Display | PASS-code | server-side only; public proxy API |
| Live HA instance | PASS-ops | Needs real HA |

### Google Tasks

| Item | Status | Evidence / note |
|------|--------|-----------------|
| OAuth + lists + incomplete | PASS-code | TASK-019/020/021; unit + API tests |
| Complete task | PASS-code | provider + todo widget |
| Auth failure handling | PASS-code | structured errors → UI states |
| Token not exposed | PASS-code | encrypted refresh in DB; not in client JSON |
| Live Google account | PASS-ops | Needs OAuth client + user consent |

### Reliability

| Item | Status | Evidence / note |
|------|--------|-----------------|
| Widget isolation | PASS-code | WidgetErrorBoundary TASK-023 |
| Network short outage recovery | PASS-code | TASK-024 events + keep last data |
| Provider timeout | PASS-code | Abort timeouts weather/HA/tasks |
| Cache fallback | PASS-code | TASK-022 |
| Restart keeps data | PASS-ops | Docker volume |

### Backup

| Item | Status | Evidence / note |
|------|--------|-----------------|
| Backup script | PASS-code | `scripts/backup-data.sh` |
| Restore script | PASS-code | `scripts/restore-data.sh` |
| Live backup round-trip | PASS-ops | Operator |

---

## 7. Known issues

1. **Agent environment cannot bind real iPad/HA/Google/VPS** — PASS-ops rows must be ticked by the project owner.  
2. **Canada holiday color** was amber; corrected to green for MVP checklist alignment (TASK-029).  
3. **Admin drag-layout** is best on desktop; phones are secondary (documented in COMPATIBILITY).  
4. **`navigator.onLine`** can be optimistic; recovery also relies on visibility + heartbeat refresh.  
5. **First admin** only seeded when users table is empty; changing `.env` password later does not reset existing user.

---

## 8. Risks

| Risk | Mitigation |
|------|------------|
| Google OAuth misconfigured redirect | Document HTTPS callback in VPS.md / USER_GUIDE |
| HA only on LAN | Display device must reach HA URL or use VPN/proxy |
| Volume deleted with `docker compose down -v` | Documented strongly in USER_GUIDE |
| Secrets in `.env` | gitignored; chmod 600 guidance |
| Long-term tablet heat/sleep | OS display settings outside app control |

---

## 9. Recommendation

**Conditional go for family self-hosted MVP**, provided the operator completes the PASS-ops checklist on at least:

1. One desktop browser (Admin + Display)  
2. One target tablet (iPad Safari or Android Chrome) for Display  
3. Optional but recommended: real HA and/or Google Tasks if those widgets will be used  

**Not a hard “no”** on product readiness from a feature-completeness perspective: core flows, isolation, cache, Docker/Caddy docs, backup scripts, and unit coverage for data layers are in place.

**Blocking for “production for non-technical relatives” until:** live HTTPS Display on the actual wall tablet is confirmed once.

---

## Operator sign-off

| Role | Name | Date | Signature / note |
|------|------|------|------------------|
| Deployer | | | |
| Tablet check | | | |
| Integrations (HA/Google) | | | |

---

## Appendix — automated test inventory

Unit tests present under `tests/unit/` include: auth, dashboards, layouts, widgets/registry, calendar, chinese-almanac, weather, data-cache, display-runtime, display-tokens, error-isolation, home-assistant, ha-presets/sensor, google-oauth, google-tasks (+ API), todo-widget, smoke, db.

Suggested gate before calling MVP “green”:

```bash
npx tsc --noEmit
npm run lint
npx prettier --check .
npm run test
npm run build
docker compose config
```
