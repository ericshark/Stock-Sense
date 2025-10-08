"""Optimization routines for StockSense."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import numpy as np
from numpy.typing import NDArray
from scipy.optimize import minimize

from .returns import TRADING_DAYS, shrink_covariance


@dataclass
class OptimizationResult:
    weights: dict[str, float]
    mu: float
    sigma: float
    sharpe: float
    extra: dict[str, object]


def _normalize_weights(weights: NDArray[np.float64]) -> NDArray[np.float64]:
    weights = np.clip(weights, -10, 10)
    total = weights.sum()
    if total == 0:
        return np.ones_like(weights) / len(weights)
    return weights / total


def _portfolio_stats(weights: NDArray[np.float64], mu: NDArray[np.float64], cov: NDArray[np.float64], risk_free: float) -> tuple[float, float, float]:
    mu_p = float(weights @ mu)
    sigma_p = float(np.sqrt(weights @ cov @ weights))
    sharpe = (mu_p - risk_free) / sigma_p if sigma_p > 0 else 0.0
    return mu_p, sigma_p, sharpe


def max_sharpe(
    mu: NDArray[np.float64],
    cov: NDArray[np.float64],
    tickers: list[str],
    risk_free: float,
    bounds: tuple[float, float],
) -> OptimizationResult:
    n = len(tickers)

    def neg_sharpe(weights: NDArray[np.float64]) -> float:
        _, sigma, sharpe = _portfolio_stats(weights, mu, cov, risk_free)
        return -sharpe

    x0 = np.ones(n) / n
    constraints = ({"type": "eq", "fun": lambda w: np.sum(w) - 1.0},)
    bounds_seq = tuple(bounds for _ in range(n))

    res = minimize(neg_sharpe, x0, method="SLSQP", bounds=bounds_seq, constraints=constraints)
    if not res.success:
        raise ValueError(f"Optimization failed: {res.message}")
    weights = np.array(res.x)
    mu_p, sigma_p, sharpe = _portfolio_stats(weights, mu, cov, risk_free)
    return OptimizationResult(weights=dict(zip(tickers, weights)), mu=mu_p, sigma=sigma_p, sharpe=sharpe, extra={})


def efficient_frontier(
    mu: NDArray[np.float64],
    cov: NDArray[np.float64],
    tickers: list[str],
    bounds: tuple[float, float],
    risk_free: float,
    target_points: int = 25,
) -> dict[str, object]:
    n = len(tickers)
    mu_min, mu_max = float(mu.min()), float(mu.max())
    targets = np.linspace(mu_min, mu_max, target_points)

    vols: list[float] = []
    sharpes: list[float] = []
    weight_list: list[list[float]] = []

    for target in targets:
        def variance(weights: NDArray[np.float64]) -> float:
            return float(weights @ cov @ weights)

        constraints = (
            {"type": "eq", "fun": lambda w: np.sum(w) - 1.0},
            {"type": "eq", "fun": lambda w, target=target: float(w @ mu) - target},
        )
        bounds_seq = tuple(bounds for _ in range(n))
        x0 = np.ones(n) / n
        res = minimize(variance, x0, method="SLSQP", bounds=bounds_seq, constraints=constraints)
        if res.success:
            weights = np.array(res.x)
            mu_p, sigma_p, sharpe = _portfolio_stats(weights, mu, cov, risk_free)
            vols.append(sigma_p)
            sharpes.append(sharpe)
            weight_list.append(weights.tolist())
    return {"target_returns": targets.tolist(), "vols": vols, "sharpe": sharpes, "weights": weight_list}


def kelly_weights(
    mu: NDArray[np.float64],
    cov: NDArray[np.float64],
    tickers: list[str],
    risk_free: float,
    long_only: bool,
) -> OptimizationResult:
    cov_reg = shrink_covariance(cov)
    excess = mu - risk_free
    inv_cov = np.linalg.pinv(cov_reg)
    raw_weights = inv_cov @ excess
    if long_only:
        raw_weights = np.clip(raw_weights, 0, None)
        if raw_weights.sum() == 0:
            raw_weights = np.ones_like(raw_weights)
        weights = raw_weights / raw_weights.sum()
    else:
        weights = raw_weights
    mu_p, sigma_p, sharpe = _portfolio_stats(weights, mu, cov, risk_free)
    growth = float(weights @ excess - 0.5 * weights @ cov @ weights)
    return OptimizationResult(
        weights=dict(zip(tickers, weights)),
        mu=mu_p,
        sigma=sigma_p,
        sharpe=sharpe,
        extra={"growth": growth},
    )


def volatility_target(
    base_weights: NDArray[np.float64],
    returns: NDArray[np.float64],
    tickers: list[str],
    target_vol: float,
    leverage_cap: float,
    risk_free: float,
) -> OptimizationResult:
    if returns.shape[0] < 2:
        raise ValueError("Not enough data for volatility targeting")

    realized_cov = np.cov(returns.T) * TRADING_DAYS
    realized_vol = float(np.sqrt(base_weights @ realized_cov @ base_weights))
    if realized_vol == 0:
        raise ValueError("Realized volatility is zero")
    scale = min(target_vol / realized_vol, leverage_cap)
    weights = base_weights * scale
    weights = np.clip(weights, 0, None)
    weights = weights / weights.sum()
    mu = returns.mean(axis=0) * TRADING_DAYS
    cov = realized_cov
    mu_p, sigma_p, sharpe = _portfolio_stats(weights, mu, cov, risk_free)
    return OptimizationResult(
        weights=dict(zip(tickers, weights)),
        mu=mu_p,
        sigma=sigma_p,
        sharpe=sharpe,
        extra={"achieved_vol": sigma_p},
    )


__all__ = [
    "OptimizationResult",
    "max_sharpe",
    "efficient_frontier",
    "kelly_weights",
    "volatility_target",
]
