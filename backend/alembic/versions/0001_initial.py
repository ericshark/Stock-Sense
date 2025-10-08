"""initial tables"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "assets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticker", sa.String(length=32), nullable=False, unique=True),
        sa.Column("name", sa.String(length=128), nullable=True),
    )
    op.create_table(
        "prices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("asset_id", sa.Integer(), sa.ForeignKey("assets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dt", sa.Date(), nullable=False),
        sa.Column("close", sa.Numeric(18, 6), nullable=False),
        sa.UniqueConstraint("asset_id", "dt", name="uq_prices_asset_date"),
    )
    op.create_index("ix_prices_asset_id", "prices", ["asset_id"])
    op.create_index("ix_prices_dt", "prices", ["dt"])

    op.create_table(
        "portfolios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "portfolio_assets",
        sa.Column("portfolio_id", sa.Integer(), sa.ForeignKey("portfolios.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("asset_id", sa.Integer(), sa.ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("weight", sa.Float(), nullable=False),
        sa.UniqueConstraint("portfolio_id", "asset_id", name="uq_portfolio_asset"),
    )

    op.create_table(
        "runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("portfolio_id", sa.Integer(), sa.ForeignKey("portfolios.id", ondelete="SET NULL"), nullable=True),
        sa.Column("method", sa.String(length=32), nullable=False),
        sa.Column("params", sa.JSON(), nullable=False),
        sa.Column("result", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("method in ('mean_variance','kelly','vol_target')", name="ck_runs_method"),
    )


def downgrade() -> None:
    op.drop_table("runs")
    op.drop_table("portfolio_assets")
    op.drop_table("portfolios")
    op.drop_table("prices")
    op.drop_table("assets")
