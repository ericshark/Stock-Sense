"""Shared price-frame loading for routes."""
from __future__ import annotations

from datetime import date

import pandas as pd
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Asset, Price


def fetch_price_frame(
    session: Session,
    tickers: list[str],
    start_date: date | str | None = None,
    end_date: date | str | None = None,
) -> pd.DataFrame:
    """Load aligned close prices for the tickers as a wide dataframe."""

    tickers = [t.upper() for t in tickers]
    stmt = select(Asset).where(Asset.ticker.in_(tickers))
    assets = session.execute(stmt).scalars().all()
    if not assets:
        raise HTTPException(status_code=404, detail="Tickers not found")
    found = {asset.ticker for asset in assets}
    missing = sorted(set(tickers) - found)
    if missing:
        raise HTTPException(status_code=404, detail=f"Unknown tickers: {', '.join(missing)}")

    prices_stmt = select(Price).where(Price.asset_id.in_([asset.id for asset in assets]))
    if start_date:
        prices_stmt = prices_stmt.where(Price.dt >= start_date)
    if end_date:
        prices_stmt = prices_stmt.where(Price.dt <= end_date)
    prices_stmt = prices_stmt.order_by(Price.dt)
    rows = session.execute(prices_stmt).scalars().all()
    if not rows:
        raise HTTPException(status_code=400, detail="No price data available for selection")

    data = {}
    for asset in assets:
        asset_rows = [row for row in rows if row.asset_id == asset.id]
        data[asset.ticker] = pd.Series({row.dt: float(row.close) for row in asset_rows})
    df = pd.DataFrame(data).sort_index().dropna(how="any")
    if df.empty:
        raise HTTPException(status_code=400, detail="No overlapping dates across tickers")
    return df


__all__ = ["fetch_price_frame"]
