"""FastAPI application with hedge table endpoints."""
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
from typing import List, Optional
from pathlib import Path
import pandas as pd
import threading
import logging
import math
import json

from .schemas import (
    AggRow, RollupHeader, RollupResponse, HealthResponse,
    Totals, FamilyBucket, StrategyBucket, FamilyStrategyBucket,
    ManualTradeEntry
)
from .io import DataLoader
from .normalize import (
    SSCNormalizer, MARSNormalizer, BloombergNormalizer, ManualNormalizer
)
from .joiners import DataJoiner
from .rollups import RollupEngine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get config path relative to backend root
def get_config_path() -> str:
    """Get absolute path to config.yaml"""
    backend_root = Path(__file__).parent.parent
    return str(backend_root / "config.yaml")


# Custom JSON encoder to handle NaN
class NanSafeJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj):
                return None
        return super().default(obj)


def clean_nan_values(rows: list) -> list:
    """Clean NaN values from dictionaries for JSON serialization."""
    cleaned = []
    for row in rows:
        cleaned_row = {}
        for k, v in row.items():
            if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                cleaned_row[k] = None
            else:
                cleaned_row[k] = v
        cleaned.append(cleaned_row)
    return cleaned


# Initialize FastAPI app
app = FastAPI(
    title="Hedge Analytics API",
    description="Aggregate hedge table API for risk metrics and PnL",
    version="1.0.0"
)

# CORS middleware - allow frontend on localhost:5173 and 5174
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state (cache) - in production, use Redis or similar
_data_cache: Optional[pd.DataFrame] = None
_cache_timestamp: Optional[datetime] = None
_file_timestamps: dict = {}
_portfolio_total_mv: Optional[float] = None
_cache_lock = threading.Lock()  # Thread safety for cache operations


def calculate_portfolio_total() -> float:
    """
    Calculate total MV of entire portfolio (all positions).
    Used as denominator for basis points calculations.
    """
    loader = DataLoader(config_path=get_config_path())
    ssc_df = loader.load_ssc_positions()

    # Get portfolio filter from config
    portfolio_filter = loader.config.get('filters', {}).get('portfolio_filter', 'CPAM')

    # Filter to configured portfolio only (before hedge strategy filter)
    portfolio_df = ssc_df[ssc_df['Portfolio'] == portfolio_filter].copy()

    # Calculate total MV (Long MV + Short MV)
    total_mv = (portfolio_df['Long MV'] + portfolio_df['Short MV']).sum()

    logger.info(f"Calculated portfolio total MV for {portfolio_filter}: {total_mv:,.2f}")

    return float(total_mv)


