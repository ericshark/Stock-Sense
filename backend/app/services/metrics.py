"""Metrics utilities."""
from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd


def correlation_matrix(prices: pd.DataFrame) -> tuple[np.ndarray, list[str]]:
    returns = prices.pct_change().dropna(how="any")
    corr = returns.corr().to_numpy()
    return corr, list(returns.columns)


def rolling_volatility(returns: pd.DataFrame, window: int) -> pd.Series:
    return returns.rolling(window).std() * np.sqrt(252)


__all__ = ["correlation_matrix", "rolling_volatility"]
