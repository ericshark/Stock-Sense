from __future__ import annotations

import numpy as np
import pandas as pd

from app.services.returns import TRADING_DAYS, annualized_mean_cov, compute_returns


def test_log_returns():
    prices = pd.DataFrame({"A": [100, 102, 101]})
    returns = compute_returns(prices, use_log=True)
    expected = np.log([102 / 100, 101 / 102])
    assert np.allclose(returns["A"].to_numpy(), expected)


def test_annualization():
    returns = pd.DataFrame({"A": [0.01, 0.02, 0.0]})
    mu, cov = annualized_mean_cov(returns)
    assert np.isclose(mu[0], returns["A"].mean() * TRADING_DAYS)
    assert cov.shape == (1, 1)
