"""Rollup and aggregation logic for hedge analytics."""
import pandas as pd
from typing import Dict, List, Any


class RollupEngine:
    """Generate rollup summaries and grouped analytics."""

    @staticmethod
    def compute_totals(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Compute overall totals for key metrics.
        Returns dict with sum of DV01, MV, PnL, etc.
        """
        # Helper to safely sum columns with potential NaN/None values
        def safe_sum(col_name):
            if col_name in df.columns:
                return float(df[col_name].fillna(0).sum())
            return 0.0

        totals = {
            'total_mv_ssc_usd': safe_sum('mv_ssc_usd'),
            'total_dv01_usd': safe_sum('dv01_usd'),
            'total_pnl_1d_usd': safe_sum('pnl_1d_usd'),
            'total_pnl_mtd_usd': safe_sum('pnl_mtd_usd'),
            'total_long_mv': safe_sum('long_mv'),
            'total_short_mv': safe_sum('short_mv'),
            'row_count': len(df)
        }

        # Optional greeks
        for greek in ['beta_spx', 'delta_spx', 'vega_spx']:
            if greek in df.columns:
                totals[f'total_{greek}'] = safe_sum(greek)

        return totals

    @staticmethod
    def group_by_family(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Group by hedge_family and compute subtotals.
        Returns list of dicts with family name and aggregated metrics.
        """
        if 'hedge_family' not in df.columns:
            return []

        # Fill NaN values with 0 for numeric columns before grouping
        df_filled = df.copy()
        for col in ['mv_ssc_usd', 'dv01_usd', 'pnl_1d_usd', 'pnl_mtd_usd']:
            if col in df_filled.columns:
                df_filled[col] = df_filled[col].fillna(0)

        # Only aggregate columns that exist (DV01 removed from family buckets)
        agg_dict = {}
        if 'mv_ssc_usd' in df_filled.columns:
            agg_dict['mv_ssc_usd'] = 'sum'
        if 'pnl_1d_usd' in df_filled.columns:
            agg_dict['pnl_1d_usd'] = 'sum'
        if 'pnl_mtd_usd' in df_filled.columns:
            agg_dict['pnl_mtd_usd'] = 'sum'
        if 'investment_id' in df_filled.columns:
            agg_dict['investment_id'] = 'count'

        grouped = df_filled.groupby('hedge_family', dropna=False).agg(agg_dict).reset_index()

        result = []
        for _, row in grouped.iterrows():
            hedge_family = row['hedge_family']
            if pd.isna(hedge_family):
                hedge_family = 'Unknown'
            bucket = {'hedge_family': str(hedge_family)}

            if 'mv_ssc_usd' in row:
                bucket['mv_ssc_usd'] = float(row['mv_ssc_usd'])
            else:
                bucket['mv_ssc_usd'] = 0.0

            if 'pnl_1d_usd' in row:
                bucket['pnl_1d_usd'] = float(row['pnl_1d_usd'])
            else:
                bucket['pnl_1d_usd'] = 0.0

            if 'pnl_mtd_usd' in row:
                bucket['pnl_mtd_usd'] = float(row['pnl_mtd_usd'])
            else:
                bucket['pnl_mtd_usd'] = 0.0

            if 'investment_id' in row:
                bucket['position_count'] = int(row['investment_id'])
            else:
                bucket['position_count'] = 0

            result.append(bucket)

        return result

    @staticmethod
    def group_by_strategy(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Group by strategy and compute subtotals.
        Returns list of dicts with strategy name and aggregated metrics.
        """
        if 'strategy' not in df.columns:
            return []

        # Fill NaN values with 0 for numeric columns before grouping
        df_filled = df.copy()
        for col in ['mv_ssc_usd', 'dv01_usd', 'pnl_1d_usd', 'pnl_mtd_usd']:
            if col in df_filled.columns:
                df_filled[col] = df_filled[col].fillna(0)

        # Only aggregate columns that exist (DV01 removed from strategy buckets)
        agg_dict = {}
        if 'mv_ssc_usd' in df_filled.columns:
            agg_dict['mv_ssc_usd'] = 'sum'
        if 'pnl_1d_usd' in df_filled.columns:
            agg_dict['pnl_1d_usd'] = 'sum'
        if 'pnl_mtd_usd' in df_filled.columns:
            agg_dict['pnl_mtd_usd'] = 'sum'
        if 'investment_id' in df_filled.columns:
            agg_dict['investment_id'] = 'count'

        grouped = df_filled.groupby('strategy', dropna=False).agg(agg_dict).reset_index()

        result = []
        for _, row in grouped.iterrows():
            strategy = row['strategy']
            if pd.isna(strategy):
                strategy = 'Unknown'
            bucket = {'strategy': str(strategy)}

            if 'mv_ssc_usd' in row:
                bucket['mv_ssc_usd'] = float(row['mv_ssc_usd'])
            else:
                bucket['mv_ssc_usd'] = 0.0

            if 'pnl_1d_usd' in row:
                bucket['pnl_1d_usd'] = float(row['pnl_1d_usd'])
            else:
                bucket['pnl_1d_usd'] = 0.0

            if 'pnl_mtd_usd' in row:
                bucket['pnl_mtd_usd'] = float(row['pnl_mtd_usd'])
            else:
                bucket['pnl_mtd_usd'] = 0.0

            if 'investment_id' in row:
                bucket['position_count'] = int(row['investment_id'])
            else:
                bucket['position_count'] = 0

            result.append(bucket)

        return result

    @staticmethod
    def group_by_family_and_strategy(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Group by both hedge_family and strategy for detailed breakdown.
        Returns list of dicts with both dimensions.
        """
        if 'hedge_family' not in df.columns or 'strategy' not in df.columns:
            return []

        # Fill NaN values with 0 for numeric columns before grouping
        df_filled = df.copy()
        for col in ['mv_ssc_usd', 'dv01_usd', 'pnl_1d_usd', 'pnl_mtd_usd']:
            if col in df_filled.columns:
                df_filled[col] = df_filled[col].fillna(0)

        # Only aggregate columns that exist
        agg_dict = {}
        if 'mv_ssc_usd' in df_filled.columns:
            agg_dict['mv_ssc_usd'] = 'sum'
        if 'pnl_1d_usd' in df_filled.columns:
            agg_dict['pnl_1d_usd'] = 'sum'
        if 'pnl_mtd_usd' in df_filled.columns:
            agg_dict['pnl_mtd_usd'] = 'sum'
        if 'investment_id' in df_filled.columns:
            agg_dict['investment_id'] = 'count'

        grouped = df_filled.groupby(['hedge_family', 'strategy'], dropna=False).agg(agg_dict).reset_index()

        result = []
        for _, row in grouped.iterrows():
            hedge_family = row['hedge_family']
            if pd.isna(hedge_family):
                hedge_family = 'Unknown'
            strategy = row['strategy']
            if pd.isna(strategy):
                strategy = 'Unknown'
            bucket = {
                'hedge_family': str(hedge_family),
                'strategy': str(strategy)
            }

            if 'mv_ssc_usd' in row:
                bucket['mv_ssc_usd'] = float(row['mv_ssc_usd'])
            else:
                bucket['mv_ssc_usd'] = 0.0

            if 'pnl_1d_usd' in row:
                bucket['pnl_1d_usd'] = float(row['pnl_1d_usd'])
            else:
                bucket['pnl_1d_usd'] = 0.0

            if 'pnl_mtd_usd' in row:
                bucket['pnl_mtd_usd'] = float(row['pnl_mtd_usd'])
            else:
                bucket['pnl_mtd_usd'] = 0.0

            if 'investment_id' in row:
                bucket['position_count'] = int(row['investment_id'])
            else:
                bucket['position_count'] = 0

            result.append(bucket)

        return result

    @staticmethod
    def create_rollup_header(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Create comprehensive rollup header with totals and grouped buckets.
        Returns dict suitable for RollupHeader schema.
        """
        return {
            'totals': RollupEngine.compute_totals(df),
            'by_family': RollupEngine.group_by_family(df),
            'by_strategy': RollupEngine.group_by_strategy(df),
            'by_family_and_strategy': RollupEngine.group_by_family_and_strategy(df)
        }
