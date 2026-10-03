# Family Dashboard — Handover Document (TASK-001)

**Date**: 2026-10-03  
**From**: Previous agent (TASK-001)  
**To**: Next agent  
**Repository**: https://github.com/cleteng/family-dashbroad

---

## 1. Project Overview

Family Dashboard is an open-source, self-hosted family information center.  
Goal: turn old iPads / phones / tablets into always-on family displays.

Core architecture (Web-first):
- **Display**: Full-screen responsive web dashboard
- **Admin**: Responsive web admin (mobile / tablet / desktop)
- **Backend**: Unified API + data services
- Primary deploy target: VPS
- Secondary: Docker

This is a personal / family use project. Multi-tenant SaaS is **not** in scope for MVP.

---

## 2. What Was Completed (TASK-001)

TASK-001 = Project Foundation only. No business features implemented.

### Done

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS
- Project structure according to the TASK-001 spec
- SQLite + Drizzle ORM foundation (with `better-sqlite3`)
- Zod
- Vitest + Playwright smoke tests
- ESLint + Prettier
- Dockerfile + docker-compose.yml (with `/data` volume for SQLite)
- `.env.example`
- Basic home page + root layout
- README.md
- Git initialized on `main` with one commit:
  ```
  54c22b2 chore(TASK-001): initialize Next.js application
  ```

### Intentionally NOT done (by design)

- Any Dashboard / Widget / Layout business logic
- Authentication (TASK-003)
- Calendar / Weather / Home Assistant / Google Tasks
- Real migrations beyond empty schema

---

## 3. Important Technical Decisions (Frozen)

From TASK-001 spec:

| Item | Decision |
|------|----------|
| Framework | Next.js 16 + App Router |
| Language | TypeScript (strict) |
| Package manager | npm |
| CSS | Tailwind CSS |
| Database | SQLite + Drizzle + better-sqlite3 |
| Validation | Zod |
| Testing | Vitest (unit) + Playwright (e2e) |
| Node | 24 LTS |
| Git branch | `main` |
| Feature branches | `feat/TASK-xxx-description` |

**Note**: Earlier Development Plan mentioned PostgreSQL. TASK-001 explicitly froze on SQLite. Keep SQLite unless there is a strong reason to change later.

---

## 4. Current Project Structure

```text
family-dashboard/
├── src/
│   ├── app/
│   │   ├── (admin)/          # future admin routes
│   │   ├── display/          # future display routes
│   │   ├── api/              # future API routes
│   │   ├── layout.tsx
│   │   ├── page.tsx          # simple home page
│   │   └── globals.css
│   ├── components/
│   ├── db/
│   │   ├── index.ts          # better-sqlite3 + Drizzle client
│   │   └── schema.ts         # empty for now
│   ├── lib/
│   ├── widgets/              # future widget registry
│   └── styles/
├── tests/
│   ├── unit/smoke.test.ts
│   └── e2e/smoke.spec.ts
├── drizzle/
├── public/
├── Dockerfile
├── docker-compose.yml
├── drizzle.config.ts
├── vitest.config.mts
├── playwright.config.ts
├── .env.example
├── package.json
└── README.md
```

---

## 5. Known Issues / Caveats

1. **npm install reliability**  
   In the previous sandbox environment, `npm install` was frequently incomplete or timed out (especially with native modules like `better-sqlite3`).  
   On a normal machine it should work fine. Always run a clean `npm install` first.

2. **better-sqlite3**  
   Requires native compilation (python3 + make + g++).  
   The Dockerfile already includes the necessary build tools.

3. **Quality Gates not fully verified in previous environment**  
   Because of install problems, the full gate set (`lint`, `test`, `build`, `test:e2e`, `docker build`) was not confirmed green in the previous sandbox.  
   **First thing the next agent should do** is run the quality gates on a clean environment.

4. **Repository name typo**  
   The GitHub repo is named `family-dashbroad` (missing “d”).  
   Keep using this name for now unless the owner renames it.

---

## 6. Recommended First Actions for Next Agent

1. Clone the repo
2. `cp .env.example .env`
3. `npm install`
4. Run the full quality gates:
   ```bash
   npm run lint
   npm run test
   npm run build
   npm run test:e2e
   docker build .
   docker compose config
   ```
5. If any gate fails, fix it before starting TASK-002.

---

## 7. Next Tasks (from Development Plan)

### TASK-002 — SQLite + Drizzle schema foundation
- Proper schema design
- Migrations
- Basic tables needed for later Dashboard / Widget / etc.

### TASK-003 — Single administrator authentication
- Login / logout / session
- Protect admin routes
- Display must **not** depend on admin session

Then the vertical slice continues:

`Login → Admin → Create Dashboard → Add Clock → Edit Layout → Save → Create Display Token → Open Display URL → Display`

---

## 8. Key Documents (already in repo / conversation)

- PRD: `family-dashboard-prd-v0.1.md`
- Development Plan: `family-dashboard-development-plan-v0.1.md`
- TASK-001 Spec: `family-dashboard-TASK-001-spec-v0.1.md`

These three documents are the source of truth. Follow them strictly.

---

## 9. Coding Rules Reminder

- TypeScript strict, avoid `any`
- Prefer Server Components
- `"use client"` only when necessary
- No direct DB access from UI components
- Keep environment variables server-side
- Widget system must stay independent and configurable
- Do not expose third-party credentials to Display

---

## 10. Contact / Ownership

Repository owner: **cleteng**  
Current stage: TASK-001 complete (foundation only)

Please continue from **TASK-002**.

Good luck.
