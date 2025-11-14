/**
 * Aggregate hedge table component using TanStack Table v8
 */
import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import type { AggRow } from '../api/types';
import {
  formatCurrency,
  formatDV01,
  getDV01ColorClass,
  getPnLColorClass,
  formatVol,
  formatDate,
  truncate,
  formatBasisPoints,
} from '../lib/format';

interface AggTableProps {
  data: AggRow[];
  loading?: boolean;
  showBasisPoints?: boolean;
  onEdit?: (row: AggRow) => void;
  portfolioTotalMV?: number;
}

const columnHelper = createColumnHelper<AggRow>();

export default function AggTable({
  data,
  loading = false,
  showBasisPoints = false,
  portfolioTotalMV = 0,
  onEdit,
}: AggTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  // Calculate spread aggregates
  const spreadAggregates = useMemo(() => {
    const aggregates: Record<string, {
      mv_total: number;
      pnl_1d_total: number;
      pnl_mtd_total: number;
      spread_name: string;
    }> = {};

    data.forEach(row => {
      if (row.spread_id && row.is_spread_leg) {
        if (!aggregates[row.spread_id]) {
          aggregates[row.spread_id] = {
            mv_total: 0,
            pnl_1d_total: 0,
            pnl_mtd_total: 0,
            spread_name: row.spread_name || 'Spread',
          };
        }
        aggregates[row.spread_id].mv_total += row.mv_ssc_usd || 0;
        aggregates[row.spread_id].pnl_1d_total += row.pnl_1d_usd || 0;
        aggregates[row.spread_id].pnl_mtd_total += row.pnl_mtd_usd || 0;
      }
    });

    return aggregates;
  }, [data]);

  // Define columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('hedge_family', {
        header: 'Hedge Family',
        cell: (info) => info.getValue() || '-',
        size: 180,
      }),
      columnHelper.accessor('strategy', {
        header: 'Strategy',
        cell: (info) => info.getValue() || '-',
        size: 150,
      }),
      columnHelper.accessor('investment_description', {
        header: 'Investment Description',
        cell: (info) => {
          const row = info.row.original;
          const value = info.getValue();
          const displayName = row.pretty_name || value;

          // Show spread name if this is a spread leg
          if (row.is_spread_leg && row.spread_name) {
            return (
              <div>
                <div className="text-xs text-gray-500 italic">{row.spread_name}</div>
                <div className="pl-3 text-gray-700">↳ {truncate(displayName, 50)}</div>
              </div>
            );
          }

          return truncate(displayName, 60);
        },
        size: 300,
      }),
      columnHelper.accessor('notional_usd', {
        header: 'Notional',
        cell: (info) => {
          const value = info.getValue();
          return value !== null && value !== undefined
            ? formatCurrency(value, 2)
            : '-';
        },
        meta: { align: 'right' },
        size: 100,
      }),
      columnHelper.accessor('mv_ssc_usd', {
        header: 'Net MV',
        cell: (info) => {
          const row = info.row.original;
          const value = info.getValue();

          // Show individual leg MV + aggregate for spreads
          if (row.is_spread_leg && row.spread_id) {
            const agg = spreadAggregates[row.spread_id];
            const individualMV = showBasisPoints && portfolioTotalMV > 0
              ? formatBasisPoints(value, portfolioTotalMV)
              : formatCurrency(value);
            const aggMV = showBasisPoints && portfolioTotalMV > 0
              ? formatBasisPoints(agg.mv_total, portfolioTotalMV)
              : formatCurrency(agg.mv_total);

            return (
              <div>
                <div className="text-xs text-gray-500">{individualMV}</div>
                <div className="font-bold">{aggMV}</div>
              </div>
            );
          }

          if (showBasisPoints && portfolioTotalMV > 0) {
            return formatBasisPoints(value, portfolioTotalMV);
          }
          return formatCurrency(value);
        },
        meta: { align: 'right' },
        size: 120,
      }),
      columnHelper.accessor('pnl_1d_usd', {
        header: 'Daily PnL',
        cell: (info) => {
          const value = info.getValue();
          return (
            <span className={getPnLColorClass(value)}>
              {formatCurrency(value)}
            </span>
          );
        },
        meta: { align: 'right' },
        size: 120,
      }),
      columnHelper.accessor('pnl_mtd_usd', {
        header: 'MTD PnL',
        cell: (info) => {
          const row = info.row.original;
          const value = info.getValue();

          // Show individual leg PnL + aggregate for spreads
          if (row.is_spread_leg && row.spread_id) {
            const agg = spreadAggregates[row.spread_id];
            const individualPnL = showBasisPoints && portfolioTotalMV > 0
              ? formatBasisPoints(value, portfolioTotalMV)
              : formatCurrency(value);
            const aggPnL = showBasisPoints && portfolioTotalMV > 0
              ? formatBasisPoints(agg.pnl_mtd_total, portfolioTotalMV)
              : formatCurrency(agg.pnl_mtd_total);

            return (
              <div>
                <div className={`text-xs ${getPnLColorClass(value)}`}>{individualPnL}</div>
                <div className={`font-bold ${getPnLColorClass(agg.pnl_mtd_total)}`}>{aggPnL}</div>
              </div>
            );
          }

          const formatted = showBasisPoints && portfolioTotalMV > 0
            ? formatBasisPoints(value, portfolioTotalMV)
            : formatCurrency(value);
          return (
            <span className={getPnLColorClass(value)}>
              {formatted}
            </span>
          );
        },
        meta: { align: 'right' },
        size: 120,
      }),
      columnHelper.accessor('dv01_usd', {
        header: 'DV01',
        cell: (info) => {
          const value = info.getValue();
          return (
            <span className={getDV01ColorClass(value)}>
              {formatDV01(value)}
            </span>
          );
        },
        meta: { align: 'right' },
        size: 120,
      }),
      columnHelper.accessor('cs01_usd', {
        header: 'CS01',
        cell: (info) => {
          const value = info.getValue();
          return (
            <span className={getDV01ColorClass(value)}>
              {formatDV01(value)}
            </span>
          );
        },
        meta: { align: 'right' },
        size: 120,
      }),
      columnHelper.accessor('vol_90d', {
        header: 'Vol',
        cell: (info) => formatVol(info.getValue()),
        meta: { align: 'right' },
        size: 80,
      }),
      columnHelper.accessor('vega_spx', {
        header: 'Vega',
        cell: (info) => formatCurrency(info.getValue(), 0),
        meta: { align: 'right' },
        size: 100,
      }),
      columnHelper.accessor('maturity', {
        header: 'Maturity',
        cell: (info) => formatDate(info.getValue()),
        size: 120,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <button
            onClick={() => onEdit?.(info.row.original)}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            Edit
          </button>
        ),
        size: 80,
      }),
    ],
    [showBasisPoints, portfolioTotalMV, onEdit]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${
                    (header.column.columnDef.meta as any)?.align === 'right'
                      ? 'text-right'
                      : ''
                  }`}
                  onClick={header.column.getToggleSortingHandler()}
                  style={{ width: header.getSize() }}
                >
                  <div className="flex items-center gap-2">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {{
                      asc: ' ↑',
                      desc: ' ↓',
                    }[header.column.getIsSorted() as string] ?? null}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => {
            const isSpreadLeg = row.original.is_spread_leg;
            return (
              <tr
                key={row.id}
                className={`hover:bg-gray-50 ${
                  isSpreadLeg ? 'bg-blue-50 border-l-4 border-blue-400' : ''
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`px-4 py-3 text-sm text-gray-900 ${
                      (cell.column.columnDef.meta as any)?.align === 'right'
                        ? 'text-right'
                        : ''
                    }`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {table.getRowModel().rows.length === 0 && (
        <div className="text-center py-12 text-gray-500">No positions found</div>
      )}
    </div>
  );
}
