"""Repository helpers for assets."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Asset


def get_or_create_asset(session: Session, ticker: str, name: str | None = None) -> Asset:
    ticker = ticker.upper().strip()
    stmt = select(Asset).where(Asset.ticker == ticker)
    asset = session.execute(stmt).scalar_one_or_none()
    if asset:
        if name and not asset.name:
            asset.name = name
        return asset
    asset = Asset(ticker=ticker, name=name)
    session.add(asset)
    session.flush()
    return asset


def list_tickers(session: Session) -> list[str]:
    stmt = select(Asset.ticker).order_by(Asset.ticker)
    return [row[0] for row in session.execute(stmt).all()]


__all__ = ["get_or_create_asset", "list_tickers"]
