"""Optimization routes."""
from __future__ import annotations

import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import db_session
from ..schemas import KellyRequest, MeanVarianceRequest, RiskParityRequest, VolTargetRequest
from ..services.optimize import (
    efficient_frontier,
    kelly_weights,
    max_sharpe,
    min_variance,
    risk_parity,
    volatility_target,
)
from ..services.prices import fetch_price_frame
from ..services.returns import annualized_mean_cov, compute_returns

router = APIRouter(prefix="/optimize", tags=["optimize"])


def get_db() -> Session:
    with db_session() as session:
        yield session


@router.post("/mean-variance")
async def mean_variance(req: MeanVarianceRequest, session: Session = Depends(get_db)) -> dict:
    df = fetch_price_frame(session, req.tickers, req.start_date, req.end_date)
    returns = compute_returns(df)
    if len(returns) < 2:
        raise HTTPException(status_code=400, detail="Not enough observations")
    mu, cov = annualized_mean_cov(returns)
    bounds = req.bounds or ((-0.3, 1.0) if req.allow_short else (0.0, 1.0))
    try:
        if req.method == "min_variance":
            result = min_variance(mu, cov, list(returns.columns), req.risk_free, bounds)
        else:
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


@router.post("/risk-parity")
async def risk_parity_route(req: RiskParityRequest, session: Session = Depends(get_db)) -> dict:
    df = fetch_price_frame(session, req.tickers, req.start_date, req.end_date)
    returns = compute_returns(df)
    if len(returns) < 2:
        raise HTTPException(status_code=400, detail="Not enough observations")
    mu, cov = annualized_mean_cov(returns)
    try:
        result = risk_parity(cov, mu, list(returns.columns), req.risk_free)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "weights": result.weights,
        "mu": result.mu,
        "sigma": result.sigma,
        "sharpe": result.sharpe,
        "risk_contributions": result.extra["risk_contributions"],
    }


@router.post("/kelly")
async def kelly(req: KellyRequest, session: Session = Depends(get_db)) -> dict:
    df = fetch_price_frame(session, req.tickers, req.start_date, req.end_date)
    returns = compute_returns(df)
    if len(returns) < 2:
        raise HTTPException(status_code=400, detail="Not enough observations")
    mu, cov = annualized_mean_cov(returns)
    result = kelly_weights(mu, cov, list(returns.columns), req.risk_free, req.long_only, req.fraction)
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
        mu, cov = annualized_mean_cov(returns)
        base_result = max_sharpe(mu, cov, tickers, req.risk_free, (0.0, 1.0))
        base_weights = np.array([base_result.weights[t] for t in tickers])
    try:
        result = volatility_target(base_weights, recent.to_numpy(), tickers, req.target_vol, req.leverage_cap, req.risk_free)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "weights": result.weights,
        "mu": result.mu,
        "sigma": result.sigma,
        "sharpe": result.sharpe,
        "achieved_vol": result.extra["achieved_vol"],
        "scale": result.extra["scale"],
        "cash_weight": result.extra["cash_weight"],
    }
