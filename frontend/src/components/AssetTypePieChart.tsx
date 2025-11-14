import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AggRow } from '../api/types';
import { aggregateByAssetType, AssetTypeData } from '../lib/chartUtils';
import { formatCurrency } from '../lib/format';

interface AssetTypePieChartProps {
  positions: AggRow[];
}

const AssetTypePieChart: React.FC<AssetTypePieChartProps> = ({ positions }) => {
  const assetData = aggregateByAssetType(positions);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: AssetTypeData = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded shadow-lg p-3">
          <p className="font-semibold text-gray-900 mb-1">{data.assetType}</p>
          <p className="text-sm text-gray-700">
            Market Value: <span className="font-medium">{formatCurrency(data.marketValue)}</span>
          </p>
          <p className="text-sm text-gray-700">
            Percentage: <span className="font-medium">{data.percentage.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label for pie slices
  const renderLabel = (entry: AssetTypeData) => {
    // Only show label if percentage is significant enough
    if (entry.percentage >= 5) {
      return `${entry.percentage.toFixed(0)}%`;
    }
    return '';
  };

  // Calculate totals
  const totalMV = assetData.reduce((sum, item) => sum + item.marketValue, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Hedge Diversity (Premium/EL)</h2>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              Total: <span className="font-medium text-gray-900">{formatCurrency(totalMV)}</span>
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">Distribution by hedge asset type</p>
      </div>

      {assetData.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          No hedge positions
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={assetData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="marketValue"
                nameKey="assetType"
              >
                {assetData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend with detailed breakdown */}
          <div className="mt-6 space-y-2">
            {assetData.map((item) => (
              <div
                key={item.assetType}
                className="flex items-center justify-between text-sm border-b border-gray-100 pb-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-700 font-medium">{item.assetType}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">{formatCurrency(item.marketValue)}</span>
                  <span className="text-gray-500 font-medium w-12 text-right">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AssetTypePieChart;
