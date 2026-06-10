"""Portfolio routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import db_session
from ..repositories.portfolio_repo import create_portfolio, delete_portfolio, get_portfolio, list_portfolios
from ..schemas import PortfolioCreateRequest

router = APIRouter(prefix="/portfolios", tags=["portfolios"])


def get_db() -> Session:
    with db_session() as session:
        yield session


@router.post("")
async def create(req: PortfolioCreateRequest, session: Session = Depends(get_db)) -> dict:
    portfolio = create_portfolio(session, req.name, req.weights)
    return {"id": portfolio.id, "name": portfolio.name, "created_at": portfolio.created_at.isoformat()}


@router.get("")
async def list_all(session: Session = Depends(get_db)) -> dict:
    portfolios = list_portfolios(session)
    items = [
        {
            "id": portfolio.id,
            "name": portfolio.name,
            "created_at": portfolio.created_at.isoformat(),
            "weights": {pa.asset.ticker: pa.weight for pa in portfolio.assets},
        }
        for portfolio in portfolios
    ]
    return {"portfolios": items}


@router.get("/{portfolio_id}")
async def get_one(portfolio_id: int, session: Session = Depends(get_db)) -> dict:
    portfolio = get_portfolio(session, portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return {
        "id": portfolio.id,
        "name": portfolio.name,
        "created_at": portfolio.created_at.isoformat(),
        "weights": {pa.asset.ticker: pa.weight for pa in portfolio.assets},
    }


@router.delete("/{portfolio_id}")
async def delete_one(portfolio_id: int, session: Session = Depends(get_db)) -> dict:
    if not delete_portfolio(session, portfolio_id):
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return {"deleted": portfolio_id}
