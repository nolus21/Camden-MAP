# Camden Food System — Notion Proxy

Vercel edge function that proxies Notion API calls for the Camden food system diagram.

## Endpoints

- `GET /api/indicators` — all 100 KPI indicators (feeds the radial diagram dots)
- `GET /api/cards` — all intervention cards (feeds the portfolio panel)
- `POST /api/cards` — create a new card in Notion

## Environment variables (set in Vercel dashboard)

| Variable | Value |
|---|---|
| `NOTION_TOKEN` | Your Notion integration secret (`ntn_...`) |
| `NOTION_CARDS_DB` | Database ID for intervention cards |

## Deploy

1. Push this repo to GitHub
2. Go to vercel.com → Add New Project → import this repo
3. Add the environment variables above
4. Deploy
