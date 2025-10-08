"""Metrics routes."""
from __future__ import annotations

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import db_session
from ..models import Asset, Price
from ..services.metrics import correlation_matrix

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
    stmt = select(Asset).where(Asset.ticker.in_(tickers))
    assets = session.execute(stmt).scalars().all()
    if not assets:
        raise HTTPException(status_code=404, detail="Tickers not found")
    price_stmt = select(Price).where(Price.asset_id.in_([asset.id for asset in assets]))
    if start_date:
        price_stmt = price_stmt.where(Price.dt >= start_date)
    if end_date:
        price_stmt = price_stmt.where(Price.dt <= end_date)
    price_stmt = price_stmt.order_by(Price.dt)
    rows = session.execute(price_stmt).scalars().all()
    data = {}
    for asset in assets:
        asset_rows = [row for row in rows if row.asset_id == asset.id]
        data[asset.ticker] = pd.Series({row.dt: float(row.close) for row in asset_rows})
    df = pd.DataFrame(data).sort_index().dropna(how="any")
    if df.empty:
        raise HTTPException(status_code=400, detail="Insufficient overlapping data")
    corr, labels = correlation_matrix(df)
    return {"matrix": corr.tolist(), "tickers": labels}
