/**
 * Rollup header component showing totals and MV by family
 */
import React from 'react';
import type { RollupHeader as RollupHeaderType } from '../api/types';
import {
  formatCurrency,
  formatDV01,
  getDV01ColorClass,
  getPnLColorClass,
  formatBasisPoints,
} from '../lib/format';

interface RollupHeaderProps {
  rollup: RollupHeaderType | null;
  loading?: boolean;
  showBasisPoints?: boolean;
  portfolioTotalMV?: number;
}

export default function RollupHeader({
  rollup,
  loading = false,
  showBasisPoints = false,
  portfolioTotalMV = 0,
}: RollupHeaderProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="text-gray-500">Loading rollup data...</div>
      </div>
    );
  }

  if (!rollup) {
    return null;
  }

  const { totals, by_family } = rollup;

  // Calculate max absolute MV for bar scaling
  const maxAbsMV = Math.max(
    ...by_family.map((f) => Math.abs(f.mv_ssc_usd)),
    1
  );

  // Calculate total MV for percentage display
  const totalMV = by_family.reduce((sum, f) => sum + Math.abs(f.mv_ssc_usd), 0);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Portfolio Summary</h2>

      {/* Overall Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total MV (Hedge Book)"
          value={
            showBasisPoints && portfolioTotalMV > 0
              ? formatBasisPoints(totals.total_mv_ssc_usd, portfolioTotalMV)
              : formatCurrency(totals.total_mv_ssc_usd)
          }
          subValue={`${totals.row_count} positions`}
        />
        <MetricCard
          label="Total MV (All CPAM)"
          value={formatCurrency(portfolioTotalMV)}
          subValue="Full portfolio"
        />
        <MetricCard
          label="Daily PnL"
          value={formatCurrency(totals.total_pnl_1d_usd)}
          valueClassName={getPnLColorClass(totals.total_pnl_1d_usd)}
        />
        <MetricCard
          label="MTD PnL"
          value={
            showBasisPoints && portfolioTotalMV > 0
              ? formatBasisPoints(totals.total_pnl_mtd_usd, portfolioTotalMV)
              : formatCurrency(totals.total_pnl_mtd_usd)
          }
          valueClassName={getPnLColorClass(totals.total_pnl_mtd_usd)}
        />
      </div>

      {/* MV by Hedge Family */}
      {by_family.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            MV by Hedge Family
          </h3>
          <div className="space-y-3">
            {by_family.map((family, idx) => {
              const barWidth = Math.abs(family.mv_ssc_usd) / maxAbsMV * 100;
              const percentage = totalMV > 0 ? (Math.abs(family.mv_ssc_usd) / totalMV * 100).toFixed(1) : '0.0';

              return (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-48 text-sm text-gray-700 truncate">
                    {family.hedge_family}
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all bg-green-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="w-32 text-sm font-medium text-right text-gray-900">
                      {showBasisPoints && portfolioTotalMV > 0
                        ? formatBasisPoints(family.mv_ssc_usd, portfolioTotalMV)
                        : formatCurrency(family.mv_ssc_usd)}
                    </div>
                  </div>
                  <div className="w-24 text-xs text-gray-500 text-right">
                    {percentage}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  valueClassName?: string;
  subValue?: string;
}

function MetricCard({ label, value, valueClassName = '', subValue }: MetricCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className={`text-2xl font-semibold ${valueClassName}`}>
        {value}
      </div>
      {subValue && (
        <div className="text-xs text-gray-500 mt-1">{subValue}</div>
      )}
    </div>
  );
}
