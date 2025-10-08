"""CSV ingestion service."""
from __future__ import annotations

from datetime import datetime
from io import StringIO
from typing import Any

import pandas as pd

from sqlalchemy.orm import Session

from ..repositories.asset_repo import get_or_create_asset
from ..repositories.price_repo import upsert_prices


def parse_csv(content: bytes) -> pd.DataFrame:
    data = content.decode("utf-8")
    df = pd.read_csv(StringIO(data))
    if "date" not in df.columns:
        raise ValueError("CSV must contain a 'date' column")
    df["date"] = pd.to_datetime(df["date"]).dt.date
    return df


def normalize_long_format(df: pd.DataFrame) -> pd.DataFrame:
    if {"ticker", "close"}.issubset(df.columns):
        long_df = df[["date", "ticker", "close"]].copy()
        long_df["ticker"] = long_df["ticker"].str.upper()
        long_df = long_df.dropna(subset=["close"])  # drop rows with missing prices
        return long_df
    wide = df.set_index("date")
    long_df = wide.stack().reset_index()
    long_df.columns = ["date", "ticker", "close"]
    long_df["ticker"] = long_df["ticker"].str.upper()
    long_df = long_df.dropna(subset=["close"])
    return long_df


def ingest_csv(session: Session, content: bytes) -> list[dict[str, Any]]:
    df = parse_csv(content)
    long_df = normalize_long_format(df)

    summary: dict[str, int] = {}
    for ticker, group in long_df.groupby("ticker"):
        asset = get_or_create_asset(session, ticker)
        rows = [
            {"dt": row.date, "close": float(row.close)}
            for row in group.itertuples(index=False)
        ]
        inserted = upsert_prices(session, asset.id, rows)
        summary[ticker] = summary.get(ticker, 0) + inserted
    return [{"ticker": ticker, "rows": count} for ticker, count in summary.items()]


__all__ = ["ingest_csv"]
