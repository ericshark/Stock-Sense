# StockSense — Portfolio Optimizer Dashboard

StockSense is a full-stack reference implementation for portfolio analytics. Upload price histories, run multiple optimization strategies, and visualise the results in a modern dashboard.

## Features
- CSV ingestion into PostgreSQL (long or wide format) with idempotent upserts.
- Mean-Variance, Kelly and Volatility Targeting optimisers with Plotly visualisations.
- FastAPI backend with SQLAlchemy, Alembic migrations, and pytest coverage.
- React + Vite frontend using React Query, TailwindCSS and Plotly.
- Docker Compose for local development, including a seed dataset and Makefile helpers.

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Make (optional, for shortcuts)

### Development Setup
```bash
make dev
```
This spins up PostgreSQL, the FastAPI backend on `localhost:8000`, and the React frontend on `localhost:5173`.

### Manual Setup
```bash
cd backend
pip install -e .[dev]
uvicorn app.main:app --reload
```
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```

### Database Migrations
```bash
cd backend
alembic upgrade head
```

### Seed Sample Data
```bash
make seed
```
Loads `backend/seed/sample_prices.csv` into the database.

### Testing
```bash
cd backend
pytest
```
```bash
cd frontend
npm test
```

## API Examples

Upload CSV (wide format):
```bash
curl -X POST http://localhost:8000/api/data/upload_csv \
  -F "file=@backend/seed/sample_prices.csv"
```

Mean-Variance optimisation:
```bash
curl -X POST http://localhost:8000/api/optimize/mean-variance \
  -H "Content-Type: application/json" \
  -d '{"tickers":["AAPL","MSFT"],"risk_free":0.02,"method":"max_sharpe"}'
```

Kelly optimisation:
```bash
curl -X POST http://localhost:8000/api/optimize/kelly \
  -H "Content-Type: application/json" \
  -d '{"tickers":["AAPL","MSFT"],"risk_free":0.02}'
```

Volatility targeting:
```bash
curl -X POST http://localhost:8000/api/optimize/vol-target \
  -H "Content-Type: application/json" \
  -d '{"tickers":["AAPL","MSFT"],"target_vol":0.1,"lookback":60}'
```

## Limitations & Future Work
- Synthetic seed data is simplified; integrate with live data feeds for realism.
- Does not model transaction costs, turnover, or rebalancing schedules.
- No user accounts; API key header provides coarse access control.

