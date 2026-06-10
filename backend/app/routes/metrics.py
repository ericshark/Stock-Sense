"""Metrics routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..db import db_session
from ..schemas import PerformanceRequest
from ..services.metrics import correlation_matrix, performance_stats
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
