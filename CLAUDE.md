# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Contents

This workspace contains two independent projects:

- **`meta-ads-reporter/`** — Python CLI that fetches Meta Ads campaign insights, generates PDFs, publishes to Vercel Blob, and sends WhatsApp reports via Evolution API. Multi-client.
- **`meta-ads-reporter/portal/`** — Next.js 15 portal (App Router, v2.0) deployed on Vercel. Full admin panel backed by Prisma/SQLite, with public client-facing report pages.
- **`restaurante-centro-oeste.html`** — Standalone HTML landing page (single file, no build step).

---

## meta-ads-reporter (Python CLI)

### Setup

```bash
cd meta-ads-reporter
pip install -r requirements.txt
cp .env.example .env   # then fill in credentials
```

### Running

```bash
# List registered clients
python main.py list

# Run for all active clients (interactive: previews, asks before sending each)
python main.py run

# Run for a specific client by ID
python main.py run --client cliente-01

# Batch publish all clients silently (no WhatsApp, uses 30-day window)
python gerar_todos.py

# Start the weekly scheduler (blocking process)
python main.py schedule

# Configure WhatsApp instance interactively
python configurar-whatsapp.py
```

### Environment Variables

All config lives in `.env` (see `.env.example`). Required by `config.validate()` at startup:

| Variable | Description |
|---|---|
| `META_ACCESS_TOKEN` | Meta Marketing API token |
| `META_AD_ACCOUNT_ID` | Format: `act_<number>` (fallback; per-client value is in `clients.json`) |
| `EVOLUTION_API_KEY` | Evolution API key |
| `EVOLUTION_INSTANCE` | Instance name in Evolution |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token |

Optional: `EVOLUTION_API_URL` (default `http://localhost:8080`), `SCHEDULE_DAY/HOUR/MINUTE`, `REPORT_DAYS` (default 7), `CLIENT_PORTAL_URL` (portal URL, used in WhatsApp message).

Per-client WhatsApp recipients and ad account IDs are configured in `clients.json`, not in `.env`.

### Architecture

Data flow for each client: `meta_api` → `report_generator` + `pdf_generator` → `blob_upload` → `whatsapp`

- **`clients.json`** — Registry of all clients. Each entry has `id`, `name`, `ad_account_id`, `whatsapp_recipients[]`, and `active` flag.
- **`client_manager.py`** — Loads `clients.json`; `load_clients(active_only=True)` and `get_client(id)`.
- **`meta_api.py`** — Wraps `facebook-business` SDK. `get_insights(days, ad_account_id)` fetches campaign-level metrics for the last N days (ending yesterday). Conversions counted from `actions` field: `fb_pixel_purchase`, `fb_pixel_lead`, `lead`, `purchase`.
- **`report_generator.py`** — Builds WhatsApp-formatted text (emoji, `*bold*`, `_italic_`). Campaigns sorted by spend descending.
- **`pdf_generator.py`** — Generates a PDF report for a client and saves to a temp directory.
- **`blob_upload.py`** — Uploads PDFs to Vercel Blob (`reports/{client_id}/meta-ads-{date}.pdf`), maintains per-client `index.json`, and updates the global `reports/clients.json` registry.
- **`whatsapp.py`** — Sends messages (and PDF) via Evolution API `POST /message/sendText/{instance}`. `broadcast()` takes recipients from the client config.
- **`scheduler.py`** — APScheduler `BlockingScheduler` with `CronTrigger` in `America/Sao_Paulo`.
- **`config.py`** — Single source of truth for env-based settings; imported by all modules.
- **`gerar_todos.py`** — Standalone batch script: publishes PDFs for all active clients silently (no prompts, no WhatsApp), 30-day window.

---

## portal (Next.js v2.0)

### Setup & Commands

