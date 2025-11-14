/**
 * Main application component
 */
import React, { useState, useEffect, useMemo } from 'react';
import { fetchAggTable, fetchRollup, refreshData, saveTrade } from './api/client';
import type { AggRow, RollupHeader } from './api/types';
import AggTable from './components/AggTable';
import RollupHeaderComponent from './components/RollupHeader';
import Toolbar from './components/Toolbar';
import TradeEntryForm, { TradeFormData } from './components/TradeEntryForm';
import ExpiryLadder from './components/ExpiryLadder';
import AssetTypePieChart from './components/AssetTypePieChart';

function App() {
  const [aggData, setAggData] = useState<AggRow[]>([]);
  const [rollup, setRollup] = useState<RollupHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedFamily, setSelectedFamily] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Basis points toggle state
  const [showBasisPoints, setShowBasisPoints] = useState(false);
  const [portfolioTotalMV, setPortfolioTotalMV] = useState(0);

  // Trade entry form state
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Partial<TradeFormData> | undefined>();

  // Extract unique families and strategies for filters
  const { families, strategies } = useMemo(() => {
    const familySet = new Set<string>();
    const strategySet = new Set<string>();

    aggData.forEach((row) => {
      if (row.hedge_family) familySet.add(row.hedge_family);
      if (row.strategy) strategySet.add(row.strategy);
    });

    return {
      families: Array.from(familySet).sort(),
      strategies: Array.from(strategySet).sort(),
    };
  }, [aggData]);

  // Filter data based on selections
  const filteredData = useMemo(() => {
    return aggData.filter((row) => {
      // Family filter
      if (selectedFamily && row.hedge_family !== selectedFamily) {
        return false;
      }

      // Strategy filter
      if (selectedStrategy && row.strategy !== selectedStrategy) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesDescription =
          row.investment_description?.toLowerCase().includes(query) || false;
        const matchesLabel =
          row.hedge_label?.toLowerCase().includes(query) || false;
        const matchesId =
          row.investment_id?.toLowerCase().includes(query) || false;

        if (!matchesDescription && !matchesLabel && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }, [aggData, selectedFamily, selectedStrategy, searchQuery]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch both rollup and table data in parallel
      const [rollupData, tableData] = await Promise.all([
        fetchRollup(),
        fetchAggTable(),
      ]);

      setRollup(rollupData.header);
      setAggData(tableData);
      setPortfolioTotalMV(rollupData.portfolio_total_mv);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load data'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await refreshData();
      await loadData();
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to refresh data'
      );
      setLoading(false);
    }
  };

  const handleSaveTrade = async (tradeData: TradeFormData) => {
    await saveTrade(tradeData);
    setShowTradeForm(false);
    setEditingTrade(undefined);
    await loadData(); // Reload to show new/updated trade
  };

  const handleAddTrade = () => {
    setEditingTrade(undefined);
    setShowTradeForm(true);
  };

  const handleEditTrade = (row: AggRow) => {
    setEditingTrade({
      investment_id: row.investment_id || undefined,
      bloomberg_id: row.id_bb_sec_num_des || undefined,
      pretty_name: row.pretty_name || row.investment_description || '',
      hedge_family: row.hedge_family || undefined,
      hedge_label: row.hedge_label || undefined,
      strategy: row.strategy || undefined,
      underlying_type: row.underlying_type || undefined,
      underlying_symbol: row.underlying_symbol || undefined,
      strike_1: row.strike_1 || undefined,
      strike_2: row.strike_2 || undefined,
      call_put: row.call_put || undefined,
      expiry: row.expiry || undefined,
      notional_usd: row.notional_usd || undefined,
      direction: row.direction || undefined,
      notes: row.notes || undefined,
    });
    setShowTradeForm(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Hedge Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Stage 1: Core Risk Metrics & Organization
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-full mx-auto px-6 py-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Rollup Header */}
        <RollupHeaderComponent
          rollup={rollup}
          loading={loading}
          showBasisPoints={showBasisPoints}
          portfolioTotalMV={portfolioTotalMV}
        />

        {/* Data Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ExpiryLadder positions={filteredData} />
          <AssetTypePieChart positions={filteredData} />
        </div>
        {/* Toolbar */}
        <Toolbar
          families={families}
          strategies={strategies}
          selectedFamily={selectedFamily}
          selectedStrategy={selectedStrategy}
          searchQuery={searchQuery}
          onFamilyChange={setSelectedFamily}
          onStrategyChange={setSelectedStrategy}
          onSearchChange={setSearchQuery}
          onRefresh={handleRefresh}
          onAddTrade={handleAddTrade}
          showBasisPoints={showBasisPoints}
          onToggleBasisPoints={() => setShowBasisPoints(!showBasisPoints)}
          loading={loading}
        />

        {/* Results Count */}
        {!loading && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredData.length} of {aggData.length} positions
          </div>
        )}

        {/* Aggregate Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <AggTable
            onEdit={handleEditTrade}
            data={filteredData}
            loading={loading}
            showBasisPoints={showBasisPoints}
            portfolioTotalMV={portfolioTotalMV}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-full mx-auto px-6 py-4 text-center text-sm text-gray-500">
          Hedge Analytics Dashboard v1.0.0 | Stage 1
        </div>
      </footer>

      {/* Trade Entry Form Modal */}
      {showTradeForm && (
        <TradeEntryForm
          initialData={editingTrade}
          onSave={handleSaveTrade}
          onCancel={() => {
            setShowTradeForm(false);
            setEditingTrade(undefined);
          }}
        />
      )}
    </div>
  );
}

export default App;
