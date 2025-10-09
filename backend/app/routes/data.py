"""Data ingestion routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..db import db_session
from ..repositories.asset_repo import list_tickers
from ..services.ingest import ingest_csv

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
