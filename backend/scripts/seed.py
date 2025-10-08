from __future__ import annotations

import pathlib

import pandas as pd
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.services.ingest import ingest_csv


SEED_PATH = pathlib.Path(__file__).resolve().parent.parent / "seed" / "sample_prices.csv"


def main() -> None:
    session: Session = SessionLocal()
    try:
        content = SEED_PATH.read_bytes()
        ingest_csv(session, content)
        session.commit()
        print("Seed data loaded")
    finally:
        session.close()


if __name__ == "__main__":
    main()
