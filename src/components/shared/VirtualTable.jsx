import React, { useState, useCallback, useMemo } from 'react';
import * as ReactWindow from 'react-window';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';

// Robust FixedSizeList recovery
const FixedSizeList = ReactWindow.FixedSizeList || 
                     (ReactWindow.default && ReactWindow.default.FixedSizeList) ||
                     null;

const VirtualTable = ({ data, columns }) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  // Define Row component inside useMemo to preserve identity but avoid re-creation
  const Row = useMemo(() => ({ index, style }) => {
    const row = rows[index];
    if (!row) return null;
    
    return (
      <div 
        style={style} 
        className={`flex border-b border-gray-100 hover:bg-accent/5 transition-colors ${
          row.original.IsMRCoachingSubmitted === 'True' ? 'bg-accent/5 font-medium' : ''
        }`}
      >
        {row.getVisibleCells().map(cell => (
          <div 
            key={cell.id} 
            className="px-4 py-3 text-xs overflow-hidden text-ellipsis whitespace-nowrap border-r border-gray-100 last:border-r-0"
            style={{ width: cell.column.getSize() }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        ))}
      </div>
    );
  }, [rows]);

  if (!FixedSizeList) {
    return (
      <div className="p-12 text-center bg-red-50 border border-red-100 rounded-2xl">
        <p className="text-red-500 font-black uppercase tracking-widest text-xs">Table Engine Failure</p>
        <p className="text-gray-500 text-[10px] mt-2 font-bold uppercase">Contacting core systems... (react-window undefined)</p>
      </div>
    );
  }

  const totalWidth = table.getTotalSize();

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-soft">
      <div className="overflow-x-auto">
        <div style={{ width: totalWidth || '100%', minWidth: '100%' }}>
          {/* Header */}
          <div className="flex bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            {table.getHeaderGroups().map(headerGroup => (
              <React.Fragment key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <div 
                    key={header.id}
                    className="px-4 py-3 text-[10px] uppercase font-black tracking-widest text-gray-400 border-r border-gray-200 last:border-r-0"
                    style={{ width: header.getSize() }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>

          {/* Body */}
          <FixedSizeList
            height={600}
            itemCount={rows.length}
            itemSize={45}
            width={totalWidth || 800}
            className="scrollbar-hide"
          >
            {Row}
          </FixedSizeList>
        </div>
      </div>
    </div>
  );
};

export default VirtualTable;
