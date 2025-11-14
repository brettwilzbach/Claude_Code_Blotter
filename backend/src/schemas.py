"""Pydantic models for API request/response schemas."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class AggRow(BaseModel):
    """
    Single row in the aggregate hedge table.
    Represents a position with all enriched data.
    """
    # Position identifiers
    portfolio: Optional[str] = None
    location_account: Optional[str] = None
    strategy: Optional[str] = None
    investment_id: Optional[str] = None
    investment_description: Optional[str] = None

    # Security identifiers
    id_bb_sec_num_des: Optional[str] = None
    secid: Optional[str] = None
    name_clean: Optional[str] = None

    # Classification
    manual_flag: bool = False
    hedge_label: Optional[str] = None
    hedge_family: Optional[str] = None

    # Currency and pricing
    local_ccy: Optional[str] = None
    long_mv: Optional[float] = None
    short_mv: Optional[float] = None
    mv_ssc_usd: Optional[float] = None
    price_prior: Optional[float] = None
    price_current: Optional[float] = None

    # PnL
    pnl_1d_usd: Optional[float] = None
    pnl_mtd_usd: Optional[float] = None

    # Risk metrics
    dv01_usd: Optional[float] = None
    cs01_usd: Optional[float] = None  # Credit spread DV01
    beta_spx: Optional[float] = None
    delta_spx: Optional[float] = None
    vega_spx: Optional[float] = None

    # Additional market data
    vol_90d: Optional[float] = None
    px_last: Optional[float] = None
    px_mid: Optional[float] = None
    maturity: Optional[str] = None
    yld_ytm_ask: Optional[float] = None
    sw_spread: Optional[float] = None
    cds_flat_spread: Optional[float] = None

    # Manual entry fields (from trade entry form)
    pretty_name: Optional[str] = None
    underlying_type: Optional[str] = None
    underlying_symbol: Optional[str] = None
    strike_1: Optional[float] = None
    strike_2: Optional[float] = None
    call_put: Optional[str] = None
    expiry: Optional[str] = None
    notional_usd: Optional[float] = None
    direction: Optional[str] = None
    notes: Optional[str] = None

    # Spread/package linking
    spread_id: Optional[str] = None  # Links two legs together
    spread_name: Optional[str] = None  # Pretty name for the spread (e.g., "5yr/20yr Payer Spread")
    is_spread_leg: bool = False  # True if this position is part of a spread

    # Metadata
    data_freshness_ts: Optional[datetime] = None
    source_match: Optional[str] = None
    match_confidence: Optional[int] = None

    class Config:
        from_attributes = True


class GroupedMetrics(BaseModel):
    """Metrics for a grouped bucket (family or strategy)."""
    mv_ssc_usd: float = 0.0
    pnl_1d_usd: float = 0.0
    pnl_mtd_usd: float = 0.0
    position_count: int = 0


class FamilyBucket(GroupedMetrics):
    """Rollup bucket by hedge family."""
    hedge_family: str


class StrategyBucket(GroupedMetrics):
    """Rollup bucket by strategy."""
    strategy: str


class FamilyStrategyBucket(GroupedMetrics):
    """Rollup bucket by family and strategy."""
    hedge_family: str
    strategy: str


class Totals(BaseModel):
    """Overall totals across all positions."""
    total_mv_ssc_usd: float = 0.0
    total_dv01_usd: float = 0.0
    total_pnl_1d_usd: float = 0.0
    total_pnl_mtd_usd: float = 0.0
    total_long_mv: float = 0.0
    total_short_mv: float = 0.0
    row_count: int = 0

    # Optional greeks
    total_beta_spx: Optional[float] = None
    total_delta_spx: Optional[float] = None
    total_vega_spx: Optional[float] = None


class RollupHeader(BaseModel):
    """
    Comprehensive rollup header with totals and grouped metrics.
    Returned by /api/rollup endpoint.
    """
    totals: Totals
    by_family: List[FamilyBucket] = []
    by_strategy: List[StrategyBucket] = []
    by_family_and_strategy: List[FamilyStrategyBucket] = []


class RollupResponse(BaseModel):
    """Response from /api/rollup endpoint."""
    header: RollupHeader
    grouped_rows: List[FamilyStrategyBucket]
    portfolio_total_mv: float = Field(
        description="Total MV of entire CPAM portfolio (all 238 positions) for basis points calculations"
    )


class HealthResponse(BaseModel):
    """Response from /api/health endpoint."""
    status: str = "ok"
    timestamp: datetime = Field(default_factory=datetime.now)
    file_timestamps: Optional[Dict[str, Optional[datetime]]] = None


class AggTableQueryParams(BaseModel):
    """Query parameters for /api/agg-table endpoint."""
    family: Optional[str] = None
    strategy: Optional[str] = None
    q: Optional[str] = None  # Name search
    limit: Optional[int] = None
    offset: Optional[int] = 0


class ManualTradeEntry(BaseModel):
    """Schema for creating/updating manual trade entries."""
    # Linking identifiers
    investment_id: Optional[str] = None  # SS&C Investment ID
    bloomberg_id: Optional[str] = None  # Bloomberg ID

    # Display fields
    pretty_name: str  # Required - the human-readable name

    # Classification
    hedge_family: Optional[str] = None
    hedge_label: Optional[str] = None
    strategy: Optional[str] = None

    # Trade details
    underlying_type: Optional[str] = None
    underlying_symbol: Optional[str] = None
    strike_1: Optional[float] = None
    strike_2: Optional[float] = None
    call_put: Optional[str] = None
    expiry: Optional[str] = None
    notional_usd: Optional[float] = None
    direction: Optional[str] = None

    # Spread/package linking
    spread_id: Optional[str] = None  # Links two legs together
    spread_name: Optional[str] = None  # Pretty name for the spread

    # Overrides
    dv01_override: Optional[float] = None
    price_override: Optional[float] = None

    # Notes
    notes: Optional[str] = None
