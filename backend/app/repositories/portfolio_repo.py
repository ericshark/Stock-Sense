"""Portfolio persistence helpers."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Asset, Portfolio, PortfolioAsset


def create_portfolio(session: Session, name: str, weights: dict[str, float]) -> Portfolio:
    portfolio = Portfolio(name=name, created_at=datetime.utcnow())
    session.add(portfolio)
    session.flush()

    tickers = {ticker.upper(): weight for ticker, weight in weights.items()}
    assets = session.execute(select(Asset).where(Asset.ticker.in_(tickers.keys()))).scalars().all()
    asset_lookup = {asset.ticker: asset for asset in assets}

    for ticker, weight in tickers.items():
        asset = asset_lookup.get(ticker)
        if not asset:
            continue
        session.add(PortfolioAsset(portfolio_id=portfolio.id, asset_id=asset.id, weight=weight))
    session.flush()
    session.refresh(portfolio)
    return portfolio


def get_portfolio(session: Session, portfolio_id: int) -> Portfolio | None:
    stmt = select(Portfolio).where(Portfolio.id == portfolio_id)
    return session.execute(stmt).scalar_one_or_none()


def list_portfolios(session: Session) -> list[Portfolio]:
    stmt = select(Portfolio).order_by(Portfolio.created_at.desc())
    return list(session.execute(stmt).scalars())


__all__ = ["create_portfolio", "get_portfolio", "list_portfolios"]
