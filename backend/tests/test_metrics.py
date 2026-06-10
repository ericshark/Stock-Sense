from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from app.services.metrics import performance_stats


def make_prices(values: list[float]) -> pd.DataFrame:
    dates = pd.bdate_range("2024-01-01", periods=len(values))
    return pd.DataFrame({"A": values}, index=dates)


def test_max_drawdown_known_path():
    # 100 -> 120 -> 90 -> 110: max drawdown = 90/120 - 1 = -25%
    prices = make_prices([100, 120, 90, 110])
    result = performance_stats(prices, {"A": 1.0}, risk_free=0.0)
    assert np.isclose(result["stats"]["max_drawdown"], -0.25)
    assert np.isclose(result["stats"]["total_return"], 0.10)


def test_equity_curve_matches_prices_for_full_weight():
    prices = make_prices([100, 105, 110.25])
    result = performance_stats(prices, {"A": 1.0}, risk_free=0.0)
    assert np.allclose(result["equity_curve"], [1.05, 1.1025])


def test_cash_weight_earns_risk_free():
    prices = make_prices([100, 100, 100])
    result = performance_stats(prices, {"A": 0.0}, risk_free=0.0252)
    daily_rf = 0.0252 / 252
    assert np.allclose(result["equity_curve"], [(1 + daily_rf), (1 + daily_rf) ** 2])


def test_insufficient_history_raises():
    prices = make_prices([100])
    with pytest.raises(ValueError):
        performance_stats(prices, {"A": 1.0})


def test_sortino_higher_than_sharpe_for_positive_skew():
    rng = np.random.default_rng(42)
    rets = np.abs(rng.normal(0.001, 0.01, 500)) - 0.002
    prices = make_prices(list(100 * np.cumprod(1 + rets)))
    result = performance_stats(prices, {"A": 1.0}, risk_free=0.0)
    assert result["stats"]["sortino"] > result["stats"]["sharpe"] > 0
