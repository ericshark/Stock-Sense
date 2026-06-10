"""Pydantic schemas for API."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AssetSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticker: str
    name: str | None = None


class PriceSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dt: date
    close: float


class PortfolioAssetSchema(BaseModel):
    asset_id: int
    ticker: str
    weight: float


class PortfolioSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime
    assets: list[PortfolioAssetSchema]


class UploadSummary(BaseModel):
    ticker: str
    rows: int


class OptimizeRequestBase(BaseModel):
    tickers: list[str]
    start_date: date | None = None
    end_date: date | None = None
    risk_free: float = Field(default=0.02, ge=-0.05, le=0.25)

    @field_validator("tickers")
    @classmethod
    def validate_tickers(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("At least one ticker must be provided")
        return [ticker.strip().upper() for ticker in value]


class MeanVarianceRequest(OptimizeRequestBase):
    bounds: tuple[float, float] | None = Field(default=None)
    allow_short: bool = False
    method: Literal["max_sharpe", "min_variance", "efficient_frontier"] = "max_sharpe"


class RiskParityRequest(OptimizeRequestBase):
    pass


class KellyRequest(OptimizeRequestBase):
    long_only: bool = True
    fraction: float = Field(default=1.0, gt=0.0, le=1.0)


class VolTargetRequest(OptimizeRequestBase):
    base: Literal["equal", "mv_max_sharpe"] = "equal"
    lookback: int = Field(default=60, ge=10, le=756)
    target_vol: float = Field(default=0.10, gt=0.0, le=1.0)
    leverage_cap: float = Field(default=2.0, ge=1.0, le=5.0)


class PerformanceRequest(BaseModel):
    tickers: list[str]
    weights: dict[str, float]
    start_date: date | None = None
    end_date: date | None = None
    risk_free: float = Field(default=0.02, ge=-0.05, le=0.25)

    @field_validator("tickers")
    @classmethod
    def validate_tickers(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("At least one ticker must be provided")
        return [ticker.strip().upper() for ticker in value]


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
    name: str = Field(min_length=1, max_length=128)
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
    "RiskParityRequest",
    "KellyRequest",
    "VolTargetRequest",
    "PerformanceRequest",
    "OptimizeResponse",
    "KellyResponse",
    "VolTargetResponse",
    "CorrelationResponse",
    "UploadSummary",
]
