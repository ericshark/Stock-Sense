"""Metrics utilities."""
from __future__ import annotations

import numpy as np
import pandas as pd

from .returns import TRADING_DAYS


def correlation_matrix(prices: pd.DataFrame) -> tuple[np.ndarray, list[str]]:
    returns = prices.pct_change().dropna(how="any")
    corr = returns.corr().to_numpy()
    return corr, list(returns.columns)


def rolling_volatility(returns: pd.DataFrame, window: int) -> pd.DataFrame:
    return returns.rolling(window).std() * np.sqrt(TRADING_DAYS)


def performance_stats(prices: pd.DataFrame, weights: dict[str, float], risk_free: float = 0.02) -> dict[str, object]:
    """Backtest a fixed-weight portfolio over the price history.

    Returns the equity curve, drawdown series, and the standard suite of
    performance statistics. Uses simple (arithmetic) returns so the weighted
    sum across assets is exact, and assumes daily rebalancing to the target
    weights.
    """

    asset_returns = prices.pct_change().dropna(how="any")
    if asset_returns.empty:
        raise ValueError("Not enough price history to compute performance")

    w = np.array([weights.get(ticker, 0.0) for ticker in asset_returns.columns])
    invested = float(w.sum())
    daily_rf = risk_free / TRADING_DAYS
    # Any weight not in the assets sits in cash at the risk-free rate.
    port_returns = asset_returns.to_numpy() @ w + (1.0 - invested) * daily_rf

    equity = np.cumprod(1.0 + port_returns)
    running_max = np.maximum.accumulate(equity)
    drawdown = equity / running_max - 1.0
    max_drawdown = float(drawdown.min())

    mean_daily = float(port_returns.mean())
    ann_return = float((1.0 + mean_daily) ** TRADING_DAYS - 1.0)
    ann_vol = float(port_returns.std(ddof=1) * np.sqrt(TRADING_DAYS))
    sharpe = (ann_return - risk_free) / ann_vol if ann_vol > 0 else 0.0

    downside = port_returns[port_returns < daily_rf] - daily_rf
    downside_dev = float(np.sqrt(np.mean(downside**2)) * np.sqrt(TRADING_DAYS)) if downside.size else 0.0
    sortino = (ann_return - risk_free) / downside_dev if downside_dev > 0 else 0.0

    calmar = ann_return / abs(max_drawdown) if max_drawdown < 0 else 0.0

    var_95 = float(np.percentile(port_returns, 5))
    tail = port_returns[port_returns <= var_95]
    cvar_95 = float(tail.mean()) if tail.size else var_95

    total_return = float(equity[-1] - 1.0)

    dates = [d.isoformat() if hasattr(d, "isoformat") else str(d) for d in asset_returns.index]
    return {
        "dates": dates,
        "equity_curve": equity.tolist(),
        "drawdown_curve": drawdown.tolist(),
        "stats": {
            "total_return": total_return,
            "annual_return": ann_return,
            "annual_volatility": ann_vol,
            "sharpe": sharpe,
            "sortino": sortino,
            "calmar": calmar,
            "max_drawdown": max_drawdown,
            "var_95": var_95,
            "cvar_95": cvar_95,
        },
    }


__all__ = ["correlation_matrix", "rolling_volatility", "performance_stats"]
