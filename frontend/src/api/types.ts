/**
 * TypeScript types mirroring backend Pydantic schemas
 */

export interface AggRow {
  // Position identifiers
  portfolio?: string | null;
  location_account?: string | null;
  strategy?: string | null;
  investment_id?: string | null;
  investment_description?: string | null;

  // Security identifiers
  id_bb_sec_num_des?: string | null;
  secid?: string | null;
  name_clean?: string | null;

  // Classification
  manual_flag: boolean;
  hedge_label?: string | null;
  hedge_family?: string | null;

  // Currency and pricing
  local_ccy?: string | null;
  long_mv?: number | null;
  short_mv?: number | null;
  mv_ssc_usd?: number | null;
  price_prior?: number | null;
  price_current?: number | null;

  // PnL
  pnl_1d_usd?: number | null;
  pnl_mtd_usd?: number | null;

  // Risk metrics
  dv01_usd?: number | null;
  cs01_usd?: number | null;
  beta_spx?: number | null;
  delta_spx?: number | null;
  vega_spx?: number | null;

  // Additional market data
  vol_90d?: number | null;
  px_last?: number | null;
  px_mid?: number | null;
  maturity?: string | null;
  yld_ytm_ask?: number | null;
  sw_spread?: number | null;
  cds_flat_spread?: number | null;

  // Manual entry fields
  pretty_name?: string | null;
  underlying_type?: string | null;
  underlying_symbol?: string | null;
  strike_1?: number | null;
  strike_2?: number | null;
  call_put?: string | null;
  expiry?: string | null;
  notional_usd?: number | null;
  direction?: string | null;
  notes?: string | null;

  // Spread/package linking
  spread_id?: string | null;
  spread_name?: string | null;
  is_spread_leg?: boolean;

  // Metadata
  data_freshness_ts?: string | null;
  source_match?: string | null;
  match_confidence?: number | null;
}

export interface GroupedMetrics {
  mv_ssc_usd: number;
  pnl_1d_usd: number;
  pnl_mtd_usd: number;
  position_count: number;
}

export interface FamilyBucket extends GroupedMetrics {
  hedge_family: string;
}

export interface StrategyBucket extends GroupedMetrics {
  strategy: string;
}

export interface FamilyStrategyBucket extends GroupedMetrics {
  hedge_family: string;
  strategy: string;
}

export interface Totals {
  total_mv_ssc_usd: number;
  total_dv01_usd: number;
  total_pnl_1d_usd: number;
  total_pnl_mtd_usd: number;
  total_long_mv: number;
  total_short_mv: number;
  row_count: number;
  total_beta_spx?: number | null;
  total_delta_spx?: number | null;
  total_vega_spx?: number | null;
}

export interface RollupHeader {
  totals: Totals;
  by_family: FamilyBucket[];
  by_strategy: StrategyBucket[];
  by_family_and_strategy: FamilyStrategyBucket[];
}

export interface RollupResponse {
  header: RollupHeader;
  grouped_rows: FamilyStrategyBucket[];
  portfolio_total_mv: number; // Total MV of all CPAM positions for basis points calc
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  file_timestamps?: Record<string, string | null> | null;
}

export interface AggTableQueryParams {
  family?: string;
  strategy?: string;
  q?: string;
  limit?: number;
  offset?: number;
}
