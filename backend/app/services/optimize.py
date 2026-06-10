"""Optimization routines for StockSense."""
from __future__ import annotations

from dataclasses import dataclass, field

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
    extra: dict[str, object] = field(default_factory=dict)


def _portfolio_stats(weights: NDArray[np.float64], mu: NDArray[np.float64], cov: NDArray[np.float64], risk_free: float) -> tuple[float, float, float]:
    mu_p = float(weights @ mu)
    sigma_p = float(np.sqrt(max(weights @ cov @ weights, 0.0)))
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
        _, _, sharpe = _portfolio_stats(weights, mu, cov, risk_free)
        return -sharpe

    x0 = np.ones(n) / n
    constraints = ({"type": "eq", "fun": lambda w: np.sum(w) - 1.0},)
    bounds_seq = tuple(bounds for _ in range(n))

    res = minimize(neg_sharpe, x0, method="SLSQP", bounds=bounds_seq, constraints=constraints)
    if not res.success:
        raise ValueError(f"Optimization failed: {res.message}")
    weights = np.array(res.x)
    mu_p, sigma_p, sharpe = _portfolio_stats(weights, mu, cov, risk_free)
    return OptimizationResult(weights=dict(zip(tickers, weights)), mu=mu_p, sigma=sigma_p, sharpe=sharpe)


def min_variance(
    mu: NDArray[np.float64],
    cov: NDArray[np.float64],
    tickers: list[str],
    risk_free: float,
    bounds: tuple[float, float],
) -> OptimizationResult:
    """Global minimum-variance portfolio subject to the weight bounds."""

    n = len(tickers)

    def variance(weights: NDArray[np.float64]) -> float:
        return float(weights @ cov @ weights)

    x0 = np.ones(n) / n
    constraints = ({"type": "eq", "fun": lambda w: np.sum(w) - 1.0},)
    bounds_seq = tuple(bounds for _ in range(n))

    res = minimize(variance, x0, method="SLSQP", bounds=bounds_seq, constraints=constraints)
    if not res.success:
        raise ValueError(f"Optimization failed: {res.message}")
    weights = np.array(res.x)
    mu_p, sigma_p, sharpe = _portfolio_stats(weights, mu, cov, risk_free)
    return OptimizationResult(weights=dict(zip(tickers, weights)), mu=mu_p, sigma=sigma_p, sharpe=sharpe)


def risk_parity(
    cov: NDArray[np.float64],
    mu: NDArray[np.float64],
    tickers: list[str],
    risk_free: float,
) -> OptimizationResult:
    """Equal risk contribution portfolio (long-only, fully invested).

    Solves for weights where each asset contributes the same share of total
    portfolio variance: w_i * (Σw)_i = σ²/n for all i.
    """

    n = len(tickers)

    def risk_concentration(weights: NDArray[np.float64]) -> float:
        port_var = float(weights @ cov @ weights)
        if port_var <= 0:
            return 0.0
        contributions = weights * (cov @ weights)
        target = port_var / n
        return float(np.sum((contributions - target) ** 2))

    # Inverse-volatility start point converges faster than equal weights.
    vols = np.sqrt(np.diag(cov))
    x0 = (1.0 / vols) / np.sum(1.0 / vols) if np.all(vols > 0) else np.ones(n) / n

    constraints = ({"type": "eq", "fun": lambda w: np.sum(w) - 1.0},)
    bounds_seq = tuple((0.0, 1.0) for _ in range(n))
    res = minimize(
        risk_concentration,
        x0,
        method="SLSQP",
        bounds=bounds_seq,
        constraints=constraints,
        options={"maxiter": 500, "ftol": 1e-12},
    )
    if not res.success:
        raise ValueError(f"Optimization failed: {res.message}")
    weights = np.array(res.x)
    mu_p, sigma_p, sharpe = _portfolio_stats(weights, mu, cov, risk_free)
    port_var = float(weights @ cov @ weights)
    contributions = (weights * (cov @ weights)) / port_var if port_var > 0 else np.zeros(n)
    return OptimizationResult(
        weights=dict(zip(tickers, weights)),
        mu=mu_p,
        sigma=sigma_p,
        sharpe=sharpe,
        extra={"risk_contributions": dict(zip(tickers, contributions.tolist()))},
    )


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

    achieved_returns: list[float] = []
    vols: list[float] = []
    sharpes: list[float] = []
    weight_list: list[list[float]] = []

    def variance(weights: NDArray[np.float64]) -> float:
        return float(weights @ cov @ weights)

    for target in targets:
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
            achieved_returns.append(mu_p)
            vols.append(sigma_p)
            sharpes.append(sharpe)
            weight_list.append(weights.tolist())
    return {"target_returns": achieved_returns, "vols": vols, "sharpe": sharpes, "weights": weight_list}


def kelly_weights(
    mu: NDArray[np.float64],
    cov: NDArray[np.float64],
    tickers: list[str],
    risk_free: float,
    long_only: bool,
    fraction: float = 1.0,
) -> OptimizationResult:
    """Kelly-optimal weights ``f* = Σ⁻¹(μ - r_f)``, optionally fractional.

    ``fraction`` scales the bet (0.5 = half-Kelly), the standard practical
    hedge against estimation error in μ and Σ.
    """

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
        weights = raw_weights * fraction
    mu_p, sigma_p, sharpe = _portfolio_stats(weights, mu, cov, risk_free)
    # Expected log-growth: g = r_f + w'(μ - r_f) - ½ w'Σw
    growth = float(risk_free + weights @ excess - 0.5 * weights @ cov @ weights)
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
    """Scale a base portfolio so realized volatility hits the target.

    The scaled weights are NOT re-normalized: when the scale is below 1 the
    remainder sits in cash (earning the risk-free rate), and when above 1 the
    portfolio is levered (financed at the risk-free rate) up to the cap.
    """

    if returns.shape[0] < 2:
        raise ValueError("Not enough data for volatility targeting")

    realized_cov = np.cov(returns.T).reshape(len(tickers), len(tickers)) * TRADING_DAYS
    realized_vol = float(np.sqrt(base_weights @ realized_cov @ base_weights))
    if realized_vol == 0:
        raise ValueError("Realized volatility is zero")
    scale = min(target_vol / realized_vol, leverage_cap)
    weights = base_weights * scale
    cash_weight = 1.0 - float(weights.sum())

    mu_assets = returns.mean(axis=0) * TRADING_DAYS
    mu_p = float(weights @ mu_assets + cash_weight * risk_free)
    sigma_p = float(np.sqrt(weights @ realized_cov @ weights))
    sharpe = (mu_p - risk_free) / sigma_p if sigma_p > 0 else 0.0
    return OptimizationResult(
        weights=dict(zip(tickers, weights)),
        mu=mu_p,
        sigma=sigma_p,
        sharpe=sharpe,
        extra={"achieved_vol": sigma_p, "scale": scale, "cash_weight": cash_weight},
    )


__all__ = [
    "OptimizationResult",
    "max_sharpe",
    "min_variance",
    "risk_parity",
    "efficient_frontier",
    "kelly_weights",
    "volatility_target",
]