def load_and_process_data(force_reload: bool = False) -> pd.DataFrame:
    """
    Load and process all data sources.
    Caches result for performance with thread safety.
    """
    global _data_cache, _cache_timestamp, _file_timestamps, _portfolio_total_mv

    # Return cached data if available and not forcing reload
    with _cache_lock:
        if not force_reload and _data_cache is not None:
            return _data_cache

    # Load configuration and data
    loader = DataLoader(config_path=get_config_path())

    # Load all CSV sources
    ssc_df = loader.load_ssc_positions()
    mars_df = loader.load_mars_risk()
    bbg_df = loader.load_bloomberg_refs()
    manual_df = loader.load_manual_entries()

    # Normalize data (pass config to SSC normalizer)
    ssc_norm = SSCNormalizer.normalize(ssc_df, config=loader.config)
    mars_norm = MARSNormalizer.normalize(mars_df)
    bbg_norm = BloombergNormalizer.normalize(bbg_df)
    manual_norm = None
    if manual_df is not None:
        manual_norm = ManualNormalizer.normalize(manual_df)

    # Join data
    joiner = DataJoiner(loader.config)
    joined_df = joiner.join_data(ssc_norm, mars_norm, bbg_norm, manual_norm)

    # Add data freshness timestamp
    processing_ts = datetime.now()
    joined_df['data_freshness_ts'] = processing_ts

    # Calculate portfolio total for basis points (if not already cached)
    if _portfolio_total_mv is None:
        _portfolio_total_mv = calculate_portfolio_total()

    # Cache results with thread safety
    with _cache_lock:
        _data_cache = joined_df
        _cache_timestamp = processing_ts
        _file_timestamps = loader.get_timestamps()

    return joined_df


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    Returns OK status and file modification timestamps.
    """
    return HealthResponse(
        status="ok",
        timestamp=datetime.now(),
        file_timestamps=_file_timestamps
    )


@app.get("/api/agg-table", response_model=List[AggRow])
async def get_agg_table(
    family: Optional[str] = Query(None, description="Filter by hedge family"),
    strategy: Optional[str] = Query(None, description="Filter by strategy"),
    q: Optional[str] = Query(None, description="Search by name (investment description)"),
    limit: Optional[int] = Query(None, description="Limit number of rows"),
    offset: int = Query(0, description="Offset for pagination")
):
    """
    Get aggregate hedge table with optional filters.

    Query params:
    - family: Filter by hedge_family
    - strategy: Filter by strategy
    - q: Search in investment_description or hedge_label
    - limit: Maximum rows to return
    - offset: Skip N rows (for pagination)
    """
    try:
        df = load_and_process_data()

        # Apply filters
        if family:
            df = df[df['hedge_family'] == family]

        if strategy:
            df = df[df['strategy'] == strategy]

        if q:
            # Search in investment_description or hedge_label
            q_lower = q.lower()
            mask = (
                df['investment_description'].str.lower().str.contains(q_lower, na=False) |
                df['hedge_label'].str.lower().str.contains(q_lower, na=False)
            )
            df = df[mask]

        # Apply pagination
        if offset > 0:
            df = df.iloc[offset:]

        if limit:
            df = df.head(limit)

        # Convert to list of AggRow models
        df = df.copy()

        # Convert None to False for boolean fields
        if 'manual_flag' in df.columns:
            df.loc[:, 'manual_flag'] = df['manual_flag'].fillna(False).astype(bool)
        if 'is_spread_leg' in df.columns:
            df.loc[:, 'is_spread_leg'] = df['is_spread_leg'].fillna(False).astype(bool)

        # Convert to dict
        rows = df.to_dict('records')

        # Clean NaN values
        rows = clean_nan_values(rows)

        return [AggRow(**row) for row in rows]

    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        raise HTTPException(status_code=404, detail=f"Required data file not found: {str(e)}")
    except KeyError as e:
        logger.error(f"Missing column in data: {e}")
        raise HTTPException(status_code=500, detail=f"Data schema error - missing column: {str(e)}")
    except pd.errors.ParserError as e:
        logger.error(f"CSV parsing error: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in agg-table: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/rollup", response_model=RollupResponse)
async def get_rollup():
    """
    Get rollup header with totals and grouped metrics.

    Returns:
    - header: RollupHeader with totals and grouped buckets
    - grouped_rows: List of metrics grouped by family and strategy
    """
    try:
        df = load_and_process_data()

        # Generate rollup header
        rollup_data = RollupEngine.create_rollup_header(df)

        # Build response models
        totals = Totals(**rollup_data['totals'])

        by_family = [
            FamilyBucket(**bucket) for bucket in rollup_data['by_family']
        ]

        by_strategy = [
            StrategyBucket(**bucket) for bucket in rollup_data['by_strategy']
        ]

        by_family_and_strategy = [
            FamilyStrategyBucket(**bucket)
            for bucket in rollup_data['by_family_and_strategy']
        ]

        header = RollupHeader(
            totals=totals,
            by_family=by_family,
            by_strategy=by_strategy,
            by_family_and_strategy=by_family_and_strategy
        )

        return RollupResponse(
            header=header,
            grouped_rows=by_family_and_strategy,
            portfolio_total_mv=_portfolio_total_mv or 0.0
        )

    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        raise HTTPException(status_code=404, detail=f"Required data file not found: {str(e)}")
    except KeyError as e:
        logger.error(f"Missing column in rollup: {e}")
        raise HTTPException(status_code=500, detail=f"Data schema error - missing column: {str(e)}")
    except ValueError as e:
        logger.error(f"Value error in rollup calculation: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid data value: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in rollup: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sample", response_model=List[AggRow])
async def get_sample(limit: int = Query(20, description="Number of sample rows")):
    """
    Get sample rows for quick preview.
    Returns first N rows (default 20).
    """
    try:
        df = load_and_process_data()

        # Take first N rows
        df = df.head(limit)

        # Convert to list of AggRow models
        df = df.copy()

        # Convert None to False for boolean fields
        if 'manual_flag' in df.columns:
            df.loc[:, 'manual_flag'] = df['manual_flag'].fillna(False).astype(bool)
        if 'is_spread_leg' in df.columns:
            df.loc[:, 'is_spread_leg'] = df['is_spread_leg'].fillna(False).astype(bool)

        # Convert to dict
        rows = df.to_dict('records')

        # Clean NaN values
        rows = clean_nan_values(rows)

        return [AggRow(**row) for row in rows]

    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        raise HTTPException(status_code=404, detail=f"Required data file not found: {str(e)}")
    except KeyError as e:
        logger.error(f"Missing column in sample data: {e}")
        raise HTTPException(status_code=500, detail=f"Data schema error - missing column: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in sample: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/refresh")
async def refresh_data():
    """
    Force reload of all data sources.
    Clears cache and reprocesses.
    """
    try:
        load_and_process_data(force_reload=True)
        return {
            "status": "success",
            "message": "Data refreshed successfully",
            "timestamp": datetime.now()
        }
    except FileNotFoundError as e:
        logger.error(f"File not found during refresh: {e}")
        raise HTTPException(status_code=404, detail=f"Required data file not found: {str(e)}")
    except pd.errors.ParserError as e:
        logger.error(f"CSV parsing error during refresh: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error during refresh: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def validate_trade_entry(trade: ManualTradeEntry) -> None:
    """
    Validate manual trade entry data.

    Raises HTTPException with 400 status code if validation fails.
    """
    # Validate pretty_name is not empty or whitespace
    if not trade.pretty_name or not trade.pretty_name.strip():
        raise HTTPException(
            status_code=400,
            detail="pretty_name is required and cannot be empty or whitespace"
        )

    # Validate pretty_name length
    if len(trade.pretty_name) > 200:
        raise HTTPException(
            status_code=400,
            detail="pretty_name cannot exceed 200 characters"
        )

    # Validate numeric fields have reasonable ranges
    if trade.strike_1 is not None and (trade.strike_1 < 0 or trade.strike_1 > 1e10):
        raise HTTPException(
            status_code=400,
            detail="strike_1 must be between 0 and 10 billion"
        )

    if trade.strike_2 is not None and (trade.strike_2 < 0 or trade.strike_2 > 1e10):
        raise HTTPException(
            status_code=400,
            detail="strike_2 must be between 0 and 10 billion"
        )

    if trade.notional_usd is not None and (trade.notional_usd < -1e12 or trade.notional_usd > 1e12):
        raise HTTPException(
            status_code=400,
            detail="notional_usd must be between -1 trillion and 1 trillion"
        )

    if trade.dv01_override is not None and (trade.dv01_override < -1e9 or trade.dv01_override > 1e9):
        raise HTTPException(
            status_code=400,
            detail="dv01_override must be between -1 billion and 1 billion"
        )

    if trade.price_override is not None and (trade.price_override < 0 or trade.price_override > 1e10):
        raise HTTPException(
            status_code=400,
            detail="price_override must be between 0 and 10 billion"
        )

    # Validate call_put if provided
    if trade.call_put is not None:
        valid_call_put = ["CALL", "PUT", "call", "put"]
        if trade.call_put.strip().upper() not in ["CALL", "PUT"]:
            raise HTTPException(
                status_code=400,
                detail=f"call_put must be 'CALL' or 'PUT', got: {trade.call_put}"
            )

    # Validate direction if provided
    if trade.direction is not None:
        if trade.direction.strip().upper() not in ["LONG", "SHORT"]:
            raise HTTPException(
                status_code=400,
                detail=f"direction must be 'LONG' or 'SHORT', got: {trade.direction}"
            )

    # Validate expiry date format if provided
    if trade.expiry is not None and trade.expiry.strip():
        try:
            # Try to parse as datetime to validate format
            pd.to_datetime(trade.expiry)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail=f"expiry must be a valid date format (e.g., YYYY-MM-DD), got: {trade.expiry}"
            )

    # Validate at least one identifier is provided for matching
    if not trade.investment_id and not trade.bloomberg_id:
        logger.warning(
            "Trade entry has no investment_id or bloomberg_id - will create standalone entry"
        )


@app.post("/api/trade")
async def create_trade(trade: ManualTradeEntry):
    """
    Create or update a manual trade entry.
    Saves to manual_bolt_export.csv and reloads data.

    Validates input data before saving and provides specific error messages.
    """
    try:
        # Validate trade entry
        validate_trade_entry(trade)

        # Add timestamp to entry
        from datetime import datetime
        entry_timestamp = datetime.now()

        logger.info(f"Creating/updating trade entry: {trade.pretty_name} (investment_id: {trade.investment_id})")

        # Load configuration
        loader = DataLoader(config_path=get_config_path())

        # Prepare entry data
        entry_data = trade.dict(exclude_none=False)

        # Save to CSV
        loader.save_manual_entry(entry_data)

        logger.info(f"Trade entry saved successfully: {trade.pretty_name}")

        # Reload data to include new entry
        load_and_process_data(force_reload=True)

        logger.info(f"Data reloaded successfully after trade entry")

        return {
            "status": "success",
            "message": "Trade saved successfully",
            "investment_id": trade.investment_id,
            "timestamp": entry_timestamp
        }

    except HTTPException:
        # Re-raise validation errors
        raise

    except FileNotFoundError as e:
        logger.error(f"File not found while saving trade: {e}")
        raise HTTPException(
            status_code=404,
            detail=f"Required data file not found: {str(e)}"
        )

    except PermissionError as e:
        logger.error(f"Permission error while saving trade: {e}")
        raise HTTPException(
            status_code=403,
            detail=f"Permission denied: {str(e)}"
        )

    except pd.errors.ParserError as e:
        logger.error(f"CSV parsing error while saving trade: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid CSV format in existing data: {str(e)}"
        )

    except ValueError as e:
        logger.error(f"Value error while saving trade: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid data value: {str(e)}"
        )

    except Exception as e:
        logger.error(f"Unexpected error while saving trade: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
