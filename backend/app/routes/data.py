"""Data ingestion routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from ..db import db_session
from ..repositories.asset_repo import delete_asset, list_asset_summaries, list_tickers
from ..services.ingest import ingest_csv
from ..services.prices import fetch_price_frame

router = APIRouter(prefix="/data", tags=["data"])


def get_db() -> Session:
    with db_session() as session:
        yield session


@router.post("/upload_csv")
async def upload_csv(file: UploadFile = File(...), session: Session = Depends(get_db)) -> dict:
    content = await file.read()
    try:
        summary = ingest_csv(session, content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"summary": summary}


@router.get("/tickers")
async def get_tickers(session: Session = Depends(get_db)) -> dict:
    return {"tickers": list_tickers(session)}


@router.get("/assets")
async def get_assets(session: Session = Depends(get_db)) -> dict:
    return {"assets": list_asset_summaries(session)}


@router.delete("/assets/{ticker}")
async def remove_asset(ticker: str, session: Session = Depends(get_db)) -> dict:
    if not delete_asset(session, ticker):
        raise HTTPException(status_code=404, detail="Ticker not found")
    return {"deleted": ticker.upper()}


@router.get("/prices")
async def get_prices(
    tickers: list[str] = Query(...),
    start_date: str | None = None,
    end_date: str | None = None,
    normalize: bool = False,
    session: Session = Depends(get_db),
) -> dict:
    df = fetch_price_frame(session, tickers, start_date, end_date)
    if normalize:
        df = df / df.iloc[0] * 100.0
    return {
        "dates": [d.isoformat() for d in df.index],
        "series": {ticker: df[ticker].round(4).tolist() for ticker in df.columns},
    }
