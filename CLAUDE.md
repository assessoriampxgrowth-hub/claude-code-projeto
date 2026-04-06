# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Contents

This workspace contains two independent projects:

- **`meta-ads-reporter/`** — Python CLI that fetches Meta Ads campaign insights and broadcasts weekly WhatsApp reports via Evolution API.
- **`restaurante-centro-oeste.html`** — Standalone HTML landing page (single file, no build step).

---

## meta-ads-reporter

### Setup

```bash
cd meta-ads-reporter
pip install -r requirements.txt
cp .env.example .env   # then fill in credentials
```

### Running

```bash
# Run report immediately (shows preview, asks before sending)
python main.py run

# Start the weekly scheduler (blocking process)
python main.py schedule
```

### Environment Variables

All config lives in `.env` (see `.env.example`). Required variables:

| Variable | Description |
|---|---|
| `META_ACCESS_TOKEN` | Meta Marketing API token |
| `META_AD_ACCOUNT_ID` | Format: `act_<number>` |
| `EVOLUTION_API_KEY` | Evolution API key |
| `EVOLUTION_INSTANCE` | Instance name in Evolution |
| `WHATSAPP_RECIPIENTS` | Comma-separated international numbers (e.g. `5511999999999`) |

Optional: `EVOLUTION_API_URL` (default `http://localhost:8080`), `SCHEDULE_DAY/HOUR/MINUTE`, `REPORT_DAYS` (default 7).

`config.validate()` is called at startup and raises `EnvironmentError` listing any missing required variables.

### Architecture

The data flow is linear: `meta_api` → `report_generator` → `whatsapp`.

- **`meta_api.py`** — Wraps `facebook-business` SDK. `get_insights(days)` fetches campaign-level metrics for the last N days (ending yesterday for complete data). Conversions are extracted from the `actions` field, counting `fb_pixel_purchase`, `fb_pixel_lead`, `lead`, and `purchase` action types.
- **`report_generator.py`** — Transforms the dict returned by `get_insights` into a WhatsApp-formatted text message (emoji, bold with `*`, italic with `_`). Campaigns are sorted by spend descending.
- **`whatsapp.py`** — Sends messages via Evolution API's `POST /message/sendText/{instance}` endpoint. `broadcast()` iterates all configured recipients and returns a `{phone: status}` dict.
- **`scheduler.py`** — Uses APScheduler's `BlockingScheduler` with a `CronTrigger` in `America/Sao_Paulo` timezone. Runs `meta_api → report_generator → whatsapp` on the configured weekly schedule.
- **`config.py`** — Single source of truth for all settings; imported by every module.
