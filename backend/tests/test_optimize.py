from __future__ import annotations

import numpy as np

from app.services.optimize import kelly_weights, max_sharpe, volatility_target


def test_kelly_closed_form():
    mu = np.array([0.1, 0.12])
    cov = np.array([[0.04, 0.01], [0.01, 0.09]])
    res = kelly_weights(mu, cov, ["A", "B"], risk_free=0.02, long_only=False)
    inv_cov = np.linalg.pinv(cov + np.eye(2) * 1e-6)
    expected = inv_cov @ (mu - 0.02)
    weights = np.array([res.weights["A"], res.weights["B"]])
    assert np.allclose(weights, expected)


def test_max_sharpe_two_assets():
    mu = np.array([0.1, 0.2])
    cov = np.array([[0.05, 0.01], [0.01, 0.08]])
    res = max_sharpe(mu, cov, ["A", "B"], risk_free=0.02, bounds=(0.0, 1.0))
    weights = np.array([res.weights["A"], res.weights["B"]])
    assert np.isclose(weights.sum(), 1.0)


def test_volatility_target():
    base = np.array([0.5, 0.5])
    rng = np.random.default_rng(0)
    returns = rng.normal(0.001, 0.01, size=(252, 2))
    res = volatility_target(base, returns, ["A", "B"], target_vol=0.1, leverage_cap=2.0, risk_free=0.02)
    assert 0.05 < res.extra["achieved_vol"] < 0.2
