/**
 * Formatting utilities for currency, numbers, and risk metrics
 */

/**
 * Format number as USD currency with thousands separator
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatCurrency(
  value: number | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format number as USD with dollar sign
 */
export function formatUSD(
  value: number | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  return '$' + formatCurrency(value, decimals);
}

/**
 * Format DV01 (basis points value)
 * Negative values indicate short rate risk
 * @param value - DV01 value in USD per bp
 * @returns Formatted string with thousands separator
 */
export function formatDV01(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  return formatCurrency(value, 0);
}

/**
 * Get CSS class for DV01 coloring
 * Negative values (short rate risk) shown in red
 */
export function getDV01ColorClass(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }

  return value < 0 ? 'text-red-600' : 'text-green-600';
}

/**
 * Format basis points
 */
export function formatBps(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  return formatCurrency(value, 2) + ' bp';
}

/**
 * Format percentage
 */
export function formatPercent(
  value: number | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  return (value * 100).toFixed(decimals) + '%';
}

/**
 * Format volatility (already in percentage points)
 */
export function formatVol(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  return value.toFixed(2) + '%';
}

/**
 * Format generic number with thousands separator
 */
export function formatNumber(
  value: number | null | undefined,
  decimals: number = 0
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format date string
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) {
    return '-';
  }

  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format timestamp to time only
 */
export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) {
    return '-';
  }

  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Shorten long text with ellipsis
 */
export function truncate(text: string | null | undefined, maxLen: number = 50): string {
  if (!text) {
    return '-';
  }

  if (text.length <= maxLen) {
    return text;
  }

  return text.substring(0, maxLen - 3) + '...';
}

/**
 * Get color class for PnL values
 */
export function getPnLColorClass(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }

  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return '';
}

/**
 * Format value as basis points of a total
 * Used for showing position size / PnL relative to total portfolio MV
 * Formula: (value / portfolioTotal) * 10000
 * @param value - Position value (MV or PnL)
 * @param portfolioTotal - Total portfolio MV for denominator
 * @param decimals - Decimal places (default: 1)
 * @returns Formatted string like "15.3 bps"
 */
export function formatBasisPoints(
  value: number | null | undefined,
  portfolioTotal: number,
  decimals: number = 1
): string {
  if (value === null || value === undefined || isNaN(value) || portfolioTotal === 0) {
    return '-';
  }

  const bps = (value / portfolioTotal) * 10000;
  return bps.toFixed(decimals) + ' bps';
}
