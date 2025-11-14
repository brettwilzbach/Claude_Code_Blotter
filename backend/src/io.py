"""Data loading module for CSV files."""
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
from io import StringIO
import pandas as pd
import yaml
import logging
import requests

# Configure logging
logger = logging.getLogger(__name__)


class DataLoader:
    """Handles loading CSV files and configuration."""

    def __init__(self, config_path: str = "config.yaml"):
        """Initialize loader with config file."""
        self.config = self._load_config(config_path)
        self.file_timestamps: Dict[str, Optional[datetime]] = {}

    def _load_config(self, config_path: str) -> dict:
        """Load YAML configuration file."""
        config_file = Path(config_path).resolve()
        logger.info(f"Loading config from: {config_file} (input was: {config_path})")
        if not config_file.exists():
            raise FileNotFoundError(f"Config file not found: {config_file}")

        with open(config_file, 'r') as f:
            return yaml.safe_load(f)

    def _load_csv(self, file_path: str) -> pd.DataFrame:
        """
        Load CSV from either a local file path or a URL.
        
        Args:
            file_path: Local file path or URL (http/https)
            
        Returns:
            DataFrame loaded from CSV
        """
        # Check if it's a URL
        if file_path.startswith(('http://', 'https://')):
            logger.info(f"Loading CSV from URL: {file_path}")
            try:
                response = requests.get(file_path, timeout=30)
                response.raise_for_status()
                df = pd.read_csv(StringIO(response.text))
                logger.info(f"Successfully loaded CSV from URL: {file_path}")
                return df
            except requests.exceptions.RequestException as e:
                logger.error(f"Failed to fetch CSV from URL {file_path}: {e}")
                raise FileNotFoundError(f"Could not fetch CSV from URL: {file_path}")
        else:
            # Local file
            logger.info(f"Loading CSV from local file: {file_path}")
            df = pd.read_csv(file_path)
            logger.info(f"Successfully loaded CSV from local file: {file_path}")
            return df

    def _get_file_timestamp(self, file_path: str) -> Optional[datetime]:
        """Get file modification timestamp."""
        try:
            path = Path(file_path)
            if path.exists():
                mtime = path.stat().st_mtime
                return datetime.fromtimestamp(mtime)
        except Exception:
            pass
        return None

    def load_ssc_positions(self) -> pd.DataFrame:
        """
        Load SS&C positions and PnL data.
        Expected columns: Portfolio, Location Account, Investment ID,
        Investment Description, Strategy, Local CCY, Prior Quote,
        Current Quote, Long MV (col M), Short MV (col N),
        Daily Market PnL (col S), MTD Market PnL (col X)
        """
        file_path = self.config['file_paths']['ssc_positions']
        self.file_timestamps['ssc'] = self._get_file_timestamp(file_path)

        df = self._load_csv(file_path)
        return df

    def load_mars_risk(self) -> pd.DataFrame:
        """
        Load MARS risk data.
        Key fields: id_bb_sec_num_des, sw_eqv_bpv (DV01),
        volatility_90d, px_mid, maturity, etc.
        """
        file_path = self.config['file_paths']['mars_risk']
        self.file_timestamps['mars'] = self._get_file_timestamp(file_path)

        df = self._load_csv(file_path)
        return df

    def load_bloomberg_refs(self) -> pd.DataFrame:
        """
        Load Bloomberg API reference data.
        Key fields: id_bb_sec_num_des, px_close_1d (fallback for PX_LAST),
        name, maturity, yields, spreads
        """
        file_path = self.config['file_paths']['bloomberg_refs']
        self.file_timestamps['bbg'] = self._get_file_timestamp(file_path)

        df = self._load_csv(file_path)
        return df

    def load_manual_entries(self) -> Optional[pd.DataFrame]:
        """
        Load manual Bolt blotter entries if present.
        Returns None if file doesn't exist.
        Expected columns from template: trade_id, hedge_family, hedge_label,
        strategy, name_freeform, underlier_type, underlier_symbol, direction,
        quantity, contract_multiplier, notional_usd, price, dv01_usd,
        beta_spx, delta_spx, vega_spx, delta_wti, vega_wti, delta_xau,
        vega_xau, vol_est, strike, call_put, expiry, comments, mars_id,
        bb_uid, cusip, px_last_override
        """
        file_path = self.config['file_paths'].get('manual_entries')
        if not file_path:
            return None

        path = Path(file_path)
        if not path.exists():
            return None

        self.file_timestamps['manual'] = self._get_file_timestamp(file_path)
        df = self._load_csv(file_path)
        return df

    def get_timestamps(self) -> Dict[str, Optional[datetime]]:
        """Return dictionary of file modification timestamps."""
        return self.file_timestamps

    def save_manual_entry(self, entry_data: dict) -> None:
        """
        Save or update a manual trade entry to CSV.
        If investment_id exists, updates that row. Otherwise appends new row.

        Raises:
            ValueError: If manual entries file path is not configured
            FileNotFoundError: If parent directory does not exist
            PermissionError: If insufficient permissions to write file
            pd.errors.ParserError: If existing CSV is malformed
        """
        # Validate configuration
        file_path = self.config['file_paths'].get('manual_entries')
        if not file_path:
            logger.error("Manual entries file path not configured in config.yaml")
            raise ValueError("Manual entries file path not configured")

        path = Path(file_path)

        # Ensure parent directory exists
        if not path.parent.exists():
            logger.error(f"Parent directory does not exist: {path.parent}")
            raise FileNotFoundError(f"Parent directory does not exist: {path.parent}")

        # Validate entry_data structure
        if not isinstance(entry_data, dict):
            raise ValueError("entry_data must be a dictionary")

        # Add audit trail timestamp
        entry_data['updated_at'] = datetime.now().isoformat()

        # Define expected columns (with audit trail)
        expected_columns = [
            'investment_id', 'bloomberg_id', 'pretty_name', 'hedge_family',
            'hedge_label', 'strategy', 'underlying_type', 'underlying_symbol',
            'strike_1', 'strike_2', 'call_put', 'expiry', 'notional_usd',
            'direction', 'spread_id', 'spread_name', 'dv01_override',
            'price_override', 'notes', 'updated_at'
        ]

        # Load existing data or create empty dataframe
        try:
            if path.exists():
                logger.info(f"Loading existing manual entries from {file_path}")
                df = pd.read_csv(file_path)

                # Ensure updated_at column exists in existing data
                if 'updated_at' not in df.columns:
                    df['updated_at'] = None
                    logger.info("Added updated_at column to existing data")
            else:
                logger.info(f"Creating new manual entries file at {file_path}")
                df = pd.DataFrame(columns=expected_columns)

        except pd.errors.ParserError as e:
            logger.error(f"Failed to parse existing CSV at {file_path}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error loading CSV at {file_path}: {e}")
            raise

        # Check if entry exists (by investment_id)
        investment_id = entry_data.get('investment_id')
        is_update = False

        if investment_id and not df.empty and 'investment_id' in df.columns:
            mask = df['investment_id'] == investment_id
            if mask.any():
                # Update existing row
                is_update = True
                logger.info(f"Updating existing entry with investment_id: {investment_id}")

                # Store old values for logging
                old_row = df[mask].iloc[0].to_dict()

                for key, value in entry_data.items():
                    if key in df.columns:
                        df.loc[mask, key] = value

                # Log what changed
                changes = []
                for key in entry_data.keys():
                    if key in old_row and old_row.get(key) != entry_data.get(key):
                        changes.append(f"{key}: {old_row.get(key)} -> {entry_data.get(key)}")

                if changes:
                    logger.info(f"Changes: {', '.join(changes)}")
            else:
                # Append new row
                logger.info(f"Appending new entry with investment_id: {investment_id}")
                new_row_df = pd.DataFrame([entry_data])
                df = pd.concat([df, new_row_df], ignore_index=True)
        else:
            # Append new row (no investment_id or empty dataframe)
            logger.info("Appending new entry (no investment_id provided)")
            new_row_df = pd.DataFrame([entry_data])
            df = pd.concat([df, new_row_df], ignore_index=True)

        # Ensure all expected columns exist (add missing ones with None)
        for col in expected_columns:
            if col not in df.columns:
                df[col] = None

        # Reorder columns to match expected order
        df = df[expected_columns]

        # Save back to CSV with error handling
        try:
            # Create backup before writing (safety measure)
            if path.exists():
                backup_path = path.with_suffix('.csv.backup')
                df_backup = pd.read_csv(file_path)
                df_backup.to_csv(backup_path, index=False)
                logger.debug(f"Created backup at {backup_path}")

            # Write to CSV
            df.to_csv(file_path, index=False)
            logger.info(f"Successfully saved manual entry to {file_path}")

        except PermissionError as e:
            logger.error(f"Permission denied writing to {file_path}: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to write CSV to {file_path}: {e}")
            raise
