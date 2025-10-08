"""Pydantic schemas for API."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field, validator


class AssetSchema(BaseModel):
    id: int
    ticker: str
    name: str | None = None

    class Config:
        from_attributes = True


class PriceSchema(BaseModel):
    dt: date
    close: float

    class Config:
        from_attributes = True


class PortfolioAssetSchema(BaseModel):
    asset_id: int
    ticker: str
    weight: float


class PortfolioSchema(BaseModel):
    id: int
    name: str
    created_at: datetime
    assets: list[PortfolioAssetSchema]

    class Config:
        from_attributes = True


class UploadSummary(BaseModel):
    ticker: str
    rows: int


class OptimizeRequestBase(BaseModel):
    tickers: list[str]
    start_date: date | None = None
    end_date: date | None = None
    risk_free: float = 0.02

    @validator("tickers")
    def validate_tickers(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("At least one ticker must be provided")
        return value


class MeanVarianceRequest(OptimizeRequestBase):
    bounds: tuple[float, float] | None = Field(default=None)
    allow_short: bool = False
    method: str = Field(default="max_sharpe")


class KellyRequest(OptimizeRequestBase):
    long_only: bool = True


class VolTargetRequest(OptimizeRequestBase):
    base: str = Field(default="equal")
    lookback: int = 60
    target_vol: float = 0.10
    leverage_cap: float = 2.0


class OptimizeResponse(BaseModel):
    weights: dict[str, float]
    mu: float
    sigma: float
    sharpe: float
    extra: dict[str, Any] | None = None


class CorrelationResponse(BaseModel):
    matrix: list[list[float]]
    tickers: list[str]


class RunOptimizationResponse(OptimizeResponse):
    efficient_frontier: dict[str, list[float]] | None = None


class KellyResponse(OptimizeResponse):
    growth: float


class VolTargetResponse(OptimizeResponse):
    achieved_vol: float


class PortfolioCreateRequest(BaseModel):
    name: str
    weights: dict[str, float]


class PortfolioCreateResponse(BaseModel):
    id: int
    name: str
    created_at: datetime


__all__ = [
    "AssetSchema",
    "PriceSchema",
    "PortfolioSchema",
    "PortfolioCreateRequest",
    "PortfolioCreateResponse",
    "MeanVarianceRequest",
    "KellyRequest",
    "VolTargetRequest",
    "OptimizeResponse",
    "KellyResponse",
    "VolTargetResponse",
    "CorrelationResponse",
    "UploadSummary",
]
