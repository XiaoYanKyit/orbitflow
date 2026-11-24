import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { paginateItems } from '../../utils/metrics';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  render: (row: T) => ReactNode;
  widthClass?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T) => string;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbarRight?: ReactNode;
  compact?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  getRowKey,
  searchPlaceholder = 'Search records...',
  searchFilter,
  pageSize = 6,
  onRowClick,
  emptyTitle = 'No matching records',
  emptyDescription = 'Try adjusting your search or filter criteria.',
  toolbarRight,
  compact = false,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const processed = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered =
      q && searchFilter ? data.filter((row) => searchFilter(row, q)) : data;

    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;

    const factor = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * factor;
      }
      return String(va).localeCompare(String(vb)) * factor;
    });
  }, [data, search, searchFilter, sortKey, sortDir, columns]);

  const paginated = useMemo(
    () => paginateItems(processed, page, pageSize),
    [processed, page, pageSize]
  );

  const handleSort = (key: string) => {
    setPage(1);
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
    }
  };

  return (
    <div className="space-y-4">
      {(searchFilter || toolbarRight) ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {searchFilter ? (
            <div className="relative flex-1 max-w-sm">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          ) : (
            <div />
          )}
          {toolbarRight ? <div className="flex items-center gap-2">{toolbarRight}</div> : null}
        </div>
      ) : null}

      <div className="overflow-x-auto border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-[#111827]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                    className={`px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    } ${col.widthClass ?? ''}`}
                  >
                    {col.sortable && col.sortValue ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className={`inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer ${
                          col.align === 'right' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <span>{col.header}</span>
                        {isSorted ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-45" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {paginated.items.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {emptyTitle}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {emptyDescription}
                  </p>
                </td>
              </tr>
            ) : (
              paginated.items.map((row) => (
                <tr
                  key={getRowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`transition-colors ${
                    onRowClick
                      ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer'
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 ${compact ? 'py-2.5' : 'py-3.5'} text-sm text-slate-800 dark:text-slate-200 ${
                        col.align === 'right' ? 'text-right tabular-nums' : 'text-left'
                      }`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {paginated.total > pageSize ? (
        <div className="flex items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="tabular-nums">
            Showing {(paginated.page - 1) * paginated.pageSize + 1}–
            {Math.min(paginated.page * paginated.pageSize, paginated.total)} of{' '}
            {paginated.total}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={paginated.page <= 1}
              aria-label="Previous table page"
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="px-2 tabular-nums font-mono text-slate-700 dark:text-slate-300">
              {paginated.page} / {paginated.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(paginated.totalPages, p + 1))}
              disabled={paginated.page >= paginated.totalPages}
              aria-label="Next table page"
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
