"""FastAPI application."""
from __future__ import annotations

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routes import data as data_routes
from .routes import metrics as metrics_routes
from .routes import optimize as optimize_routes
from .routes import portfolios as portfolios_routes
from .utils.logging import configure_logging

configure_logging()
settings = get_settings()

app = FastAPI(title="StockSense Portfolio Optimizer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def verify_api_key(x_api_key: str | None = Header(default=None)) -> None:
    if settings.api_key and x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


app.include_router(data_routes.router, prefix="/api")
app.include_router(optimize_routes.router, prefix="/api", dependencies=[Depends(verify_api_key)])
app.include_router(metrics_routes.router, prefix="/api")
app.include_router(portfolios_routes.router, prefix="/api", dependencies=[Depends(verify_api_key)])


__all__ = ["app"]
