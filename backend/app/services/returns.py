"""Return computation utilities."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import numpy as np
import pandas as pd

TRADING_DAYS = 252


@dataclass(frozen=True)
class ReturnConfig:
    tickers: tuple[str, ...]
    start_date: date | None
    end_date: date | None
    use_log: bool


def compute_returns(prices: pd.DataFrame, use_log: bool = True) -> pd.DataFrame:
    """Compute daily returns from aligned price dataframe."""

    if use_log:
        returns = np.log(prices / prices.shift(1))
    else:
        returns = prices.pct_change()
    return returns.dropna(how="any")


def annualized_mean_cov(returns: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """Compute annualized mean vector and covariance matrix."""

    mu = returns.mean().to_numpy() * TRADING_DAYS
    cov = returns.cov().to_numpy() * TRADING_DAYS
    return mu, cov


def shrink_covariance(cov: np.ndarray, shrinkage: float = 0.1) -> np.ndarray:
    """Shrink the sample covariance toward a structured target.

    Implements the standard linear shrinkage estimator
    ``(1 - delta) * S + delta * F`` where the target ``F`` keeps the sample
    variances on the diagonal and replaces every pairwise correlation with the
    average sample correlation (the constant-correlation target of
    Ledoit & Wolf, 2004). This stabilises the inverse used by Kelly sizing and
    mean-variance optimisation when assets are highly correlated or history is
    short.
    """

    n = cov.shape[0]
    if n == 1:
        return cov.copy()

    std = np.sqrt(np.diag(cov))
    outer_std = np.outer(std, std)
    # Guard against zero-variance assets to keep the correlation matrix finite.
    with np.errstate(divide="ignore", invalid="ignore"):
        corr = np.where(outer_std > 0, cov / outer_std, 0.0)

    off_diag = corr[~np.eye(n, dtype=bool)]
    mean_corr = float(off_diag.mean()) if off_diag.size else 0.0
    target = mean_corr * outer_std
    np.fill_diagonal(target, np.diag(cov))

    delta = float(np.clip(shrinkage, 0.0, 1.0))
    shrunk = (1.0 - delta) * cov + delta * target
    # Tiny ridge keeps the matrix positive definite for pseudo-inversion.
    return shrunk + np.eye(n) * 1e-8


__all__ = [
    "TRADING_DAYS",
    "compute_returns",
    "annualized_mean_cov",
    "shrink_covariance",
    "ReturnConfig",
]
