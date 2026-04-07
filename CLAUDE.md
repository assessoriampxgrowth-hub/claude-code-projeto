# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Contents

This workspace contains two independent projects:

- **`meta-ads-reporter/`** — Python CLI that fetches Meta Ads campaign insights, generates PDFs, publishes to Vercel Blob, and sends WhatsApp reports via Evolution API. Multi-client.
- **`meta-ads-reporter/portal/`** — Next.js 15 portal (App Router) deployed on Vercel. Reads client data and report indexes directly from Vercel Blob.
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
```

### Environment Variables

All config lives in `.env` (see `.env.example`). Required by `config.validate()` at startup:

| Variable | Description |
|---|---|
| `META_ACCESS_TOKEN` | Meta Marketing API token |
| `META_AD_ACCOUNT_ID` | Format: `act_<number>` (used as fallback; per-client value is in `clients.json`) |
| `EVOLUTION_API_KEY` | Evolution API key |
| `EVOLUTION_INSTANCE` | Instance name in Evolution |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (from Vercel project → Storage → Blob) |

Optional: `EVOLUTION_API_URL` (default `http://localhost:8080`), `SCHEDULE_DAY/HOUR/MINUTE`, `REPORT_DAYS` (default 7), `CLIENT_PORTAL_URL` (portal URL after deploy, used in WhatsApp message).

Per-client WhatsApp recipients and ad account IDs are configured in `clients.json`, not in `.env`.

### Architecture

Data flow for each client: `meta_api` → `report_generator` + `pdf_generator` → `blob_upload` → `whatsapp`

- **`clients.json`** — Registry of all clients. Each entry has `id`, `name`, `ad_account_id`, `whatsapp_recipients[]`, and `active` flag.
- **`client_manager.py`** — Loads `clients.json`; `load_clients(active_only=True)` and `get_client(id)`.
- **`meta_api.py`** — Wraps `facebook-business` SDK. `get_insights(days, ad_account_id)` fetches campaign-level metrics for the last N days (ending yesterday). Conversions counted from `actions` field: `fb_pixel_purchase`, `fb_pixel_lead`, `lead`, `purchase`.
- **`report_generator.py`** — Builds WhatsApp-formatted text (emoji, `*bold*`, `_italic_`). Campaigns sorted by spend descending.
- **`pdf_generator.py`** — Generates a PDF report for a client and saves to a temp directory.
- **`blob_upload.py`** — Uploads PDFs to Vercel Blob (`reports/{client_id}/meta-ads-{date}.pdf`), maintains per-client `index.json`, and updates the global `reports/clients.json` registry used by the portal.
- **`whatsapp.py`** — Sends messages (and PDF) via Evolution API `POST /message/sendText/{instance}`. `broadcast()` takes recipients from the client config.
- **`scheduler.py`** — APScheduler `BlockingScheduler` with `CronTrigger` in `America/Sao_Paulo`.
- **`config.py`** — Single source of truth for env-based settings; imported by all modules.
- **`gerar_todos.py`** — Standalone batch script: publishes PDFs for all active clients silently (no confirmation prompts, no WhatsApp), using a 30-day window.

---

## portal (Next.js)

### Setup & Commands

```bash
cd meta-ads-reporter/portal
npm install
npm run dev      # development server
npm run build    # production build
npm run start    # serve production build locally
```

Requires `BLOB_READ_WRITE_TOKEN` available to the Next.js app (set in Vercel project env vars or `.env.local`).

### Architecture

All pages are React Server Components that fetch directly from Vercel Blob at request time.

- **`app/page.tsx`** — Home: fetches `reports/clients.json` from Blob, lists all clients as cards.
- **`app/cliente/[id]/page.tsx`** — Client detail: fetches `reports/{id}/index.json` from Blob, displays each weekly report with KPIs and a PDF download link.
- Both pages use `{ next: { revalidate: 3600 } }` on blob fetches (ISR, 1-hour cache).
- No API routes — data access is entirely through `@vercel/blob` and direct blob URL fetches.
- No CSS framework; all styling is inline.
