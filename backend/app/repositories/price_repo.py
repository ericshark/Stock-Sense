"""Price repository utilities."""
from __future__ import annotations

from datetime import date
from typing import Iterable

from sqlalchemy import and_, delete, insert, select
from sqlalchemy.orm import Session

from ..models import Price


def upsert_prices(session: Session, asset_id: int, rows: list[dict[str, object]]) -> int:
    """Bulk upsert price rows for an asset."""

    count = 0
    for row in rows:
        stmt = select(Price).where(and_(Price.asset_id == asset_id, Price.dt == row["dt"]))
        existing = session.execute(stmt).scalar_one_or_none()
        if existing:
            existing.close = row["close"]
        else:
            session.add(Price(asset_id=asset_id, dt=row["dt"], close=row["close"]))
            count += 1
    return count


def load_prices(
    session: Session,
    asset_ids: Iterable[int],
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[Price]:
    stmt = select(Price).where(Price.asset_id.in_(list(asset_ids)))
    if start_date:
        stmt = stmt.where(Price.dt >= start_date)
    if end_date:
        stmt = stmt.where(Price.dt <= end_date)
    stmt = stmt.order_by(Price.dt)
    return list(session.execute(stmt).scalars())


__all__ = ["upsert_prices", "load_prices"]
