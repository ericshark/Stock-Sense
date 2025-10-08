.PHONY: dev fmt lint test seed backend frontend

DEV_COMPOSE=docker-compose.yml

fmt:
	poetry run black backend
	poetry run isort backend

lint:
	poetry run ruff backend
	poetry run mypy backend

backend:
	cd backend && uvicorn app.main:app --reload

frontend:
	cd frontend && npm run dev

seed:
	python backend/scripts/seed.py

dev:
	docker compose -f $(DEV_COMPOSE) up

test:
	poetry run pytest
