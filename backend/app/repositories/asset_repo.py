"""Repository helpers for assets."""
from __future__ import annotations

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from ..models import Asset, PortfolioAsset, Price


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


def list_asset_summaries(session: Session) -> list[dict]:
    stmt = (
        select(
            Asset.ticker,
            Asset.name,
            func.count(Price.id),
            func.min(Price.dt),
            func.max(Price.dt),
        )
        .join(Price, Price.asset_id == Asset.id, isouter=True)
        .group_by(Asset.id)
        .order_by(Asset.ticker)
    )
    return [
        {
            "ticker": ticker,
            "name": name,
            "rows": rows,
            "start_date": start.isoformat() if start else None,
            "end_date": end.isoformat() if end else None,
        }
        for ticker, name, rows, start, end in session.execute(stmt).all()
    ]


def delete_asset(session: Session, ticker: str) -> bool:
    stmt = select(Asset).where(Asset.ticker == ticker.upper().strip())
    asset = session.execute(stmt).scalar_one_or_none()
    if not asset:
        return False
    # SQLite does not enforce FK cascades by default, so clear references explicitly.
    session.execute(delete(PortfolioAsset).where(PortfolioAsset.asset_id == asset.id))
    session.delete(asset)
    session.flush()
    return True


__all__ = ["get_or_create_asset", "list_tickers", "list_asset_summaries", "delete_asset"]
