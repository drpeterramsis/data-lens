import React, { useState, useCallback, useMemo } from 'react';
import { List } from 'react-window';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';

const VirtualTable = ({ data = [], columns = [] }) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  // Define Row component according to react-window v2.2.7 API
  const RowComponent = useCallback(({ index, style }) => {
    const row = rows[index];
    if (!row) return null;
    
    return (
      <div 
        style={style} 
        className={`flex border-b border-gray-100 hover:bg-accent/5 transition-colors ${
          row.original.IsMRCoachingSubmitted?.toUpperCase() === 'TRUE' ? 'bg-yellow-50 font-medium' : ''
        }`}
      >
        {row.getVisibleCells().map(cell => (
          <div 
            key={cell.id} 
            className="px-4 py-3 text-xs overflow-hidden text-ellipsis whitespace-nowrap border-r border-gray-100 last:border-r-0 flex items-center"
            style={{ width: cell.column.getSize() }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        ))}
      </div>
    );
  }, [rows]);

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
          <List
            height={600}
            rowCount={rows.length}
            rowHeight={45}
            width={totalWidth || 800}
            rowComponent={RowComponent}
            rowProps={{}}
            className="scrollbar-hide"
          />
        </div>
      </div>
    </div>
  );
};

export default VirtualTable;
