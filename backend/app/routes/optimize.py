"""Optimization routes."""
from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import db_session
from ..models import Asset, Price
from ..schemas import KellyRequest, MeanVarianceRequest, VolTargetRequest
from ..services.optimize import efficient_frontier, kelly_weights, max_sharpe, volatility_target
from ..services.returns import TRADING_DAYS, ReturnConfig, cached_covariance, compute_returns

router = APIRouter(prefix="/optimize", tags=["optimize"])


def get_db() -> Session:
    with db_session() as session:
        yield session


def fetch_price_frame(session: Session, tickers: list[str], start_date: date | None, end_date: date | None) -> pd.DataFrame:
    stmt = select(Asset).where(Asset.ticker.in_(tickers))
    assets = session.execute(stmt).scalars().all()
    if not assets:
        raise HTTPException(status_code=404, detail="Tickers not found")
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
    df = pd.DataFrame(data).sort_index()
    df = df.dropna(how="any")
    if df.empty:
        raise HTTPException(status_code=400, detail="No overlapping dates across tickers")
    return df


@router.post("/mean-variance")
async def mean_variance(req: MeanVarianceRequest, session: Session = Depends(get_db)) -> dict:
    df = fetch_price_frame(session, req.tickers, req.start_date, req.end_date)
    returns = compute_returns(df)
    if len(returns) < 2:
        raise HTTPException(status_code=400, detail="Not enough observations")
    mu = returns.mean().to_numpy() * TRADING_DAYS
    cov = returns.cov().to_numpy() * TRADING_DAYS
    bounds = req.bounds or ((-0.3, 1.0) if req.allow_short else (0.0, 1.0))
    try:
        result = max_sharpe(mu, cov, list(returns.columns), req.risk_free, bounds)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    response = {
        "weights": result.weights,
        "mu": result.mu,
        "sigma": result.sigma,
        "sharpe": result.sharpe,
    }

    if req.method == "efficient_frontier":
        frontier = efficient_frontier(mu, cov, list(returns.columns), bounds, req.risk_free)
        response["efficient_frontier"] = frontier
    return response


@router.post("/kelly")
async def kelly(req: KellyRequest, session: Session = Depends(get_db)) -> dict:
    df = fetch_price_frame(session, req.tickers, req.start_date, req.end_date)
    returns = compute_returns(df)
    mu = returns.mean().to_numpy() * TRADING_DAYS
    cov = returns.cov().to_numpy() * TRADING_DAYS
    result = kelly_weights(mu, cov, list(returns.columns), req.risk_free, req.long_only)
    return {
        "weights": result.weights,
        "mu": result.mu,
        "sigma": result.sigma,
        "sharpe": result.sharpe,
        "growth": result.extra["growth"],
    }


@router.post("/vol-target")
async def vol_target(req: VolTargetRequest, session: Session = Depends(get_db)) -> dict:
    df = fetch_price_frame(session, req.tickers, req.start_date, req.end_date)
    returns = compute_returns(df)
    lookback = req.lookback
    if len(returns) < lookback:
        raise HTTPException(status_code=400, detail="Not enough data for lookback window")
    recent = returns.tail(lookback)
    tickers = list(recent.columns)
    if req.base == "equal":
        base_weights = np.ones(len(tickers)) / len(tickers)
    else:
        mu = returns.mean().to_numpy() * TRADING_DAYS
        cov = returns.cov().to_numpy() * TRADING_DAYS
        base_result = max_sharpe(mu, cov, tickers, req.risk_free, (0.0, 1.0))
        base_weights = np.array([base_result.weights[t] for t in tickers])
    result = volatility_target(base_weights, recent.to_numpy(), tickers, req.target_vol, req.leverage_cap, req.risk_free)
    return {
        "weights": result.weights,
        "mu": result.mu,
        "sigma": result.sigma,
        "sharpe": result.sharpe,
        "achieved_vol": result.extra["achieved_vol"],
    }
