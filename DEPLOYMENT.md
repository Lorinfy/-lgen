# Deployment Notes

## Environment
Copy `.env.example` to `.env` and fill the live credentials:

- `PORT`
- `OANDA_API_KEY`
- `OANDA_ACCOUNT_ID`
- `TELEGRAM_BOT_ID`
- `TELEGRAM_BOT_TOKEN`

## Runtime behavior
- Quotes prefer OANDA, then public fallback sources.
- News and calendar use automatic public feeds first.
- Telegram commands supported:
  - `/bulten`
  - `/fiyatlar`
  - `/cot`
  - `/alarm`

## API endpoints
- `GET /api/quotes`
- `GET /api/finance/news`
- `GET /api/calendar/events`
- `GET /api/cron/status`
- `POST /api/cron/trigger`
- `GET /api/telegram/config`
- `POST /api/telegram/send`
- `POST /api/telegram/webhook`
- `GET /api/oanda/status`
