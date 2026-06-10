from __future__ import annotations

import numpy as np

from app.services.optimize import (
    kelly_weights,
    max_sharpe,
    min_variance,
    risk_parity,
    volatility_target,
)
from app.services.returns import shrink_covariance


def test_kelly_closed_form():
    mu = np.array([0.1, 0.12])
    cov = np.array([[0.04, 0.01], [0.01, 0.09]])
    res = kelly_weights(mu, cov, ["A", "B"], risk_free=0.02, long_only=False)
    inv_cov = np.linalg.pinv(shrink_covariance(cov))
    expected = inv_cov @ (mu - 0.02)
    weights = np.array([res.weights["A"], res.weights["B"]])
    assert np.allclose(weights, expected)


def test_kelly_growth_includes_risk_free():
    mu = np.array([0.1])
    cov = np.array([[0.04]])
    res = kelly_weights(mu, cov, ["A"], risk_free=0.02, long_only=True)
    w = res.weights["A"]
    expected_growth = 0.02 + w * (0.1 - 0.02) - 0.5 * w * 0.04 * w
    assert np.isclose(res.extra["growth"], expected_growth)


def test_half_kelly_scales_weights():
    mu = np.array([0.1, 0.12])
    cov = np.array([[0.04, 0.01], [0.01, 0.09]])
    full = kelly_weights(mu, cov, ["A", "B"], risk_free=0.02, long_only=False, fraction=1.0)
    half = kelly_weights(mu, cov, ["A", "B"], risk_free=0.02, long_only=False, fraction=0.5)
    assert np.isclose(half.weights["A"], full.weights["A"] * 0.5)
    assert np.isclose(half.weights["B"], full.weights["B"] * 0.5)


def test_max_sharpe_two_assets():
    mu = np.array([0.1, 0.2])
    cov = np.array([[0.05, 0.01], [0.01, 0.08]])
    res = max_sharpe(mu, cov, ["A", "B"], risk_free=0.02, bounds=(0.0, 1.0))
    weights = np.array([res.weights["A"], res.weights["B"]])
    assert np.isclose(weights.sum(), 1.0)


def test_min_variance_prefers_low_vol_asset():
    mu = np.array([0.1, 0.1])
    cov = np.diag([0.01, 0.09])
    res = min_variance(mu, cov, ["LOW", "HIGH"], risk_free=0.02, bounds=(0.0, 1.0))
    assert res.weights["LOW"] > res.weights["HIGH"]
    # Closed form for two uncorrelated assets: w1 = s2²/(s1²+s2²)
    assert np.isclose(res.weights["LOW"], 0.9, atol=1e-3)


def test_risk_parity_equal_contributions():
    cov = np.array([[0.04, 0.005], [0.005, 0.16]])
    mu = np.array([0.08, 0.12])
    res = risk_parity(cov, mu, ["A", "B"], risk_free=0.02)
    contributions = res.extra["risk_contributions"]
    assert np.isclose(contributions["A"], contributions["B"], atol=1e-4)
    assert np.isclose(sum(res.weights.values()), 1.0)


def test_volatility_target_scales_down_without_renormalizing():
    base = np.array([0.5, 0.5])
    rng = np.random.default_rng(0)
    # ~16% annualized vol; targeting 8% should scale to ~0.5 and hold cash.
    returns = rng.normal(0.0005, 0.01, size=(252, 2))
    res = volatility_target(base, returns, ["A", "B"], target_vol=0.08, leverage_cap=2.0, risk_free=0.02)
    total = sum(res.weights.values())
    assert total < 1.0
    assert np.isclose(res.extra["cash_weight"], 1.0 - total)
    assert np.isclose(res.extra["achieved_vol"], 0.08, atol=0.01)


def test_volatility_target_respects_leverage_cap():
    base = np.array([0.5, 0.5])
    rng = np.random.default_rng(1)
    returns = rng.normal(0.0005, 0.002, size=(252, 2))
    res = volatility_target(base, returns, ["A", "B"], target_vol=0.5, leverage_cap=1.5, risk_free=0.02)
    assert np.isclose(res.extra["scale"], 1.5)
    assert np.isclose(sum(res.weights.values()), 1.5)
