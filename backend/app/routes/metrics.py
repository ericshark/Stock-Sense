"""Metrics routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..db import db_session
from ..schemas import PerformanceRequest
from ..services.metrics import asset_stats, correlation_matrix, performance_stats, rolling_volatility
from ..services.prices import fetch_price_frame

router = APIRouter(prefix="/metrics", tags=["metrics"])


def get_db() -> Session:
    with db_session() as session:
        yield session


@router.get("/correlation")
async def correlation(
    tickers: list[str] = Query(...),
    start_date: str | None = None,
    end_date: str | None = None,
    session: Session = Depends(get_db),
) -> dict:
    df = fetch_price_frame(session, tickers, start_date, end_date)
    corr, labels = correlation_matrix(df)
    return {"matrix": corr.tolist(), "tickers": labels}


@router.post("/performance")
async def performance(req: PerformanceRequest, session: Session = Depends(get_db)) -> dict:
    df = fetch_price_frame(session, req.tickers, req.start_date, req.end_date)
    try:
        return performance_stats(df, req.weights, req.risk_free)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/rolling-vol")
async def rolling_vol(
    tickers: list[str] = Query(...),
    window: int = Query(default=21, ge=5, le=252),
    start_date: str | None = None,
    end_date: str | None = None,
    session: Session = Depends(get_db),
) -> dict:
    df = fetch_price_frame(session, tickers, start_date, end_date)
    returns = df.pct_change().dropna(how="any")
    vol = rolling_volatility(returns, window).dropna(how="any")
    if vol.empty:
        raise HTTPException(status_code=400, detail="Not enough data for the rolling window")
    return {
        "dates": [d.isoformat() for d in vol.index],
        "series": {ticker: vol[ticker].round(6).tolist() for ticker in vol.columns},
        "window": window,
    }


@router.get("/asset-stats")
async def get_asset_stats(
    tickers: list[str] = Query(...),
    risk_free: float = Query(default=0.02, ge=-0.05, le=0.25),
    start_date: str | None = None,
    end_date: str | None = None,
    session: Session = Depends(get_db),
) -> dict:
    df = fetch_price_frame(session, tickers, start_date, end_date)
    try:
        return {"stats": asset_stats(df, risk_free)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
