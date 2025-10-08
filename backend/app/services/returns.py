"""Return computation utilities."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from typing import Iterable

import numpy as np
import pandas as pd

from ..config import get_settings

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


def shrink_covariance(cov: np.ndarray, shrinkage: float = 1e-6) -> np.ndarray:
    ident = np.eye(cov.shape[0])
    return cov + shrinkage * ident


def cache_key(config: ReturnConfig) -> tuple:
    return (config.tickers, config.start_date, config.end_date, config.use_log)


@lru_cache(maxsize=32)
def cached_covariance(config: ReturnConfig, prices: tuple[tuple[float, ...], ...], index: tuple[str, ...]) -> tuple[np.ndarray, np.ndarray, list[str]]:
    df = pd.DataFrame(prices, columns=config.tickers, index=pd.Index(index))
    returns = compute_returns(df, use_log=config.use_log)
    mu, cov = annualized_mean_cov(returns)
    return mu, cov, list(returns.columns)


__all__ = [
    "compute_returns",
    "annualized_mean_cov",
    "shrink_covariance",
    "ReturnConfig",
    "cached_covariance",
]
