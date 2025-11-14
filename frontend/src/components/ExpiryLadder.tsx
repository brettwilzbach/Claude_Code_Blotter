import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { AggRow } from '../api/types';
import { aggregateByExpiryBucket, ExpiryBucketData } from '../lib/chartUtils';
import { formatCurrency } from '../lib/format';

interface ExpiryLadderProps {
  positions: AggRow[];
}

const COLORS = {
  '0-3M': '#0d9488',   // Dark teal - most urgent
  '3-6M': '#14b8a6',   // Teal
  '6-12M': '#2dd4bf',  // Light teal
  '12M+': '#5eead4',   // Very light teal - least urgent
};

const ExpiryLadder: React.FC<ExpiryLadderProps> = ({ positions }) => {
  const bucketData = aggregateByExpiryBucket(positions);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: ExpiryBucketData = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded shadow-lg p-3">
          <p className="font-semibold text-gray-900 mb-1">{data.bucket}</p>
          <p className="text-sm text-gray-700">
            Market Value: <span className="font-medium">{formatCurrency(data.marketValue)}</span>
          </p>
          <p className="text-sm text-gray-700">
            Positions: <span className="font-medium">{data.count}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Avg per position: {formatCurrency(data.count > 0 ? data.marketValue / data.count : 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate totals for header
  const totalMV = bucketData.reduce((sum, bucket) => sum + bucket.marketValue, 0);
  const totalCount = bucketData.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Expiry Ladder</h2>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              Total: <span className="font-medium text-gray-900">{formatCurrency(totalMV)}</span>
            </p>
            <p className="text-xs text-gray-500">{totalCount} positions</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">Hedge structures grouped by time to expiry</p>
      </div>

      {totalCount === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          No trades with expiry
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={bucketData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="bucket"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#d1d5db' }}
              tickFormatter={(value) => {
                // Format Y-axis as abbreviated currency
                if (Math.abs(value) >= 1e6) {
                  return `$${(value / 1e6).toFixed(1)}M`;
                } else if (Math.abs(value) >= 1e3) {
                  return `$${(value / 1e3).toFixed(0)}K`;
                }
                return `$${value}`;
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              formatter={(value) => `Market Value (${value})`}
            />
            <Bar dataKey="marketValue" name="MV" radius={[4, 4, 0, 0]}>
              {bucketData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.bucket]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Legend with counts */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center">
        {bucketData.map((bucket) => (
          <div key={bucket.bucket} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COLORS[bucket.bucket] }}
            />
            <span className="text-gray-700">
              {bucket.bucket}: <span className="font-medium">{bucket.count}</span>
              {bucket.count === 1 ? ' position' : ' positions'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExpiryLadder;
