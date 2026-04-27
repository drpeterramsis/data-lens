import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const DataTable = ({ data }) => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);

  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).map((key) => ({
      header: key,
      accessorKey: key,
      cell: (info) => info.getValue(),
    }));
  }, [data]);

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
      sorting,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border overflow-hidden bg-surface shadow-sm">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search across all columns..."
              className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-white text-sm focus:outline-none focus:border-accent transition-all"
            />
          </div>
          <div className="text-[12px] text-muted font-medium">
             Showing {table.getRowModel().rows.length} of {data.length} entries
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] whitespace-nowrap">
            <thead className="bg-[#1F1F1F] border-b border-border">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-5 py-3 font-bold text-muted uppercase tracking-wider text-[11px] cursor-pointer select-none border-r last:border-r-0 border-border transition-colors hover:bg-white/[0.02]"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-2">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="text-muted/40">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ArrowUp size={12} className="text-accent" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ArrowDown size={12} className="text-accent" />
                          ) : (
                            <ArrowUpDown size={12} className="opacity-30" />
                          )}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr 
                  key={row.id} 
                  className="border-b border-border last:border-0 hover:bg-accent/[0.03] transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-3 text-white border-r last:border-r-0 border-border">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-center p-4 gap-2 border-t border-border bg-white/[0.01]">
          <button
            className="px-4 py-1.5 rounded-lg bg-transparent border border-border text-xs font-semibold text-white disabled:opacity-30 hover:bg-border transition-all"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </button>
          
          <span className="text-[12px] text-muted px-4 font-medium">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>

          <button
            className="px-4 py-1.5 rounded-lg bg-transparent border border-border text-xs font-semibold text-white disabled:opacity-30 hover:bg-border transition-all"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
