.PHONY: dev backend frontend seed test test-frontend build

DEV_COMPOSE=docker-compose.yml

dev:
	docker compose -f $(DEV_COMPOSE) up --build

backend:
	cd backend && .venv/bin/uvicorn app.main:app --reload

frontend:
	cd frontend && npm run dev

seed:
	cd backend && .venv/bin/python scripts/seed.py

test:
	cd backend && .venv/bin/python -m pytest

test-frontend:
	cd frontend && npx vitest run

build:
	cd frontend && npm run build
