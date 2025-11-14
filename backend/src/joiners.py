"""Data joining logic - merge positions with risk and reference data."""
import pandas as pd
from typing import Dict, List, Tuple, Optional
import yaml


class DataJoiner:
    """Join SS&C positions with MARS risk and Bloomberg reference data."""

    def __init__(self, config: dict):
        """Initialize with configuration."""
        self.config = config
        self.strategy_to_family = config.get('hedge_classification', {}).get(
            'strategy_to_family', {}
        )

    def join_data(
        self,
        ssc_df: pd.DataFrame,
        mars_df: pd.DataFrame,
        bbg_df: pd.DataFrame,
        manual_df: Optional[pd.DataFrame] = None
    ) -> pd.DataFrame:
        """
        Join all data sources with manual entries enriching positions:
        1. SS&C positions (base) + MARS risk + Bloomberg refs
        2. Manual entries overlay to add pretty names and details

        Join strategy:
        - First try: secid (if present)
        - Second try: id_bb_sec_num_des
        - Third try: name_clean (case-insensitive exact match)
        - Manual entries enrich by investment_id
        """
        joined_rows = []

        # Track which SS&C positions have been matched to manual entries
        matched_investment_ids = set()

        # Process SS&C positions with joining
        for _, ssc_row in ssc_df.iterrows():
            joined_row = self._join_position_row(
                ssc_row, mars_df, bbg_df, manual_df
            )
            joined_rows.append(joined_row)

            # Track if this SS&C position was enriched by manual entry
            if joined_row.get('manual_flag'):
                inv_id = joined_row.get('investment_id')
                if inv_id:
                    matched_investment_ids.add(inv_id)

        # Process manual entries that don't have matching SS&C positions
        # (new trades not yet in SS&C)
        if manual_df is not None and not manual_df.empty:
            for _, manual_row in manual_df.iterrows():
                inv_id = manual_row.get('investment_id')
                # Only add if not already matched to SS&C position
                if not inv_id or inv_id not in matched_investment_ids:
                    joined_row = self._process_standalone_manual_row(
                        manual_row, mars_df, bbg_df
                    )
                    joined_rows.append(joined_row)

        result_df = pd.DataFrame(joined_rows)

        # Ensure all expected columns exist (fill with None if missing)
        expected_columns = [
            'dv01_usd', 'beta_spx', 'delta_spx', 'vega_spx', 'vol_90d',
            'px_last', 'px_mid', 'maturity', 'yld_ytm_ask', 'sw_spread',
            'cds_flat_spread', 'secid'
        ]
        for col in expected_columns:
            if col not in result_df.columns:
                result_df[col] = None

        # Ensure is_spread_leg exists and defaults to False for all rows
        if 'is_spread_leg' not in result_df.columns:
            result_df['is_spread_leg'] = False
        else:
            # Fill any None values with False
            result_df['is_spread_leg'] = result_df['is_spread_leg'].fillna(False).astype(bool)

        # Apply hedge classification
        result_df = self._classify_hedges(result_df)

        return result_df

    def _process_standalone_manual_row(
        self,
        manual_row: pd.Series,
        mars_df: pd.DataFrame,
        bbg_df: pd.DataFrame
    ) -> dict:
        """
        Process a manual entry that doesn't have matching SS&C position.
        Try to enrich with MARS/Bloomberg data if bloomberg_id is provided.
        """
        result = manual_row.to_dict()

        # Try to join with MARS/Bloomberg if bloomberg_id exists
        bloomberg_id = manual_row.get('id_bb_sec_num_des')
        if bloomberg_id and pd.notna(bloomberg_id):
            # Try MARS
            if 'id_bb_sec_num_des' in mars_df.columns:
                mars_matches = mars_df[mars_df['id_bb_sec_num_des'] == bloomberg_id]
                if not mars_matches.empty:
                    result = self._merge_fields(result, mars_matches.iloc[0])

            # Try Bloomberg
            if 'id_bb_sec_num_des' in bbg_df.columns:
                bbg_matches = bbg_df[bbg_df['id_bb_sec_num_des'] == bloomberg_id]
                if not bbg_matches.empty:
                    result = self._merge_fields(result, bbg_matches.iloc[0], prefer_new=True)

        # Set metadata
        result['source_match'] = 'manual_only'
        result['match_confidence'] = 3  # Manual entries are high confidence
        result['join_audit'] = 'manual_standalone'

        return result

    def _join_position_row(
        self,
        ssc_row: pd.Series,
        mars_df: pd.DataFrame,
        bbg_df: pd.DataFrame,
        manual_df: Optional[pd.DataFrame] = None
    ) -> dict:
        """
        Join a single SS&C position row with MARS and Bloomberg data.
        Returns a dictionary with all merged fields.
        """
        result = ssc_row.to_dict()

        # Track join method and confidence
        mars_match = None
        bbg_match = None
        match_confidence = 0
        join_audit_parts = []

        # Try joining with MARS
        mars_match, mars_method, mars_conf = self._find_match(
            ssc_row, mars_df
        )
        if mars_match is not None:
            result = self._merge_fields(result, mars_match)
            match_confidence = max(match_confidence, mars_conf)
            join_audit_parts.append(f"mars:{mars_method}")

        # Try joining with Bloomberg
        bbg_match, bbg_method, bbg_conf = self._find_match(
            ssc_row, bbg_df
        )
        if bbg_match is not None:
            # Bloomberg takes precedence for reference data
            result = self._merge_fields(result, bbg_match, prefer_new=True)
            match_confidence = max(match_confidence, bbg_conf)
            join_audit_parts.append(f"bbg:{bbg_method}")

        # Enrich with manual entry if present (HIGHEST PRIORITY)
        if manual_df is not None and not manual_df.empty:
            investment_id = ssc_row.get('investment_id')
            if investment_id and pd.notna(investment_id) and 'investment_id' in manual_df.columns:
                manual_matches = manual_df[manual_df['investment_id'] == investment_id]
                if not manual_matches.empty:
                    manual_row = manual_matches.iloc[0]
                    # Manual entry enriches with pretty_name and additional fields
                    result = self._merge_fields(result, manual_row, prefer_new=True)
                    result['manual_flag'] = True
                    join_audit_parts.append('manual_enriched')
                    # Manual enrichment gives highest confidence
                    match_confidence = 3

        # Set join metadata
        result['match_confidence'] = match_confidence
        result['join_audit'] = '; '.join(join_audit_parts) if join_audit_parts else 'no_match'

        # Determine source_match
        if result.get('manual_flag'):
            result['source_match'] = 'manual+ssc+mars+bbg'
        elif mars_match is not None and bbg_match is not None:
            result['source_match'] = 'mars+bbg'
        elif mars_match is not None:
            result['source_match'] = 'mars'
        elif bbg_match is not None:
            result['source_match'] = 'bbg'
        else:
            result['source_match'] = 'ssc_only'

        # Ensure is_spread_leg defaults to False if not set
        if 'is_spread_leg' not in result:
            result['is_spread_leg'] = False

        return result

    def _find_match(
        self,
        ssc_row: pd.Series,
        target_df: pd.DataFrame
    ) -> Tuple[Optional[pd.Series], str, int]:
        """
        Find a matching row in target dataframe.
        Returns: (matched_row, method, confidence)
        Confidence: 3=secid, 2=id_bb, 1=name, 0=no match
        """
        # Try 1: secid (if present)
        if 'secid' in ssc_row and pd.notna(ssc_row['secid']):
            if 'secid' in target_df.columns:
                matches = target_df[target_df['secid'] == ssc_row['secid']]
                if not matches.empty:
                    return matches.iloc[0], 'secid', 3

        # Try 2: id_bb_sec_num_des
        if 'id_bb_sec_num_des' in ssc_row and pd.notna(ssc_row['id_bb_sec_num_des']):
            if 'id_bb_sec_num_des' in target_df.columns:
                matches = target_df[
                    target_df['id_bb_sec_num_des'] == ssc_row['id_bb_sec_num_des']
                ]
                if not matches.empty:
                    return matches.iloc[0], 'id_bb', 2

        # Try 3: name_clean (case-insensitive exact match)
        if 'name_clean' in ssc_row and ssc_row['name_clean']:
            if 'name_clean' in target_df.columns:
                matches = target_df[
                    target_df['name_clean'] == ssc_row['name_clean']
                ]
                if not matches.empty:
                    return matches.iloc[0], 'name', 1

        return None, 'none', 0

    def _merge_fields(
        self,
        base: dict,
        new_data: pd.Series,
        prefer_new: bool = False
    ) -> dict:
        """
        Merge fields from new_data into base dictionary.
        If prefer_new=True, new values overwrite existing (for Bloomberg priority).
        Otherwise, only fill missing values.
        """
        for key, value in new_data.items():
            if pd.isna(value):
                continue

            if key not in base or pd.isna(base.get(key)):
                base[key] = value
            elif prefer_new:
                # For reference fields, Bloomberg takes precedence
                if key in ['px_last', 'maturity', 'yld_ytm_ask',
                          'sw_spread', 'cds_flat_spread', 'px_mid']:
                    base[key] = value

        return base

    def _classify_hedges(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Apply hedge classification rules.
        Priority:
        1. Manual override (hedge_family, hedge_label already set)
        2. Config strategy_to_family mapping
        3. Default to "Vanilla Risk-Off Hedges"
        """
        def classify_row(row):
            # Skip if manual entry with classification already set
            if row.get('manual_flag') and pd.notna(row.get('hedge_family')):
                return row

            # Apply strategy mapping
            strategy = row.get('strategy', '')
            if strategy in self.strategy_to_family:
                row['hedge_family'] = self.strategy_to_family[strategy]
            elif pd.isna(row.get('hedge_family')):
                row['hedge_family'] = 'Vanilla Risk-Off Hedges'

            # Set hedge_label if not present
            if pd.isna(row.get('hedge_label')):
                # Use investment description or name, truncated
                desc = row.get('investment_description', row.get('name', ''))
                if desc:
                    row['hedge_label'] = desc[:50]
                else:
                    row['hedge_label'] = 'Unknown'

            return row

        return df.apply(classify_row, axis=1)
