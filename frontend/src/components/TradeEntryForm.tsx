/**
 * Trade Entry Form - Add or edit manual trade entries
 * Allows enriching positions with pretty names and additional details
 */
import React, { useState } from 'react';

export interface TradeFormData {
  investment_id?: string;
  bloomberg_id?: string;
  pretty_name: string;
  hedge_family?: string;
  hedge_label?: string;
  strategy?: string;
  underlying_type?: string;
  underlying_symbol?: string;
  strike_1?: number;
  strike_2?: number;
  call_put?: string;
  expiry?: string;
  notional_usd?: number;
  direction?: string;
  spread_id?: string;
  spread_name?: string;
  dv01_override?: number;
  price_override?: number;
  notes?: string;
}

interface TradeEntryFormProps {
  initialData?: Partial<TradeFormData>;
  onSave: (data: TradeFormData) => Promise<void>;
  onCancel: () => void;
}

export default function TradeEntryForm({
  initialData,
  onSave,
  onCancel,
}: TradeEntryFormProps) {
  const [formData, setFormData] = useState<TradeFormData>({
    pretty_name: '',
    ...initialData,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof TradeFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.pretty_name) {
      setError('Pretty Name is required');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save trade');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {initialData ? 'Edit Trade Details' : 'Add Manual Trade Entry'}
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Section 1: Identifiers */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">
                Identifiers (for linking)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SS&C Investment ID
                  </label>
                  <input
                    type="text"
                    value={formData.investment_id || ''}
                    onChange={(e) => handleChange('investment_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., 12345"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Links to SS&C position
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bloomberg ID
                  </label>
                  <input
                    type="text"
                    value={formData.bloomberg_id || ''}
                    onChange={(e) => handleChange('bloomberg_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., BBG000BLNNH6"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Links to MARS/Bloomberg data
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Display */}
            <div className="mb-6 border-t pt-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">
                Display & Classification
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pretty Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.pretty_name}
                    onChange={(e) => handleChange('pretty_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., SPX/Gold Dual Digital 4800/2000"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Human-readable trade name (replaces cryptic SS&C description)
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hedge Family
                    </label>
                    <select
                      value={formData.hedge_family || ''}
                      onChange={(e) => handleChange('hedge_family', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select...</option>
                      <option value="Vanilla Risk-Off Hedges">
                        Vanilla Risk-Off Hedges
                      </option>
                      <option value="Hybrid Hedges">Hybrid Hedges</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hedge Label
                    </label>
                    <input
                      type="text"
                      value={formData.hedge_label || ''}
                      onChange={(e) => handleChange('hedge_label', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., SPX/XAU Digital"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Strategy
                    </label>
                    <input
                      type="text"
                      value={formData.strategy || ''}
                      onChange={(e) => handleChange('strategy', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Dual Digital"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Trade Details */}
            <div className="mb-6 border-t pt-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">
                Trade Details (missing from other systems)
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Underlying Type
                    </label>
                    <select
                      value={formData.underlying_type || ''}
                      onChange={(e) => handleChange('underlying_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select...</option>
                      <option value="Equity Index">Equity Index</option>
                      <option value="Credit">Credit</option>
                      <option value="Rates">Rates</option>
                      <option value="FX">FX</option>
                      <option value="Commodity">Commodity</option>
                      <option value="Multi-Asset">Multi-Asset</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Underlying Symbol(s)
                    </label>
                    <input
                      type="text"
                      value={formData.underlying_symbol || ''}
                      onChange={(e) => handleChange('underlying_symbol', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., SPX, XAU (comma-separated)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Strike 1
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.strike_1 || ''}
                      onChange={(e) =>
                        handleChange('strike_1', e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="4800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Strike 2
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.strike_2 || ''}
                      onChange={(e) =>
                        handleChange('strike_2', e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="2000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Call/Put
                    </label>
                    <select
                      value={formData.call_put || ''}
                      onChange={(e) => handleChange('call_put', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select...</option>
                      <option value="Call">Call</option>
                      <option value="Put">Put</option>
                      <option value="Spread">Spread</option>
                      <option value="Digital">Digital</option>
                      <option value="Structure">Structure</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry
                    </label>
                    <input
                      type="date"
                      value={formData.expiry || ''}
                      onChange={(e) => handleChange('expiry', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notional USD
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={formData.notional_usd || ''}
                      onChange={(e) =>
                        handleChange('notional_usd', e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="3000000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Direction
                    </label>
                    <select
                      value={formData.direction || ''}
                      onChange={(e) => handleChange('direction', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select...</option>
                      <option value="Long">Long</option>
                      <option value="Short">Short</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Spread/Package Linking (Optional) */}
            <details className="mb-6 border-t pt-4">
              <summary className="text-lg font-semibold mb-3 text-gray-700 cursor-pointer">
                Spread/Package Linking (Optional)
              </summary>
              <div className="space-y-4 mt-3">
                <p className="text-sm text-gray-600 mb-4">
                  Link two legs into a spread or option package. Both legs should have the same Spread ID and Spread Name.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Spread ID
                    </label>
                    <input
                      type="text"
                      value={formData.spread_id || ''}
                      onChange={(e) => handleChange('spread_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., SPREAD_001"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Unique ID to link the two legs together
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Spread Name
                    </label>
                    <input
                      type="text"
                      value={formData.spread_name || ''}
                      onChange={(e) => handleChange('spread_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., 5yr/20yr Payer Spread"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Human-readable name for the spread
                    </p>
                  </div>
                </div>
              </div>
            </details>

            {/* Section 5: Overrides (Optional) */}
            <details className="mb-6 border-t pt-4">
              <summary className="text-lg font-semibold mb-3 text-gray-700 cursor-pointer">
                Overrides (Optional)
              </summary>
              <div className="space-y-4 mt-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      DV01 Override
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={formData.dv01_override || ''}
                      onChange={(e) =>
                        handleChange('dv01_override', e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="-45000"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Only if MARS DV01 is wrong
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price Override
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price_override || ''}
                      onChange={(e) =>
                        handleChange('price_override', e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="105.50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Additional notes or comments..."
                  />
                </div>
              </div>
            </details>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Trade'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