```bash
cd meta-ads-reporter/portal
npm install
npm run dev          # development server
npm run build        # prisma generate + next build
npm run db:push      # push schema changes to SQLite (dev)
npm run db:migrate   # run migrations (production)
npm run db:studio    # open Prisma Studio GUI
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite path, e.g. `file:./prisma/dev.db` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token |
| `ADMIN_PASSWORD` | Plain-text password for the admin panel |
| `JWT_SECRET` | Secret for signing admin session JWTs |
| `ENCRYPTION_KEY` | Key for encrypting Meta access tokens at rest (`lib/security/crypto.ts`) |
| `CRON_SECRET` | Bearer secret for the weekly cron endpoint |
| `CLIENT_PORTAL_URL` | Public base URL, used in WhatsApp share links |
| `EVOLUTION_API_URL` | Evolution API base URL |
| `EVOLUTION_API_KEY` | Evolution API key |
| `EVOLUTION_INSTANCE` | Evolution instance name |

### Architecture

#### Database (Prisma + SQLite)

Schema lives in `prisma/schema.prisma`. Key models:

- **`Client`** — name, slug, whatsappPhone, scheduleDay/Hour, autoSend, active
- **`AdAccount`** — linked to Client; stores `accessToken` encrypted via `lib/security/crypto.ts`, `tokenStatus`
- **`ReportSnapshot`** — JSON `data` blob with campaign metrics + `pdfUrl` + unique `token` for public sharing
- **`WhatsAppLog`** — delivery log per send attempt
- **`SyncLog`** — audit log for sync operations

#### Auth

Admin auth is a custom JWT flow (no NextAuth). `lib/auth.ts` uses `jose` to sign/verify HS256 tokens stored in an `admin_session` httpOnly cookie (8h TTL). All admin API routes call `getAdminSession()` and return 401 if unauthenticated. The admin layout server component also checks the session and redirects to `/admin/login` when needed.

#### Pages & Routes

Public:
- **`app/page.tsx`** — Client list (reads Vercel Blob `reports/clients.json`)
- **`app/cliente/[id]/page.tsx`** — Client report history (reads Blob `reports/{id}/index.json`)
- **`app/r/[token]/page.tsx`** — Shareable report page by unique snapshot token

Admin (`/admin/*`, protected by session):
- Dashboard, client list/edit/create, import from Python CLI's `clients.json`, sync logs
- **`app/admin/layout.tsx`** — Sidebar nav + session guard (server component)

API Routes:
- `POST /api/auth/login` — validates `ADMIN_PASSWORD`, sets JWT cookie
- `POST /api/auth/logout` — clears cookie
- `GET/POST /api/admin/clients` — list / create clients with encrypted token
- `GET/PATCH/DELETE /api/admin/clients/[id]` — client CRUD
- `POST /api/admin/clients/[id]/sync` — trigger manual sync for one client
- `POST /api/admin/clients/[id]/whatsapp` — manual WhatsApp send
- `GET /api/admin/logs` — fetch sync/WhatsApp logs
- `POST /api/admin/import` — import clients from Python CLI's `clients.json`
- `POST /api/admin/sync-all` — sync all active clients
- `POST /api/cron/weekly` — weekly cron, protected by `CRON_SECRET` header

#### Cron

`vercel.json` schedules `POST /api/cron/weekly` every Monday at 11:00 UTC. The endpoint requires the `x-cron-secret` header (or `?secret=` query param) matching `CRON_SECRET`.

#### Lib Modules

- **`lib/db.ts`** — Prisma client singleton
- **`lib/auth.ts`** — JWT sign/verify/session helpers
- **`lib/security/crypto.ts`** — encrypt/decrypt for Meta access tokens stored in DB
- **`lib/meta/insights.ts`** — fetches Meta Ads campaign insights
- **`lib/meta/normalize.ts`** — normalizes raw API response to report data shape
- **`lib/reports/generate.ts`** — `syncClient(id)`: fetches insights, creates `ReportSnapshot`, uploads PDF to Blob
- **`lib/reports/insights-text.ts`** — WhatsApp text formatter
- **`lib/whatsapp/send.ts`** — `sendReportMessage()` via Evolution API
- **`lib/pdf/document.tsx`** — PDF template using `@react-pdf/renderer`

No CSS framework; all styling is inline. All pages are React Server Components except where marked `"use client"`.
