# StockSense — Portfolio Optimizer Dashboard

StockSense is a full-stack portfolio analytics platform. Upload price histories, run optimization strategies, inspect risk, and backtest the result in a modern dashboard.

## Features

- **CSV ingestion** into PostgreSQL (long or wide format) with idempotent upserts, plus dataset management (browse row counts/date ranges, delete tickers).
- **Four optimizers**: Mean-Variance (max-Sharpe, min-variance, efficient frontier), Risk Parity (equal risk contribution), Kelly (full or fractional), and Volatility Targeting (with cash/leverage accounting).
- **Explore page**: normalized price comparison, rolling volatility (21/63/126d), and per-asset stats (return, vol, Sharpe, max drawdown).
- **Compare page**: run all five strategy variants on the same universe and see backtested Sharpe/Sortino/drawdown side by side, with overlaid equity curves and grouped weight bars.
- **Risk analytics**: correlation heatmap, risk-contribution breakdown, Ledoit-Wolf-style covariance shrinkage.
- **Backtesting**: equity curve, drawdown curve, Sharpe, Sortino, Calmar, max drawdown, VaR/CVaR (95%).
- **Portfolio management**: save optimized allocations, browse and delete them, export weights as CSV/JSON.
- **Modern UI**: React + Vite + Tailwind app shell with sidebar navigation, persistent light/dark mode, animated stat cards, toast notifications, skeleton loading, interactive Plotly charts, drag-and-drop uploads.

## Getting Started

### Option A — Docker (recommended)

```bash
make dev          # or: docker compose up --build
```

This starts PostgreSQL, the FastAPI backend on `localhost:8000`, and the production frontend (nginx) on `localhost:5173`. Tables are created automatically on backend startup.

### Option B — Manual setup

Backend:
```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -e '.[dev]'
STOCKSENSE_DATABASE_URL=sqlite:///./stocksense.db .venv/bin/uvicorn app.main:app --reload
```

Frontend (new terminal):
```bash
cd frontend
npm install
npm run dev       # serves on :5173, proxies /api to :8000
```

SQLite works out of the box for local development; set `STOCKSENSE_DATABASE_URL` to a PostgreSQL URL for production parity.

### Seed sample data

```bash
make seed         # loads backend/seed/sample_prices.csv (2 years, 5 tickers)
```

Or upload any CSV from the **Upload Data** page. Supported formats:

```csv
date,AAPL,MSFT          # wide
2024-01-02,185.64,370.87
```
```csv
date,ticker,close       # long
2024-01-02,AAPL,185.64
```

### Testing

```bash
make test             # backend: pytest
make test-frontend    # frontend: vitest
```

## API

Interactive docs at `http://localhost:8000/docs`. Highlights:

| Endpoint | Description |
|---|---|
| `POST /api/data/upload_csv` | Ingest price CSV (multipart) |
| `GET /api/data/tickers` | List available tickers |
| `GET /api/data/assets` / `DELETE /api/data/assets/{ticker}` | Dataset summaries; remove a ticker |
| `GET /api/data/prices` | Price series (optionally normalized to 100) |
| `POST /api/optimize/mean-variance` | Max-Sharpe / min-variance / efficient frontier |
| `POST /api/optimize/risk-parity` | Equal risk contribution weights |
| `POST /api/optimize/kelly` | Kelly weights (supports `fraction`, `long_only`) |
| `POST /api/optimize/vol-target` | Volatility-targeted scaling with cash/leverage |
| `GET /api/metrics/correlation` | Return correlation matrix |
| `POST /api/metrics/performance` | Backtest weights: equity curve, drawdown, stats |
| `GET /api/metrics/rolling-vol` | Rolling annualized volatility per ticker |
| `GET /api/metrics/asset-stats` | Per-asset return/vol/Sharpe/drawdown summary |
| `POST /api/portfolios` / `GET` / `DELETE /{id}` | Save, list, delete portfolios |

Example:
```bash
curl -X POST http://localhost:8000/api/optimize/risk-parity \
  -H "Content-Type: application/json" \
  -d '{"tickers":["AAPL","MSFT","TSLA"],"risk_free":0.02}'
```

## Configuration

Environment variables (prefix `STOCKSENSE_`, or a `.env` file in `backend/`):

| Variable | Default | Purpose |
|---|---|---|
| `STOCKSENSE_DATABASE_URL` | `postgresql+psycopg://postgres:postgres@db:5432/stocksense` | SQLAlchemy database URL |
| `STOCKSENSE_API_KEY` | unset | If set, `/api/optimize/*` and `/api/portfolios` require an `X-API-Key` header |
| `STOCKSENSE_CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed browser origins |
| `STOCKSENSE_LOG_LEVEL` | `INFO` | Backend log level |

Frontend: `VITE_API_BASE_URL` (defaults to `/api`, served via dev proxy or nginx).

## Deployment

### Single host with Docker Compose

```bash
docker compose up --build -d
```

The frontend container (nginx) serves the built SPA and reverse-proxies `/api/` to the backend container, so only port 5173 (or whatever you map) needs to be exposed publicly. For production:

1. Change the Postgres password and set `STOCKSENSE_DATABASE_URL` accordingly.
2. Set `STOCKSENSE_API_KEY` on the backend service to protect write endpoints.
3. Map the frontend to port 80/443 behind TLS (e.g. Caddy, Traefik, or a cloud load balancer).

### Managed platforms (Render / Railway / Fly.io)

- **Backend**: deploy `backend/` as a Docker service (the Dockerfile runs gunicorn+uvicorn on `:8000`). Attach a managed PostgreSQL instance and set `STOCKSENSE_DATABASE_URL`.
- **Frontend**: deploy `frontend/` as a Docker service, or build statically (`npm run build`) and host `dist/` on any static host with `VITE_API_BASE_URL` pointing at the backend URL (set `STOCKSENSE_CORS_ORIGINS` to match).

### Database migrations

Tables are auto-created on startup. For schema changes, use Alembic:
```bash
cd backend && alembic upgrade head
```

## Limitations & Future Work

- Synthetic seed data is simplified; integrate with live data feeds for realism.
- Backtests assume daily rebalancing without transaction costs or slippage.
- No user accounts; the optional API key header provides coarse access control.
