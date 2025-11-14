/**
 * Toolbar component with filters and search
 */
import React from 'react';

interface ToolbarProps {
  families: string[];
  strategies: string[];
  selectedFamily: string;
  selectedStrategy: string;
  searchQuery: string;
  onFamilyChange: (family: string) => void;
  onStrategyChange: (strategy: string) => void;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  onAddTrade: () => void;
  showBasisPoints?: boolean;
  onToggleBasisPoints?: () => void;
  loading?: boolean;
}

export default function Toolbar({
  families,
  strategies,
  selectedFamily,
  selectedStrategy,
  searchQuery,
  onFamilyChange,
  onStrategyChange,
  onSearchChange,
  onRefresh,
  onAddTrade,
  showBasisPoints = false,
  onToggleBasisPoints,
  loading = false,
}: ToolbarProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-end">
        {/* Family Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hedge Family
          </label>
          <select
            value={selectedFamily}
            onChange={(e) => onFamilyChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="">All Families</option>
            {families.map((family) => (
              <option key={family} value={family}>
                {family}
              </option>
            ))}
          </select>
        </div>

        {/* Strategy Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Strategy
          </label>
          <select
            value={selectedStrategy}
            onChange={(e) => onStrategyChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="">All Strategies</option>
            {strategies.map((strategy) => (
              <option key={strategy} value={strategy}>
                {strategy}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[250px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or description..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        {/* Basis Points Toggle */}
        {onToggleBasisPoints && (
          <div>
            <button
              onClick={onToggleBasisPoints}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {showBasisPoints ? '$ View' : 'bps View'}
            </button>
          </div>
        )}

        {/* Add Trade Button */}
        <div>
          <button
            onClick={onAddTrade}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            + Add Trade
          </button>
        </div>

        {/* Refresh Button */}
        <div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Clear Filters Button */}
        {(selectedFamily || selectedStrategy || searchQuery) && (
          <div>
            <button
              onClick={() => {
                onFamilyChange('');
                onStrategyChange('');
                onSearchChange('');
              }}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Active filters indicator */}
      {(selectedFamily || selectedStrategy || searchQuery) && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-sm text-gray-600">Active filters:</span>
          {selectedFamily && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
              Family: {selectedFamily}
              <button
                onClick={() => onFamilyChange('')}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          )}
          {selectedStrategy && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
              Strategy: {selectedStrategy}
              <button
                onClick={() => onStrategyChange('')}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          )}
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
              Search: "{searchQuery}"
              <button
                onClick={() => onSearchChange('')}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
