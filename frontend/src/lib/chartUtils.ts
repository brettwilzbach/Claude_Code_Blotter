import dayjs from 'dayjs';
import { AggRow } from '../api/types';

/**
 * Time bucket definitions for expiry ladder
 */
export type ExpiryBucket = '0-3M' | '3-6M' | '6-12M' | '12M+';

export interface ExpiryBucketData {
  bucket: ExpiryBucket;
  marketValue: number;
  count: number;
  displayOrder: number;
}

export interface AssetTypeData {
  assetType: string;
  marketValue: number;
  percentage: number;
  color: string;
}

/**
 * Categorizes a date into an expiry bucket based on days until expiry
 */
export function getExpiryBucket(expiryDate: string | null | undefined): ExpiryBucket | null {
  if (!expiryDate) return null;

  const today = dayjs();
  const expiry = dayjs(expiryDate);

  if (!expiry.isValid()) return null;

  const daysUntilExpiry = expiry.diff(today, 'day');

  // Handle expired positions
  if (daysUntilExpiry < 0) return null;

  if (daysUntilExpiry <= 90) return '0-3M';
  if (daysUntilExpiry <= 180) return '3-6M';
  if (daysUntilExpiry <= 365) return '6-12M';
  return '12M+';
}

/**
 * Aggregates positions into expiry buckets
 */
export function aggregateByExpiryBucket(positions: AggRow[]): ExpiryBucketData[] {
  const bucketMap = new Map<ExpiryBucket, { mv: number; count: number }>();

  // Initialize buckets
  const buckets: ExpiryBucket[] = ['0-3M', '3-6M', '6-12M', '12M+'];
  buckets.forEach(bucket => {
    bucketMap.set(bucket, { mv: 0, count: 0 });
  });

  // Aggregate positions
  positions.forEach(position => {
    const bucket = getExpiryBucket(position.expiry);
    if (bucket && position.mv_ssc_usd != null) {
      const current = bucketMap.get(bucket)!;
      current.mv += position.mv_ssc_usd;
      current.count += 1;
    }
  });

  // Convert to array format for charting
  const displayOrderMap: Record<ExpiryBucket, number> = {
    '0-3M': 1,
    '3-6M': 2,
    '6-12M': 3,
    '12M+': 4,
  };

  return buckets.map(bucket => {
    const data = bucketMap.get(bucket)!;
    return {
      bucket,
      marketValue: data.mv,
      count: data.count,
      displayOrder: displayOrderMap[bucket],
    };
  });
}

/**
 * Maps underlying symbols to asset type categories
 */
export function getAssetType(position: AggRow): string {
  const symbol = position.underlying_symbol?.toUpperCase() || '';
  const type = position.underlying_type?.toUpperCase() || '';

  // CDX Investment Grade
  if (symbol.includes('CDX IG') || symbol.includes('CDX.IG')) {
    return 'IG';
  }

  // CDX High Yield
  if (symbol.includes('CDX HY') || symbol.includes('CDX.HY') || symbol.includes('HYG')) {
    return 'HY';
  }

  // SPY and equity indices
  if (symbol.includes('SPY') || symbol.includes('SPX') || symbol.includes('S&P')) {
    return 'SPY';
  }

  // Fallback to underlying type if available
  if (type.includes('CREDIT')) {
    // Try to determine if IG or HY
    if (symbol.includes('IG')) return 'IG';
    if (symbol.includes('HY')) return 'HY';
    return 'Credit (Other)';
  }

  if (type.includes('EQUITY')) {
    return 'Equity (Other)';
  }

  return 'Other';
}

/**
 * Aggregates positions by asset type with percentages
 */
export function aggregateByAssetType(positions: AggRow[]): AssetTypeData[] {
  const assetMap = new Map<string, number>();
  let totalMV = 0;

  // Aggregate by asset type
  positions.forEach(position => {
    if (position.mv_ssc_usd != null) {
      const assetType = getAssetType(position);
      const currentMV = assetMap.get(assetType) || 0;
      assetMap.set(assetType, currentMV + Math.abs(position.mv_ssc_usd));
      totalMV += Math.abs(position.mv_ssc_usd);
    }
  });

  // Color scheme - teal/gray pattern
  const colorMap: Record<string, string> = {
    'IG': '#14b8a6',        // Teal
    'HY': '#0d9488',        // Dark teal
    'SPY': '#2dd4bf',       // Light teal
    'Credit (Other)': '#5eead4',  // Very light teal
    'Equity (Other)': '#99f6e4',  // Pale teal
    'Other': '#6b7280',     // Gray
  };

  // Convert to array with percentages
  const result: AssetTypeData[] = [];
  assetMap.forEach((mv, assetType) => {
    result.push({
      assetType,
      marketValue: mv,
      percentage: totalMV > 0 ? (mv / totalMV) * 100 : 0,
      color: colorMap[assetType] || '#6b7280',
    });
  });

  // Sort by market value descending
  result.sort((a, b) => b.marketValue - a.marketValue);

  return result;
}
