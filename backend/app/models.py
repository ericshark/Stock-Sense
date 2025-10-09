"""SQLAlchemy ORM models for StockSense."""
from __future__ import annotations

from datetime import datetime, date

from sqlalchemy import CheckConstraint, Date, DateTime, Float, ForeignKey, Integer, Numeric, String, UniqueConstraint, JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base model."""


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(128), nullable=True)

    prices: Mapped[list["Price"]] = relationship("Price", back_populates="asset", cascade="all, delete-orphan")


class Price(Base):
    __tablename__ = "prices"
    __table_args__ = (UniqueConstraint("asset_id", "dt", name="uq_prices_asset_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    dt: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    close: Mapped[float] = mapped_column(Numeric(18, 6), nullable=False)

    asset: Mapped[Asset] = relationship("Asset", back_populates="prices")


class Portfolio(Base):
    __tablename__ = "portfolios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    assets: Mapped[list["PortfolioAsset"]] = relationship("PortfolioAsset", back_populates="portfolio", cascade="all, delete-orphan")
    runs: Mapped[list["Run"]] = relationship("Run", back_populates="portfolio")


class PortfolioAsset(Base):
    __tablename__ = "portfolio_assets"
    __table_args__ = (UniqueConstraint("portfolio_id", "asset_id", name="uq_portfolio_asset"),)

    portfolio_id: Mapped[int] = mapped_column(ForeignKey("portfolios.id", ondelete="CASCADE"), primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True)
    weight: Mapped[float] = mapped_column(Float, nullable=False)

    portfolio: Mapped[Portfolio] = relationship("Portfolio", back_populates="assets")
    asset: Mapped[Asset] = relationship("Asset")


class Run(Base):
    __tablename__ = "runs"
    __table_args__ = (
        CheckConstraint("method in ('mean_variance','kelly','vol_target')", name="ck_runs_method"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    portfolio_id: Mapped[int | None] = mapped_column(ForeignKey("portfolios.id", ondelete="SET NULL"), nullable=True)
    method: Mapped[str] = mapped_column(String(32), nullable=False)
    params: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    result: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    portfolio: Mapped[Portfolio | None] = relationship("Portfolio", back_populates="runs")


__all__ = ["Base", "Asset", "Price", "Portfolio", "PortfolioAsset", "Run"]
